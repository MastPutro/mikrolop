<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use RouterOS\Config;
use RouterOS\Client;
use RouterOS\Query;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\BillingPolicy;
use App\Services\MidtransService;
use App\Services\FonnteService;
use Carbon\Carbon;
use Midtrans\Snap;

class KeuanganController extends Controller
{
    protected $midtransService;
    protected $fonnteService;

    public function __construct(MidtransService $midtransService, FonnteService $fonnteService)
    {
        $this->midtransService = $midtransService;
        $this->fonnteService = $fonnteService;
    }

    /**
     * Display the billing management page
     */
    public function index()
    {
        return Inertia::render('ManajemenKeuangan/Index', [
            'currentMonth' => now()->month,
            'currentYear' => now()->year,
        ]);
    }

    /**
     * Get billing data for current month
     */
    public function getBillingData()
    {
        try {
            $currentMonth = now()->month;
            $currentYear = now()->year;

            $billingPolicy = BillingPolicy::getCurrent();

            // Get all customers with their current month invoices
            $invoices = Invoice::whereHas('customer')
                ->where('month', $currentMonth)
                ->where('year', $currentYear)
                ->with('customer.package')
                ->get();

            $customers = Customer::where('used', 'yes')
                ->with('package')
                ->get()
                ->map(function ($customer) use ($currentMonth, $currentYear) {
                    $invoice = $customer->invoices()
                        ->where('month', $currentMonth)
                        ->where('year', $currentYear)
                        ->first();

                    return [
                        'id' => $customer->id,
                        'name' => $customer->name,
                        'phone_number' => $customer->phone_number,
                        'package_name' => $customer->package?->name,
                        'package_price' => $customer->package?->price,
                        'invoice' => $invoice ? [
                            'id' => $invoice->id,
                            'amount' => $invoice->amount,
                            'status' => $invoice->status,
                            'payment_method' => $invoice->payment_method,
                            'due_date' => $invoice->due_date,
                            'paid_date' => $invoice->paid_date,
                            'is_overdue' => $invoice->isOverdue(),
                        ] : null,
                    ];
                });

            // Calculate summary statistics
            $stats = [
                'total_customers' => $customers->count(),
                'pending_payment' => $customers->filter(fn($c) => !$c['invoice'] || $c['invoice']['status'] === 'pending')->count(),
                'paid' => $customers->filter(fn($c) => $c['invoice'] && $c['invoice']['status'] === 'paid')->count(),
                'overdue' => $customers->filter(fn($c) => $c['invoice'] && $c['invoice']['is_overdue'])->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'customers' => $customers,
                    'billing_policy' => [
                        'due_date' => $billingPolicy->due_date,
                        'send_bill_to_whatsapp' => $billingPolicy->send_bill_to_whatsapp,
                    ],
                    'stats' => $stats,
                    'current_month' => $currentMonth,
                    'current_year' => $currentYear,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update billing policy (due date and WhatsApp notification preference)
     */
    public function updateBillingPolicy(Request $request)
    {
        try {
            $validated = $request->validate([
                'due_date' => 'required|integer|between:1,31',
                'send_bill_to_whatsapp' => 'required|boolean',
            ]);

            $policy = BillingPolicy::latest()->first() ?? new BillingPolicy();
            $policy->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Kebijakan tagihan berhasil diperbarui',
                'data' => $policy,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create invoices for current month and set up Midtrans billing
     */
    public function createMonthlyBilling()
    {
        try {
            $currentMonth = now()->month;
            $currentYear = now()->year;
            $billingPolicy = BillingPolicy::getCurrent();

            // Get all active customers
            $customers = Customer::where('used', 'yes')->get();

            $invoicesCreated = 0;

            foreach ($customers as $customer) {
                // Check if invoice already exists for this customer this month
                $existingInvoice = Invoice::where('customer_id', $customer->id)
                    ->where('month', $currentMonth)
                    ->where('year', $currentYear)
                    ->first();

                if ($existingInvoice && $existingInvoice->status === 'paid') {
                    continue; // Skip if already paid
                }

                // Create or update invoice
                $invoice = Invoice::updateOrCreate(
                    [
                        'customer_id' => $customer->id,
                        'month' => $currentMonth,
                        'year' => $currentYear,
                    ],
                    [
                        'amount' => $customer->package?->price ?? 0,
                        'status' => 'pending',
                        'due_date' => Carbon::create($currentYear, $currentMonth, $billingPolicy->due_date)->endOfDay(),
                    ]
                );

                // Create isolir schedule
                if ($invoice->due_date) {
                    $this->isolirSchedule(
                        $customer->id,
                        $invoice->due_date->day,
                        $invoice->due_date->month,
                        $invoice->due_date->year
                    );
                }

                $invoicesCreated++;
            }

            return response()->json([
                'success' => true,
                'message' => 'Tagihan bulan ini berhasil dibuat',
                'data' => [
                    'invoices_created' => $invoicesCreated,
                    'total_customers' => $customers->count(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create Snap payment token for an invoice
     */
    public function createPaymentToken($invoiceId)
    {
        try {
            $invoice = Invoice::with('customer')->findOrFail($invoiceId);

            // Check if already paid
            if ($invoice->status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice sudah dibayar',
                ], 400);
            }

            $snapToken = $this->midtransService->createSnapToken($invoice, $invoice->customer);

            return response()->json([
                'success' => true,
                'data' => [
                    'snap_token' => $snapToken,
                    'invoice_id' => $invoice->id,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Record cash payment for an invoice
     */
    public function recordCashPayment(Request $request, $invoiceId)
    {
        try {
            $validated = $request->validate([
                'proof_of_payment' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
            ]);

            $invoice = Invoice::with('customer')->findOrFail($invoiceId);

            // Check if already paid
            if ($invoice->status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice sudah dibayar',
                ], 400);
            }

            $proofPath = null;
            if ($request->hasFile('proof_of_payment')) {
                $proofPath = $request->file('proof_of_payment')->store('payments/cash', 'public');
            }

            // Create payment record
            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'customer_id' => $invoice->customer_id,
                'amount' => $invoice->amount,
                'method' => 'cash',
                'proof_of_payment' => $proofPath,
                'status' => 'success',
            ]);

            // Mark invoice as paid
            $invoice->markAsPaid('cash');

            // Remove isolir schedule if exists
            if (!$invoice->isOverdue()) {
                $this->removeSchedule($invoice->customer_id);
            } else {
                // If overdue, remove both schedule and isolir
                $this->removeSchedule($invoice->customer_id);
                $this->removeIsolir($invoice->customer_id);
            }

            return response()->json([
                'success' => true,
                'message' => 'Pembayaran tunai berhasil dicatat',
                'data' => $payment,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle Midtrans payment notification (webhook from Midtrans)
     * This endpoint must be registered in Midtrans dashboard as:
     * POST: https://yourdomain.com/api/keuangan/payment-notification
     */
    public function handlePaymentNotification(Request $request)
    {
        try {
            $notificationBody = $request->getContent();
            $notification = json_decode($notificationBody);
            
            \Log::info('Midtrans Notification received: ' . $notificationBody);
            
            $this->midtransService->handleNotification($notificationBody);

            // After payment is confirmed, remove isolir schedule
            $orderId = $notification->order_id ?? null;
            
            if ($orderId) {
                $invoice = Invoice::where('midtrans_transaction_id', $orderId)->first();

                if ($invoice) {
                    \Log::info('Processing invoice: ' . $invoice->id . ' with status: ' . $invoice->status);
                    
                    // Remove isolir schedule after payment
                    if ($invoice->status === 'paid') {
                        try {
                            $this->removeSchedule($invoice->customer_id);
                        } catch (\Exception $e) {
                            \Log::warning('Could not remove schedule: ' . $e->getMessage());
                        }
                        
                        // If was overdue, also remove from isolir list
                        if ($invoice->isOverdue()) {
                            try {
                                $this->removeIsolir($invoice->customer_id);
                            } catch (\Exception $e) {
                                \Log::warning('Could not remove isolir: ' . $e->getMessage());
                            }
                        }
                        try {
                            $customer = Customer::find($invoice->customer_id);
                            if ($customer) {
                                $customer->update([
                                    'is_isolated' => 'no',
                                ]);
                            }
                        } catch (\Exception $e) {
                            \Log::warning('Could not update customer isolation status: ' . $e->getMessage());
                        }
                        try{
                            $this->markInvoiceAsPaid($invoice, $invoice->payment_method, $invoice->midtrans_transaction_id);
                        } catch (\Exception $e) {
                            \Log::warning('Could not mark invoice as paid: ' . $e->getMessage());
                        }
                    }
                }
            }

            // Return 200 OK so Midtrans knows webhook was received
            return response()->json(['success' => true], 200);
        } catch (\Exception $e) {
            \Log::error('Payment notification error: ' . $e->getMessage());
            // Return 200 anyway so Midtrans doesn't retry
            return response()->json(['success' => false, 'message' => $e->getMessage()], 200);
        }
    }

    /**
     * Store data to Payments table and mark invoice as paid
     */
    public function markInvoiceAsPaid(Invoice $invoice, $paymentMethod, $transactionId = null)
    {
        // Create payment record
        Payment::create([
            'invoice_id' => $invoice->id,
            'customer_id' => $invoice->customer_id,
            'amount' => $invoice->amount,
            'method' => $paymentMethod,
            'status' => 'success',
        ]);

        // Mark invoice as paid
        $invoice->markAsPaid($paymentMethod, $transactionId);
    }

    /**
     * Verify payment status from Midtrans (synchronous check)
     * Call this from frontend after Snap payment closes
     */
    public function verifyPaymentStatus($invoiceId)
    {
        try {
            $invoice = Invoice::with('customer')->findOrFail($invoiceId);
            
            // If already paid, return immediately
            if ($invoice->status === 'paid') {
                return response()->json([
                    'success' => true,
                    'status' => 'paid',
                    'message' => 'Invoice sudah dibayar',
                    'data' => [
                        'invoice_id' => $invoice->id,
                        'status' => $invoice->status,
                        'payment_method' => $invoice->payment_method,
                        'paid_date' => $invoice->paid_date,
                    ]
                ]);
            }
            
            // If transaction ID exists, check status from Midtrans
            if ($invoice->midtrans_transaction_id) {
                try {
                    $transactionStatus = $this->midtransService->getTransactionStatus(
                        $invoice->midtrans_transaction_id
                    );
                    
                    // Update invoice status based on Midtrans response
                    if (in_array($transactionStatus->transaction_status, ['settlement', 'capture'])) {
                        if (!($transactionStatus->fraud_status == 'challenge')) {
                            $invoice->markAsPaid('transfer', $invoice->midtrans_transaction_id);
                        }
                    }
                } catch (\Exception $e) {
                    \Log::warning('Could not verify with Midtrans: ' . $e->getMessage());
                }
            }
            
            return response()->json([
                'success' => true,
                'status' => $invoice->status,
                'data' => [
                    'invoice_id' => $invoice->id,
                    'status' => $invoice->status,
                    'payment_method' => $invoice->payment_method,
                    'paid_date' => $invoice->paid_date,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get public invoice data (no authentication required)
     */
    public function getPublicInvoice($invoiceId)
    {
        try {
            $invoice = Invoice::with('customer.package')->findOrFail($invoiceId);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $invoice->id,
                    'customer_name' => $invoice->customer->name,
                    'customer_phone' => $invoice->customer->phone_number,
                    'package_name' => $invoice->customer->package?->name,
                    'amount' => $invoice->amount,
                    'month' => $invoice->month,
                    'year' => $invoice->year,
                    'status' => $invoice->status,
                    'payment_method' => $invoice->payment_method,
                    'due_date' => $invoice->due_date,
                    'paid_date' => $invoice->paid_date,
                    'is_paid' => $invoice->status === 'paid',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice tidak ditemukan',
            ], 404);
        }
    }

    /**
     * Generate Payment Link For Public (without authentication) - can be used for WhatsApp billing link
     * This returns a view with embedded payment functionality
     */
    public function generatePublicPaymentPage($invoiceId)
    {   
        try {
            // Render public payment page
            return Inertia::render('PublicPayment', [
                'invoiceId' => $invoiceId,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create Snap payment token for public access
     */
    public function createPublicPaymentToken($invoiceId)
    {
        try {
            $invoice = Invoice::with('customer')->findOrFail($invoiceId);

            // Check if already paid
            if ($invoice->status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice sudah dibayar',
                ], 400);
            }

            $snapToken = $this->midtransService->createSnapToken($invoice, $invoice->customer);

            return response()->json([
                'success' => true,
                'data' => [
                    'snap_token' => $snapToken,
                    'invoice_id' => $invoice->id,
                    'amount' => $invoice->amount,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Schedule isolir for customer on due date
     */
    public function isolirSchedule($customerId, $dueDate, $dueMonth, $dueYear)
    {
        try {
            $customer = Customer::findOrFail($customerId);
            $ipAddress = $customer->ip_address;
            $name = $customer->name;

            if (!$ipAddress) {
                throw new \Exception('IP address tidak ditemukan untuk customer');
            }

            $config = new Config([
                'host' => env('MIKROTIK_HOST'),
                'user' => env('MIKROTIK_USER'),
                'pass' => env('MIKROTIK_PASS'),
                'port' => (int) env('MIKROTIK_PORT'),
            ]);
            $client = new Client($config);
            
            $putIsorlir = '/tool fetch url="https://admin.sentolop.biz.id/api/customers/'.$customerId.'/isisolated/yes" keep-result=no';
            $createIsolir = '/ip/firewall/address-list/add list=ISOLIR-LIST address=' . $ipAddress;
            $event = ":do {\n" .
                     "   " . $putIsorlir . "\n" .
                     "   " . $createIsolir . "\n" .
                     "}";


            // Convert month number to month name for Mikrotik format
            $monthName = Carbon::createFromDate($dueYear, $dueMonth, 1)->format('M');

            $query = (new Query('/system/scheduler/add'))
                ->equal('name', 'isolir-' . $name)
                ->equal('start-date', $monthName . '/' . $dueDate . '/' . $dueYear)
                ->equal('start-time', '23:59:00')
                ->equal('on-event', $event);

            $client->query($query)->read();

            return response()->json([
                'message' => 'Isolir schedule berhasil dibuat',
                'id' => $customerId,
                'ip_address' => $ipAddress,
            ]);
        } catch (\Exception $e) {
            \Log::error('Isolir schedule error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Remove isolir for customer from ISOLIR-LIST
     */
    public function removeIsolir($customerId)
    {
        try {
            $customer = Customer::findOrFail($customerId);
            $ipAddress = $customer->ip_address;

            if (!$ipAddress) {
                throw new \Exception('IP address tidak ditemukan untuk customer');
            }

            $config = new Config([
                'host' => env('MIKROTIK_HOST'),
                'user' => env('MIKROTIK_USER'),
                'pass' => env('MIKROTIK_PASS'),
                'port' => (int) env('MIKROTIK_PORT'),
            ]);
            $client = new Client($config);

            $query = (new Query('/ip/firewall/address-list/print'))
                ->where('list', 'ISOLIR-LIST')
                ->where('address', $ipAddress);
            $response = $client->query($query)->read();

            foreach ($response as $entry) {
                if (isset($entry['.id'])) {
                    $removeQuery = (new Query('/ip/firewall/address-list/remove'))
                        ->equal('.id', $entry['.id']);
                    $client->query($removeQuery)->read();
                }
            }

            $customer->update([
                'is_isolated' => 'no',
            ]);

            return response()->json([
                'message' => 'Isolir berhasil dihapus',
                'id' => $customerId,
                'ip_address' => $ipAddress,
            ]);
        } catch (\Exception $e) {
            \Log::error('Remove isolir error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Remove isolir schedule for customer
     */
    public function removeSchedule($customerId)
    {
        try {
            $customer = Customer::findOrFail($customerId);
            $name = $customer->name;

            $config = new Config([
                'host' => env('MIKROTIK_HOST'),
                'user' => env('MIKROTIK_USER'),
                'pass' => env('MIKROTIK_PASS'),
                'port' => (int) env('MIKROTIK_PORT'),
            ]);
            $client = new Client($config);

            $query = (new Query('/system/scheduler/print'))
                ->where('name', 'isolir-' . $name);
            $response = $client->query($query)->read();

            foreach ($response as $entry) {
                if (isset($entry['.id'])) {
                    $removeQuery = (new Query('/system/scheduler/remove'))
                        ->equal('.id', $entry['.id']);
                    $client->query($removeQuery)->read();
                }
            }

            return response()->json([
                'message' => 'Isolir schedule berhasil dihapus',
                'id' => $customerId,
            ]);
        } catch (\Exception $e) {
            \Log::error('Remove schedule error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send WhatsApp billing notification to all customers with pending invoices
     * Uses Fonnte gateway API
     */
    public function sendWhatsappBilling()
    {
        try {
            $currentMonth = now()->month;
            $currentYear = now()->year;
            $billingPolicy = BillingPolicy::getCurrent();

            // Get all customers with pending invoices for the current month
            $customers = Customer::where('used', 'yes')
                ->with(['package', 'invoices' => function ($query) use ($currentMonth, $currentYear) {
                    $query->where('month', $currentMonth)
                          ->where('year', $currentYear)
                          ->where('status', 'pending');
                }])
                ->get()
                ->filter(fn($customer) => $customer->invoices->isNotEmpty());

            if ($customers->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada pelanggan dengan tagihan tertunda untuk bulan ini',
                ], 400);
            }

            $sent = 0;
            $failed = 0;
            $errors = [];

            $monthName = Carbon::create($currentYear, $currentMonth, 1)->translatedFormat('F Y');

            foreach ($customers as $customer) {
                $invoice = $customer->invoices->first();

                if (!$customer->phone_number) {
                    $failed++;
                    $errors[] = "{$customer->name}: Nomor telepon tidak tersedia";
                    continue;
                }

                $formattedAmount = number_format($invoice->amount, 0, ',', '.');
                $dueDate = Carbon::parse($invoice->due_date)->translatedFormat('d F Y');
                $paymentUrl = url("/payment/{$invoice->id}");

                $message = "Yth. *{$customer->name}*,\n\n"
                    . "Berikut adalah tagihan internet Anda untuk bulan *{$monthName}*:\n\n"
                    . "📦 Paket: *{$customer->package?->name}*\n"
                    . "💰 Tagihan: *Rp {$formattedAmount}*\n"
                    . "📅 Jatuh Tempo: *{$dueDate}*\n\n"
                    . "Silakan lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari pemutusan layanan.\n\n"
                    . "🔗 Bayar Online: {$paymentUrl}\n\n"
                    . "Terima kasih. 🙏";

                $phone = $this->fonnteService->formatPhoneNumber($customer->phone_number);
                $result = $this->fonnteService->sendMessage($phone, $message);

                if (isset($result['status']) && $result['status'] === true) {
                    $sent++;
                } else {
                    $failed++;
                    $reason = $result['reason'] ?? 'Unknown error';
                    $errors[] = "{$customer->name}: {$reason}";
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Tagihan WhatsApp terkirim: {$sent} berhasil, {$failed} gagal dari " . $customers->count() . " pelanggan",
                'data' => [
                    'sent' => $sent,
                    'failed' => $failed,
                    'total' => $customers->count(),
                    'errors' => $errors,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Send WhatsApp billing error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim tagihan WhatsApp: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display History of payments page
     */
    public function history()
    {
        $payments = Payment::all();

        return Inertia::render('ManajemenKeuangan/History', [
            'payments' => $payments->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'invoice_number' => $payment->invoice?->invoice_number,
                    'customer_name' => $payment->customer?->name,
                    'amount' => $payment->amount,
                    'payment_method' => $payment->method,
                    'status' => $payment->status,
                    'created_at' => $payment->created_at->toDateTimeString(),
                ];
            }),
        ]);
    }
}

