<?php

namespace App\Http\Controllers;

use RouterOS\Config;
use RouterOS\Client;
use RouterOS\Query;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MikrotikController extends Controller
{
    private function getMikrotikData()
    {
        $config = new Config([
            'host' => env('MIKROTIK_HOST'),
            'user' => env('MIKROTIK_USER'),
            'pass' => env('MIKROTIK_PASS'),
            'port' => (int) env('MIKROTIK_PORT'),
        ]);

        $client = new Client($config);

        $query = new Query('/system/resource/print');
        $resources = $client->query($query)->read();

        $queryInterface = new Query('/interface/print');
        $interfaces = $client->query($queryInterface)->read();

        // Filter interfaces yang bertipe ethernet
        $ethernetInterfaces = array_filter($interfaces, function($iface) {
            return isset($iface['type']) && $iface['type'] === 'ether';
        });

        return [
            'resources' => $resources[0] ?? [],
            'interfaces' => $interfaces,
            'ethernetInterfaces' => array_values($ethernetInterfaces),
        ];
    }

    public function index()
    {
        try {
            $data = $this->getMikrotikData();
            return Inertia::render('Mikrotik/Index', $data);
        } catch (\Exception $e) {
            return Inertia::render('Mikrotik/Index', [
                'error' => 'Gagal koneksi ke MikroTik: ' . $e->getMessage(),
            ]);
        }
    }

    public function getResourcesApi()
    {
        try {
            $data = $this->getMikrotikData();
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}