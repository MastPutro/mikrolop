<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class HelpdeskController extends Controller
{
    public function index()
    {
        return Inertia::render('HelpDesk/Index');
    }

    public function create()
    {
        return Inertia::render('HelpDesk/Create');
    }

    public function show($id)
    {
        return Inertia::render('HelpDesk/Show', [
            'ticketId' => $id,
        ]);
    }

    public function edit($id)
    {
        return Inertia::render('HelpDesk/Edit', [
            'ticketId' => $id,
        ]);
    }
}
