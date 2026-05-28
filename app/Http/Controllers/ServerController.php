<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Server;

class ServerController extends Controller
{
    
    public function index(){
        $server = Server::first(); // Assuming you have only one server record

        return Inertia::render('OpsiServer/Index', [
            'server' => $server
        ]);
    }

    public function show(){
        $server = Server::first(); // Assuming you have only one server record

        return response()->json($server);
    }

    /**
     * Update server Status (e.g., online/offline) - This can be called by a scheduled task or monitoring system
     * request send by Netwatch to API endpoint to update server status in database
     */
    public function updateStatus($request){
        $server = Server::first(); // Assuming you have only one server record
        $server->status = ($request);
        $server->save();

        return response()->json(['message' => 'Server status updated successfully']);
    }
}
