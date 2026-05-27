import React, { useState, useEffect } from "react";
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import { format } from 'date-fns';

interface TicketReply {
    id: number;
    message: string;
    is_internal: boolean;
    user: {
        id: number;
        name: string;
    };
    created_at: string;
}

interface Ticket {
    id: number;
    ticket_number: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    customer?: {
        id: number;
        name: string;
    };
    assignedTo?: {
        id: number;
        name: string;
    };
    resolution_notes?: string;
    resolved_at?: string;
    created_at: string;
    replies?: TicketReply[];
}

interface Props {
    ticketId: number;
}

export default function TicketShow({ ticketId }: Props) {
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [replies, setReplies] = useState<TicketReply[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyMessage, setReplyMessage] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [newPriority, setNewPriority] = useState('');
    const [editingStatus, setEditingStatus] = useState(false);
    const [editingPriority, setEditingPriority] = useState(false);

    useEffect(() => {
        fetchTicket();
    }, []);

    const fetchTicket = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/tickets/${ticketId}`);
            setTicket(response.data.data);
            setNewStatus(response.data.data.status);
            setNewPriority(response.data.data.priority);
            
            // Fetch replies
            const repliesResponse = await axios.get(`/api/tickets/${ticketId}/replies`);
            setReplies(repliesResponse.data.data.data || []);
        } catch (error) {
            console.error('Error fetching ticket:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim()) return;

        setSubmittingReply(true);
        try {
            const response = await axios.post(`/api/tickets/${ticketId}/replies`, {
                message: replyMessage,
                is_internal: false,
            });

            setReplies([...replies, response.data.data]);
            setReplyMessage('');
            
            // Update ticket
            fetchTicket();
        } catch (error) {
            console.error('Error adding reply:', error);
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleStatusChange = async (status: string) => {
        try {
            const response = await axios.patch(`/api/tickets/${ticketId}`, {
                status: status,
            });
            setTicket(response.data.data);
            setNewStatus(status);
            setEditingStatus(false);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handlePriorityChange = async (priority: string) => {
        try {
            const response = await axios.patch(`/api/tickets/${ticketId}`, {
                priority: priority,
            });
            setTicket(response.data.data);
            setNewPriority(priority);
            setEditingPriority(false);
        } catch (error) {
            console.error('Error updating priority:', error);
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

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            'billing': 'Penagihan',
            'technical': 'Teknis',
            'service': 'Layanan',
            'complaint': 'Keluhan',
            'other': 'Lainnya',
        };
        return labels[category] || category;
    };

    if (loading || !ticket) {
        return (
            <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Detail Tiket</h2>}>
                <Head title="Detail Tiket" />
                <div className="py-12">
                    <div className="mx-auto max-w-4xl sm:px-6 lg:px-8 text-center text-gray-500">
                        Memuat data...
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Detail Tiket</h2>}>
            <Head title={`Tiket ${ticket.ticket_number}`} />
            
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    {/* Back Link */}
                    <div className="mb-6">
                        <Link href="/helpdesk" className="text-blue-600 hover:text-blue-800 font-medium">
                            ← Kembali ke Daftar Tiket
                        </Link>
                    </div>

                    {/* Ticket Header */}
                    <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.title}</h1>
                                <p className="text-gray-600">No. Tiket: <span className="font-semibold text-gray-900">{ticket.ticket_number}</span></p>
                            </div>
                            <Link href={`/helpdesk/${ticket.id}/edit`} className="text-blue-600 hover:text-blue-800 font-medium">
                                Edit
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Status</p>
                                {editingStatus ? (
                                    <select 
                                        value={newStatus}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="open">Terbuka</option>
                                        <option value="in_progress">Sedang Diproses</option>
                                        <option value="pending">Menunggu</option>
                                        <option value="resolved">Selesai</option>
                                        <option value="closed">Ditutup</option>
                                    </select>
                                ) : (
                                    <button 
                                        onClick={() => setEditingStatus(true)}
                                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(ticket.status)} cursor-pointer hover:opacity-80`}
                                    >
                                        {getStatusLabel(ticket.status)}
                                    </button>
                                )}
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-1">Prioritas</p>
                                {editingPriority ? (
                                    <select 
                                        value={newPriority}
                                        onChange={(e) => handlePriorityChange(e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="low">Rendah</option>
                                        <option value="medium">Sedang</option>
                                        <option value="high">Tinggi</option>
                                        <option value="urgent">Mendesak</option>
                                    </select>
                                ) : (
                                    <button 
                                        onClick={() => setEditingPriority(true)}
                                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeColor(ticket.priority)} cursor-pointer hover:opacity-80`}
                                    >
                                        {getPriorityLabel(ticket.priority)}
                                    </button>
                                )}
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-1">Kategori</p>
                                <p className="text-sm font-semibold text-gray-900">{getCategoryLabel(ticket.category)}</p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-1">Dibuat</p>
                                <p className="text-sm font-semibold text-gray-900">{format(new Date(ticket.created_at), 'dd/MM/yyyy')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Pelanggan</p>
                                <p className="text-sm font-semibold text-gray-900">{ticket.customer?.name || 'N/A'}</p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-1">Ditugaskan Ke</p>
                                <p className="text-sm font-semibold text-gray-900">{ticket.assignedTo?.name || 'Belum ditugaskan'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Deskripsi</h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {/* Resolution Notes */}
                    {ticket.resolution_notes && (
                        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Catatan Resolusi</h2>
                            <p className="text-gray-700 whitespace-pre-wrap">{ticket.resolution_notes}</p>
                        </div>
                    )}

                    {/* Replies Section */}
                    {/* <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Balasan ({replies.length})</h2>

                        <div className="space-y-4 mb-6">
                            {replies.length === 0 ? (
                                <p className="text-gray-500 py-4">Belum ada balasan</p>
                            ) : (
                                replies.map((reply) => (
                                    <div key={reply.id} className={`p-4 rounded-lg border ${reply.is_internal ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold text-gray-900">{reply.user.name}</p>
                                                {reply.is_internal && (
                                                    <span className="inline-block text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded mt-1">
                                                        Internal Note
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-600">
                                                {format(new Date(reply.created_at), 'dd/MM/yyyy HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                                    </div>
                                ))
                            )}
                        </div>


                        <form onSubmit={handleAddReply} className="border-t pt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tambah Balasan</label>
                            <textarea
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder="Tulis balasan Anda di sini..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={4}
                            />
                            <button
                                type="submit"
                                disabled={submittingReply || !replyMessage.trim()}
                                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submittingReply ? 'Mengirim...' : 'Kirim Balasan'}
                            </button>
                        </form>
                    </div> */}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
