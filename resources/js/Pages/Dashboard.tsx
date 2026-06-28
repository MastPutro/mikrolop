import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import BandwidthChart from '@/Components/BandwidthChart';
import axios from 'axios';

// --- Mendefinisikan Tipe Data ---
interface Invoice {
    id: number;
    amount: number;
    status: string;
    due_date: string;
}

interface BillingCustomer {
    id: number;
    name: string;
    phone_number: string;
    package_name: string;
    invoice: Invoice;
}

interface UserData {
    id: number;
    name: string;
    status: string;
    ip_address: string;
    phone_number: string;
}

interface Ticket {
    id: number;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    category: string;
}

export default function Dashboard() {
    // --- Setup State ---
    const [pendingBillings, setPendingBillings] = useState<BillingCustomer[]>([]);
    const [suspendedUsers, setSuspendedUsers] = useState<UserData[]>([]);
    const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // --- Fetching Data dengan Axios ---
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Menggunakan Promise.all agar fetch berjalan paralel & lebih cepat
                const [billingRes, userRes, ticketRes] = await Promise.all([
                    axios.get('/api/keuangan/billing-data'),
                    axios.get('/api/user-list'),
                    axios.get('/api/tickets')
                ]);

                // Filter 1: Tagihan Pending
                const billings = billingRes.data.data.customers.filter(
                    (customer: BillingCustomer) => customer.invoice?.status === 'pending'
                );
                setPendingBillings(billings);

                // Filter 2: User Suspended
                const users = userRes.data.data.filter(
                    (user: UserData) => user.status === 'suspended'
                );
                setSuspendedUsers(users);

                // Filter 3: Tiket Terbuka (selain closed)
                const tickets = ticketRes.data.data.data.filter(
                    (ticket: Ticket) => ticket.status !== 'closed'
                );
                setActiveTickets(tickets);

            } catch (error) {
                console.error("Gagal mengambil data dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard Operasional
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    
                    {isLoading ? (
                        // Tampilan saat data masih di-fetch
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                        </div>
                    ) : (
                        // Tampilan setelah data berhasil di-fetch
                        <div className="space-y-6">
                            {/* Monitoring Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Card: Pending Billings */}
                            <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg border-l-4 border-yellow-400">
                                <div className="p-6 text-gray-900">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-gray-700">Tagihan Pending</h3>
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                                            {pendingBillings.length}
                                        </span>
                                    </div>
                                    <ul className="space-y-3">
                                        {pendingBillings.length > 0 ? (
                                            pendingBillings.map((customer) => (
                                                <li key={customer.id} className="flex justify-between items-center text-sm border-b pb-2">
                                                    <div>
                                                        <p className="font-semibold capitalize">{customer.name}</p>
                                                        <p className="text-gray-500">{customer.phone_number}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium text-red-600">Rp {customer.invoice.amount}</p>
                                                        <p className="text-xs text-gray-400">{new Date(customer.invoice.due_date).toLocaleDateString('id-ID')}</p>
                                                    </div>
                                                </li>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">Tidak ada tagihan pending.</p>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            {/* Card: Suspended Users */}
                            <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg border-l-4 border-red-500">
                                <div className="p-6 text-gray-900">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-gray-700">User Suspended</h3>
                                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                                            {suspendedUsers.length}
                                        </span>
                                    </div>
                                    <ul className="space-y-3">
                                        {suspendedUsers.length > 0 ? (
                                            suspendedUsers.map((user) => (
                                                <li key={user.id} className="flex justify-between items-center text-sm border-b pb-2">
                                                    <div>
                                                        <p className="font-semibold capitalize">{user.name}</p>
                                                        <p className="text-gray-500 font-mono text-xs mt-1">{user.ip_address}</p>
                                                    </div>
                                                    <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">
                                                        Suspended
                                                    </span>
                                                </li>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">Tidak ada user yang disuspend.</p>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            {/* Card: Active Tickets */}
                            <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg border-l-4 border-blue-500">
                                <div className="p-6 text-gray-900">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-gray-700">Tiket Terbuka</h3>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                            {activeTickets.length}
                                        </span>
                                    </div>
                                    <ul className="space-y-3">
                                        {activeTickets.length > 0 ? (
                                            activeTickets.map((ticket) => (
                                                <li key={ticket.id} className="flex flex-col text-sm border-b pb-2">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="font-semibold">{ticket.ticket_number}</p>
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                            {ticket.priority.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 truncate">{ticket.title}</p>
                                                    <p className="text-xs text-gray-400 mt-1 uppercase">Status: {ticket.status}</p>
                                                </li>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">Semua tiket telah ditutup.</p>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            </div>

                            {/* Bandwidth Monitoring Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Ether1 Bandwidth Chart */}
                                <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg border-l-4 border-green-500 p-6">
                                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                                        Interface Ether6
                                    </h3>
                                    <BandwidthChart
                                        interfaces={['ether6']}
                                        refreshInterval={5000}
                                        chartType="bar"
                                        height={250}
                                    />
                                </div>

                                {/* Ether2 Bandwidth Chart */}
                                <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg border-l-4 border-purple-500 p-6">
                                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                                        <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                                        Interface Ether8
                                    </h3>
                                    <BandwidthChart
                                        interfaces={['ether8']}
                                        refreshInterval={5000}
                                        chartType="bar"
                                        height={250}
                                    />
                                </div>
                            </div>

                            {/* Combined Bandwidth Comparison */}
                            <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg border-l-4 border-indigo-500 p-6">
                                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                                    <span className="inline-block w-3 h-3 bg-indigo-500 rounded-full mr-2"></span>
                                    Perbandingan Bandwidth (Ether6 vs Ether8)
                                </h3>
                                <BandwidthChart
                                    interfaces={['ether6', 'ether8']}
                                    refreshInterval={5000}
                                    chartType="line"
                                    height={300}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}