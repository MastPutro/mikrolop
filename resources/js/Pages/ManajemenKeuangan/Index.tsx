import Authenticated from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MonthDayPicker from "@/Components/MonthDayPicker";
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

interface BillingCustomer {
    id: number;
    name: string;
    phone_number: string;
    package_name: string;
    package_price: number;
    invoice: {
        id: number;
        amount: number;
        status: 'pending' | 'paid' | 'canceled';
        payment_method: string | null;
        due_date: string;
        paid_date: string | null;
        is_overdue: boolean;
    } | null;
}

interface BillingStats {
    total_customers: number;
    pending_payment: number;
    paid: number;
    overdue: number;
}

interface EditPolicyModal {
    isOpen: boolean;
    formData: {
        due_date: number;
        send_bill_to_whatsapp: boolean;
    };
}

interface CashPaymentModal {
    isOpen: boolean;
    invoiceId: number | null;
    customerId: number | null;
    formData: {
        proofOfPayment: File | null;
    };
}

export default function ManajemenKeuanganIndex() {
    const [customers, setCustomers] = useState<BillingCustomer[]>([]);
    const [stats, setStats] = useState<BillingStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [billingCreated, setBillingCreated] = useState(false);
    const snapScriptRef = useRef(null);

    const [editPolicy, setEditPolicy] = useState<EditPolicyModal>({
        isOpen: false,
        formData: {
            due_date: 20,
            send_bill_to_whatsapp: true,
        }
    });

    const [cashPayment, setCashPayment] = useState<CashPaymentModal>({
        isOpen: false,
        invoiceId: null,
        customerId: null,
        formData: {
            proofOfPayment: null,
        }
    });

    const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

    // Load billing data
    useEffect(() => {
        loadBillingData();
    }, []);

    const loadBillingData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/keuangan/billing-data');
            if (response.data.success) {
                setCustomers(response.data.data.customers);
                setStats(response.data.data.stats);
                setEditPolicy(prev => ({
                    ...prev,
                    formData: {
                        due_date: response.data.data.billing_policy.due_date,
                        send_bill_to_whatsapp: response.data.data.billing_policy.send_bill_to_whatsapp,
                    }
                }));
                setCurrentMonth(response.data.data.current_month);
                setCurrentYear(response.data.data.current_year);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal memuat data tagihan');
        } finally {
            setLoading(false);
        }
    };

    const openEditPolicyModal = () => {
        setEditPolicy(prev => ({
            ...prev,
            isOpen: true,
        }));
    };

    const resetEditPolicyForm = () => {
        setEditPolicy(prev => ({
            ...prev,
            isOpen: false,
        }));
    };

    const handleUpdateBillingPolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/keuangan/billing-policy', {
                due_date: editPolicy.formData.due_date,
                send_bill_to_whatsapp: editPolicy.formData.send_bill_to_whatsapp,
            });

            if (response.data.success) {
                toast.success(response.data.message);
                resetEditPolicyForm();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal memperbarui kebijakan');
        }
    };

    const handleCreateMonthlyBilling = async () => {
        try {
            const response = await axios.post('/api/keuangan/create-monthly-billing');
            if (response.data.success) {
                toast.success(response.data.message);
                setBillingCreated(true);
                await loadBillingData();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal membuat tagihan bulanan');
        }
    };

    const openCashPaymentModal = (customer: BillingCustomer) => {
        if (!customer.invoice) {
            toast.error('Tidak ada invoice untuk customer ini');
            return;
        }
        setCashPayment({
            isOpen: true,
            invoiceId: customer.invoice.id,
            customerId: customer.id,
            formData: {
                proofOfPayment: null,
            }
        });
    };

    const resetCashPaymentForm = () => {
        setCashPayment({
            isOpen: false,
            invoiceId: null,
            customerId: null,
            formData: {
                proofOfPayment: null,
            }
        });
    };

    const handleCashPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cashPayment.invoiceId) {
            toast.error('Invoice ID tidak ditemukan');
            return;
        }

        try {
            const formData = new FormData();
            if (cashPayment.formData.proofOfPayment) {
                formData.append('proof_of_payment', cashPayment.formData.proofOfPayment);
            }

            const response = await axios.post(
                `/api/keuangan/record-cash-payment/${cashPayment.invoiceId}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                resetCashPaymentForm();
                await loadBillingData();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal merekam pembayaran tunai');
        }
    };

    const verifyPaymentFromServer = async (invoiceId: number) => {
        try {
            const response = await axios.get(`/api/keuangan/verify-payment/${invoiceId}`);
            
            if (response.data.success && response.data.status === 'paid') {
                toast.success('Status pembayaran berhasil diperbarui!');
                await loadBillingData();
            } else if (response.data.success && response.data.status === 'pending') {
                toast.info('Pembayaran masih dalam proses. Silakan tunggu beberapa saat.');
            }
        } catch (error: any) {
            console.error('Verification error:', error);
            // Still reload data to ensure we have latest status
            await loadBillingData();
        }
    };

    const handlePaymentClick = async (customer: BillingCustomer) => {
        if (!customer.invoice) {
            toast.error('Tidak ada invoice untuk customer ini');
            return;
        }

        if (customer.invoice.status === 'paid') {
            toast.warning('Invoice sudah dibayar');
            return;
        }

        try {
            const response = await axios.post(`/api/keuangan/payment-token/${customer.invoice.id}`);
            
            if (response.data.success) {
                const snapToken = response.data.data.snap_token;
                
                // Show Midtrans Snap payment modal
                if (typeof window !== 'undefined' && window.snap) {
                    window.snap.pay(snapToken, {
                        onSuccess: function(result: any) {
                            toast.success('Pembayaran berhasil diproses, memverifikasi...');
                            // Wait a moment then verify payment status from server
                            setTimeout(() => {
                                verifyPaymentFromServer(customer.invoice!.id);
                            }, 1500);
                        },
                        onPending: function(result: any) {
                            toast.info('Pembayaran dalam proses, mohon tunggu konfirmasi dari bank...');
                            // Verify after a delay
                            setTimeout(() => {
                                verifyPaymentFromServer(customer.invoice!.id);
                            }, 3000);
                        },
                        onError: function(result: any) {
                            toast.error('Pembayaran gagal. Silakan coba lagi.');
                        },
                        onClose: function() {
                            // When user closes without completing, verify if payment actually went through
                            setTimeout(() => {
                                verifyPaymentFromServer(customer.invoice!.id);
                            }, 2000);
                        }
                    });
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal membuat token pembayaran');
        }
    };

    const getStatusBadge = (status: string, isOverdue?: boolean) => {
        if (isOverdue && status === 'pending') {
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Lewat Jatuh Tempo</span>;
        }
        
        switch (status) {
            case 'paid':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Sudah Dibayar</span>;
            case 'pending':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Belum Dibayar</span>;
            case 'canceled':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Dibatalkan</span>;
            default:
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
        }).format(amount);
    };

    const canPayCash = (customer: BillingCustomer) => {
        return customer.invoice && customer.invoice.status === 'pending';
    };

    const canPayOnline = (customer: BillingCustomer) => {
        return customer.invoice && customer.invoice.status === 'pending';
    };

    if (loading) {
        return (
            <Authenticated>
                <Head title="Manajemen Keuangan" />
                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="text-center">Loading...</div>
                    </div>
                </div>
            </Authenticated>
        );
    }

    return (
        <Authenticated
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">Manajemen Keuangan</h2>
            }
        >
            <Head title="Manajemen Keuangan" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Bulan ini: {new Date(currentYear, currentMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
                            <p className="text-sm text-gray-600 mt-1">Total: {stats?.pending_payment} Belum Dibayar</p>
                            <p className="text-sm text-gray-600">Total: {stats?.paid} Sudah Dibayar</p>
                            <p className="text-sm text-gray-600">Total: {stats?.overdue} Lewat Jatuh Tempo</p>
                        </div>
                        <div>
                            <div className="flex gap-2 flex-wrap justify-end">
                                <button 
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mb-2" 
                                    onClick={openEditPolicyModal}
                                >
                                    Ubah Ketentuan
                                </button>
                                <button 
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2 disabled:bg-gray-400"
                                    onClick={handleCreateMonthlyBilling}
                                    disabled={billingCreated}
                                >
                                    {billingCreated ? 'Tagihan Sudah Dibuat' : 'Tagih Bulan Ini'}
                                </button>
                            </div>
                            
                            <p className="text-sm text-gray-600">Tanggal Jatuh Tempo: {editPolicy.formData.due_date} {new Date(currentYear, currentMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto bg-white shadow-sm sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No Telepon</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paket</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tagihan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode Pembayaran</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {customers.map((customer) => (
                                    <tr key={customer.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{customer.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{customer.phone_number}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{customer.package_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{customer.invoice ? formatCurrency(customer.invoice.amount) : '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {customer.invoice ? getStatusBadge(customer.invoice.status, customer.invoice.is_overdue) : <span className="text-gray-500">Belum ada</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{customer.invoice?.payment_method || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {customer.invoice ? (
                                                <div className="flex gap-2">
                                                    <button 
                                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                                        onClick={() => {
                                                            // Could add a detail view modal here
                                                            toast.info('Detail tidak tersedia, hubungi admin');
                                                        }}
                                                    >
                                                        Detail
                                                    </button>
                                                    {canPayOnline(customer) && (
                                                        <button 
                                                            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                                                            onClick={() => handlePaymentClick(customer)}
                                                        >
                                                            Bayar Online
                                                        </button>
                                                    )}
                                                    {canPayCash(customer) && (
                                                        <button 
                                                            className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                                                            onClick={() => openCashPaymentModal(customer)}
                                                        >
                                                            Bayar Tunai
                                                        </button>
                                                    )}
                                                    {!canPayCash(customer) && !canPayOnline(customer) && (
                                                        <button 
                                                            className="px-3 py-1 bg-gray-600 text-white rounded cursor-not-allowed text-sm"
                                                            disabled
                                                        >
                                                            Sudah Dibayar
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Policy Modal */}
            <div
                className={`fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 ${editPolicy.isOpen ? '' : 'hidden'}`}
            >
                <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Ubah Ketentuan Pembayaran</h2>
                    <form onSubmit={handleUpdateBillingPolicy}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Jatuh Tempo</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={editPolicy.formData.due_date}
                                onChange={(e) => setEditPolicy({
                                    ...editPolicy,
                                    formData: {
                                        ...editPolicy.formData,
                                        due_date: parseInt(e.target.value)
                                    }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={editPolicy.formData.send_bill_to_whatsapp}
                                    onChange={(e) => setEditPolicy({
                                        ...editPolicy,
                                        formData: {
                                            ...editPolicy.formData,
                                            send_bill_to_whatsapp: e.target.checked
                                        }
                                    })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm font-medium text-gray-700">Kirim Tagihan ke Whatsapp</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button 
                                type="button" 
                                onClick={resetEditPolicyForm} 
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Simpan
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Cash Payment Modal */}
            <div
                className={`fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 ${cashPayment.isOpen ? '' : 'hidden'}`}
            >
                <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Pembayaran Tunai</h2>
                    <form onSubmit={handleCashPayment}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Bukti Pembayaran (Opsional)</label>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => setCashPayment({
                                    ...cashPayment,
                                    formData: {
                                        proofOfPayment: e.target.files ? e.target.files[0] : null
                                    }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, PDF (Maksimal 5MB)</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button 
                                type="button" 
                                onClick={resetCashPaymentForm} 
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Konfirmasi Pembayaran
                            </button>
                        </div>
                    </form>
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
        </Authenticated>
    );
}

