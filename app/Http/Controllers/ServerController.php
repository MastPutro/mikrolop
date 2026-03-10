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
}
