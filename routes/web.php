<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\MikrotikController;
use App\Http\Controllers\GISMapController;
use App\Http\Controllers\ManajemenODPController;
use App\Http\Controllers\ManajemenUserController;
use App\Http\Controllers\ManajemenPaketController;
use App\Http\Controllers\ServerController;
use App\Http\Controllers\KeuanganController;
use App\Http\Controllers\HelpdeskController;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::get('/mikrotik', [MikrotikController::class, 'index'])->name('mikrotik.index');
    Route::get('/api/mikrotik/resources', [MikrotikController::class, 'getResourcesApi'])->name('mikrotik.getResourcesApi');

    // GIS Map page
    Route::get('/gis-map', [GISMapController::class, 'index'])->name('gis.map');

    // Manajemen page
    Route::get('/manajemen', [ManajemenODPController::class, 'index'])->name('manajemen.index');
    Route::get('/manajemen-user', [ManajemenUserController::class, 'index'])->name('manajemen.user.index');
    Route::get('/manajemen-paket', [ManajemenPaketController::class, 'index'])->name('manajemen.paket.index');
    Route::get('/manajemen-keuangan', [KeuanganController::class, 'index'])->name('manajemen.keuangan.index');

    // Opsi Server page
    Route::get('/opsi-server', [ServerController::class, 'index'])->name('opsi.server.index');

    // Helpdesk page
    Route::get('/helpdesk', [HelpdeskController::class, 'index'])->name('helpdesk.index');
    Route::get('/helpdesk/create', [HelpdeskController::class, 'create'])->name('helpdesk.create');
    Route::get('/helpdesk/{id}', [HelpdeskController::class, 'show'])->name('helpdesk.show');
    Route::get('/helpdesk/{id}/edit', [HelpdeskController::class, 'edit'])->name('helpdesk.edit');

    // History of payments page
    Route::get('/history', [KeuanganController::class, 'history'])->name('history.index');
});

// Public payment page (no authentication required)
Route::get('/payment/{invoiceId}', [KeuanganController::class, 'generatePublicPaymentPage'])->name('public.payment');

require __DIR__.'/auth.php';
