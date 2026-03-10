<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use \RouterOS\Client;
use \RouterOS\Query;


class InjectScriptController extends Controller
{
    public function index(){
        $config = [
            'host' => env('MIKROTIK_HOST'),
            'user' => env('MIKROTIK_USER'),
            'pass' => env('MIKROTIK_PASS'),
            'port' => (int) env('MIKROTIK_PORT'),
        ];

        // Print Interface
         try {
            $client = new Client($config);
            $query = new Query('/interface/print');
            $interfaces = $client->query($query)->read();

            // Filter interfaces yang bertipe ethernet
            $ethernetInterfaces = array_filter($interfaces, function($iface) {
                return isset($iface['type']) && $iface['type'] === 'ether';
            });
            // dd($interfaces);
        } catch (\Exception $e) {
            dd('Error: ' . $e->getMessage());
        }


        return Inertia::render('InjectScript/Index', [
            'interfaces' => $interfaces
        ]);
    }
}
