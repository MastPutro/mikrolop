<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FonnteService
{
    protected string $apiUrl = 'https://api.fonnte.com/send';
    protected string $token;

    public function __construct()
    {
        $this->token = env('FONNTE_TOKEN', '');
    }

    /**
     * Send a WhatsApp message via Fonnte gateway
     *
     * @param string $target Phone number (e.g. 628xxxxxxxxxx)
     * @param string $message Message content
     * @return array Response from Fonnte API
     */
    public function sendMessage(string $target, string $message): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => $this->token,
            ])->post($this->apiUrl, [
                'target' => $target,
                'message' => $message,
                'countryCode' => '62',
            ]);

            $result = $response->json();

            Log::info('Fonnte WhatsApp sent', [
                'target' => $target,
                'status' => $result['status'] ?? 'unknown',
                'detail' => $result['detail'] ?? '',
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('Fonnte WhatsApp error: ' . $e->getMessage(), [
                'target' => $target,
            ]);

            return [
                'status' => false,
                'reason' => $e->getMessage(),
            ];
        }
    }

    /**
     * Format phone number to international format for Fonnte
     * Converts 08xx to 628xx
     *
     * @param string $phone
     * @return string
     */
    public function formatPhoneNumber(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (str_starts_with($phone, '0')) {
            $phone = '62' . substr($phone, 1);
        }

        if (!str_starts_with($phone, '62')) {
            $phone = '62' . $phone;
        }

        return $phone;
    }
}
