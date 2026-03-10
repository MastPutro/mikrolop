import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Extend Window interface for Midtrans Snap
declare global {
    interface Window {
        snap: any;
    }
}

// Load Midtrans Snap script
if (typeof window !== 'undefined' && !window.snap) {
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', 'Mid-client-2SuhZ8HrAXyuZM3r');
    document.body.appendChild(script);
}

interface InvoiceData {
    id: number;
    customer_name: string;
    customer_phone: string;
    package_name: string;
    amount: number;
    month: number;
    year: number;
    status: string;
    payment_method: string | null;
    due_date: string;
    paid_date: string | null;
    is_paid: boolean;
}

interface PageProps {
    invoiceId: number;
}

export default function PublicPayment({ invoiceId }: PageProps) {
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Load invoice data
    useEffect(() => {
        loadInvoiceData();
    }, []);

    const loadInvoiceData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/keuangan/public-invoice/${invoiceId}`);
            
            if (response.data.success) {
                setInvoice(response.data.data);
            } else {
                toast.error('Tagihan tidak ditemukan');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal memuat data tagihan');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!invoice) return;

        if (invoice.is_paid) {
            toast.warning('Tagihan ini sudah dibayar');
            return;
        }

        try {
            setProcessing(true);
            const response = await axios.post(`/api/keuangan/public-payment-token/${invoiceId}`);
            
            if (response.data.success) {
                const snapToken = response.data.data.snap_token;
                
                // Show Midtrans Snap payment modal
                if (typeof window !== 'undefined' && window.snap) {
                    window.snap.pay(snapToken, {
                        onSuccess: function(result: any) {
                            toast.success('Pembayaran berhasil diproses!');
                            setTimeout(() => {
                                loadInvoiceData();
                            }, 1500);
                        },
                        onPending: function(result: any) {
                            toast.info('Pembayaran dalam proses, mohon tunggu konfirmasi bank...');
                            setTimeout(() => {
                                loadInvoiceData();
                            }, 3000);
                        },
                        onError: function(result: any) {
                            toast.error('Pembayaran gagal. Silakan coba lagi.');
                        },
                        onClose: function() {
                            // Verify payment status when modal closes
                            setTimeout(() => {
                                loadInvoiceData();
                            }, 2000);
                        }
                    });
                } else {
                    toast.error('Midtrans Snap belum siap. Silakan refresh halaman.');
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal membuat token pembayaran');
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
        }).format(amount);
    };

    const formatDate = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        if (status === 'paid') return 'bg-green-100 text-green-800';
        if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Memuat data tagihan...</p>
                </div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div className="text-red-600 text-4xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Tagihan Tidak Ditemukan</h1>
                    <p className="text-gray-600">Nomor tagihan yang Anda cari tidak dapat ditemukan dalam sistem.</p>
                </div>
            </div>
        );
    }

    const monthName = new Date(invoice.year, invoice.month - 1).toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Pembayaran Tagihan</h1>
                    <p className="text-gray-600">Pembayaran mudah dan aman untuk tagihan Anda</p>
                </div>

                {/* Payment Card */}
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
                        <h2 className="text-2xl font-bold mb-2">Tagihan {monthName}</h2>
                        <p className="text-blue-100">Nomor Tagihan: INV-{invoice.id}</p>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 sm:p-8">
                        {/* Invoice Status */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Status Pembayaran</h3>
                                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(invoice.status)}`}>
                                    {invoice.status === 'paid' ? '✓ Sudah Dibayar' : '⏳ Belum Dibayar'}
                                </span>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-gray-50 rounded-lg p-6 mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Pelanggan</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Nama</p>
                                    <p className="text-gray-900 font-medium">{invoice.customer_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">No Telepon</p>
                                    <p className="text-gray-900 font-medium">{invoice.customer_phone}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Paket</p>
                                    <p className="text-gray-900 font-medium">{invoice.package_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Periode</p>
                                    <p className="text-gray-900 font-medium">{monthName}</p>
                                </div>
                            </div>
                        </div>

                        {/* Invoice Details */}
                        <div className="border-t border-b border-gray-200 py-6 mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rincian Tagihan</h3>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Jumlah Tagihan:</span>
                                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.amount)}</span>
                                </div>
                                
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Tanggal Jatuh Tempo:</span>
                                    <span className="text-gray-900 font-medium">{formatDate(invoice.due_date)}</span>
                                </div>

                                {invoice.is_paid && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Tanggal Pembayaran:</span>
                                        <span className="text-gray-900 font-medium">{formatDate(invoice.paid_date)}</span>
                                    </div>
                                )}

                                {invoice.is_paid && invoice.payment_method && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Metode Pembayaran:</span>
                                        <span className="text-gray-900 font-medium capitalize">{invoice.payment_method}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Info Box */}
                        {!invoice.is_paid && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                                <p className="text-sm text-blue-900">
                                    <strong>Metode Pembayaran:</strong> Anda dapat melakukan pembayaran via transfer bank, kartu kredit, e-wallet, dan metode pembayaran digital lainnya.
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!invoice.is_paid && (
                            <button
                                onClick={handlePayment}
                                disabled={processing || invoice.is_paid}
                                className={`w-full py-3 px-4 rounded-lg font-semibold text-white text-lg transition duration-200 ${
                                    processing || invoice.is_paid
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                                }`}
                            >
                                {processing ? (
                                    <span className="flex items-center justify-center">
                                        <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                                        Memproses...
                                    </span>
                                ) : (
                                    <span>💳 Bayar Sekarang {formatCurrency(invoice.amount)}</span>
                                )}
                            </button>
                        )}

                        {invoice.is_paid && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                                <div className="text-5xl text-green-600 mb-4">✓</div>
                                <h3 className="text-xl font-bold text-green-900 mb-2">Pembayaran Berhasil</h3>
                                <p className="text-green-800">Terima kasih atas pembayaran Anda. Tagihan telah lunas pada {formatDate(invoice.paid_date)}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                        <p className="text-center text-sm text-gray-600">
                            Pertanyaan? Hubungi customer service kami melalui WhatsApp atau email
                        </p>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                        <span>🔒</span>
                        <span>Pembayaran Anda dilindungi oleh enkripsi SSL dan Midtrans</span>
                    </p>
                </div>
            </div>

            <ToastContainer 
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </div>
    );
}
