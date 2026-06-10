<?php

namespace App\Services;

use Midtrans\Config;
use Midtrans\Snap;
use Midtrans\Transaction;
use App\Models\Invoice;
use App\Models\Customer;

class MidtransService
{
    public function __construct()
    {
        Config::$serverKey = config('services.midtrans.server_key');
        Config::$clientKey = config('services.midtrans.client_key');
        Config::$isProduction = config('services.midtrans.is_production', false);
        Config::$isSanitized = true;
        Config::$is3ds = true;
    }

    /**
     * Create a Snap payment for an invoice
     */
    public function createSnapToken(Invoice $invoice, Customer $customer)
    {
        try {
            $transactionDetails = [
                'order_id' => 'INV-' . $invoice->id . '-' . time(),
                'gross_amount' => $invoice->amount,
            ];

            $customerDetails = [
                'first_name' => $customer->name,
                'email' => $customer->email ?? 'noemail@example.com',
                'phone' => $customer->phone_number,
            ];

            $itemDetails = [
                [
                    'id' => 'PKG-' . $customer->package_id,
                    'price' => $invoice->amount,
                    'quantity' => 1,
                    'name' => $customer->package->name . ' - ' . $invoice->month . '/' . $invoice->year,
                ]
            ];

            $payload = [
                'transaction_details' => $transactionDetails,
                'customer_details' => $customerDetails,
                'item_details' => $itemDetails,
            ];

            $snapToken = Snap::getSnapToken($payload);

            // Store the transaction ID
            $invoice->update([
                'midtrans_transaction_id' => $transactionDetails['order_id'],
            ]);

            return $snapToken;
        } catch (\Exception $e) {
            \Log::error('Midtrans Snap Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get transaction status from Midtrans
     */
    public function getTransactionStatus($transactionId)
    {
        try {
            return Transaction::status($transactionId);
        } catch (\Exception $e) {
            \Log::error('Midtrans Status Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle payment notification callback from Midtrans
     */
    public function handleNotification($notificationBody)
    {
        try {
            $notification = json_decode($notificationBody);

            $transactionStatus = $notification->transaction_status;
            $fraudStatus = $notification->fraud_status ?? null;
            $orderId = $notification->order_id;

            // Find the invoice by transaction ID
            $invoice = Invoice::where('midtrans_transaction_id', $orderId)->first();

            if (!$invoice) {
                \Log::warning('Invoice not found for transaction ID: ' . $orderId);
                return false;
            }

            // Handle transaction status
            if ($transactionStatus == 'capture') {
                if ($fraudStatus == 'challenge') {
                    // Mark as pending challenge
                    $invoice->update(['status' => 'pending']);
                } elseif ($fraudStatus == 'accept') {
                    // Mark as paid
                    $invoice->markAsPaid('transfer', $orderId);
                }
            } elseif ($transactionStatus == 'settlement') {
                // Mark as paid
                $invoice->markAsPaid('transfer', $orderId);
            } elseif ($transactionStatus == 'pending') {
                $invoice->update(['status' => 'pending']);
            } elseif ($transactionStatus == 'deny') {
                $invoice->update(['status' => 'pending']);
            } elseif ($transactionStatus == 'expire') {
                $invoice->update(['status' => 'canceled']);
            } elseif ($transactionStatus == 'cancel') {
                $invoice->update(['status' => 'canceled']);
            }

            return true;
        } catch (\Exception $e) {
            \Log::error('Midtrans Notification Error: ' . $e->getMessage());
            return false;
        }
    }
}
