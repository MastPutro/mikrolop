import React, { useState, useEffect } from "react";
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import { format } from 'date-fns';

interface Ticket {
    id: number;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    category: string;
    customer?: {
        id: number;
        name: string;
    };
    created_at: string;
    replies_count?: number;
}

export default function HelpDeskIndex() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize] = useState(15);

    useEffect(() => {
        fetchTickets();
    }, [statusFilter, priorityFilter, currentPage, search]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params: any = {
                per_page: pageSize,
                page: currentPage,
            };

            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            if (priorityFilter) params.priority = priorityFilter;

            const response = await axios.get('/api/tickets', { params });
            
            setTickets(response.data.data.data || []);
            setTotalPages(response.data.data.last_page || 1);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch(status) {
            case 'open':
                return 'bg-yellow-100 text-yellow-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'pending':
                return 'bg-purple-100 text-purple-800';
            case 'resolved':
                return 'bg-green-100 text-green-800';
            case 'closed':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityBadgeColor = (priority: string) => {
        switch(priority) {
            case 'low':
                return 'bg-green-100 text-green-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            case 'high':
                return 'bg-orange-100 text-orange-800';
            case 'urgent':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'open': 'Terbuka',
            'in_progress': 'Sedang Diproses',
            'pending': 'Menunggu',
            'resolved': 'Selesai',
            'closed': 'Ditutup',
        };
        return labels[status] || status;
    };

    const getPriorityLabel = (priority: string) => {
        const labels: Record<string, string> = {
            'low': 'Rendah',
            'medium': 'Sedang',
            'high': 'Tinggi',
            'urgent': 'Mendesak',
        };
        return labels[priority] || priority;
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Help Desk - Manajemen Tiket</h2>}
        >
            <Head title="Help Desk" />
            
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Header Section */}
                    <div className="mb-6 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">Daftar Tiket</h3>
                        <Link 
                            href="/helpdesk/create"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            + Buat Tiket Baru
                        </Link>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="mb-6 bg-white shadow-sm rounded-lg p-6 space-y-4">
                        {/* Search Bar */}
                        <div className="flex gap-4 flex-col md:flex-row">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cari Tiket
                                </label>
                                <input
                                    type="text"
                                    placeholder="Cari berdasarkan ID, judul, atau nama pelanggan"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <select 
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">Semua Status</option>
                                    <option value="open">Terbuka</option>
                                    <option value="in_progress">Sedang Diproses</option>
                                    <option value="pending">Menunggu</option>
                                    <option value="resolved">Selesai</option>
                                    <option value="closed">Ditutup</option>
                                </select>
                            </div>

                            {/* Priority Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Prioritas
                                </label>
                                <select 
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={priorityFilter}
                                    onChange={(e) => {
                                        setPriorityFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">Semua Prioritas</option>
                                    <option value="low">Rendah</option>
                                    <option value="medium">Sedang</option>
                                    <option value="high">Tinggi</option>
                                    <option value="urgent">Mendesak</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tickets Table */}
                    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">
                                Memuat data...
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Tidak ada tiket ditemukan
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    No. Tiket
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    Judul
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    Pelanggan
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    Prioritas
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    Dibuat
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {tickets.map((ticket) => (
                                                <tr key={ticket.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                                                        <Link href={`/helpdesk/${ticket.id}`}>
                                                            {ticket.ticket_number}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <Link href={`/helpdesk/${ticket.id}`} className="hover:text-blue-600">
                                                            {ticket.title}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        {ticket.customer?.name || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(ticket.status)}`}>
                                                            {getStatusLabel(ticket.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeColor(ticket.priority)}`}>
                                                            {getPriorityLabel(ticket.priority)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                        <Link 
                                                            href={`/helpdesk/${ticket.id}`}
                                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            Lihat
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Halaman {currentPage} dari {totalPages}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Sebelumnya
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Selanjutnya
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}