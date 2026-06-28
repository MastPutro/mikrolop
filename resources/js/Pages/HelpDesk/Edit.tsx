import React, { useState, useEffect } from "react";
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';

interface User {
    id: number;
    name: string;
}

interface TicketForm {
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    assigned_to: string;
    resolution_notes: string;
}

interface Props {
    ticketId: number;
}

export default function TicketEdit({ ticketId }: Props) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState<TicketForm>({
        title: '',
        description: '',
        status: 'open',
        priority: 'medium',
        category: 'other',
        assigned_to: '',
        resolution_notes: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchTicket();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/user-list');
            setUsers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchTicket = async () => {
        try {
            const response = await axios.get(`/api/tickets/${ticketId}`);
            const ticket = response.data.data;
            setFormData({
                title: ticket.title,
                description: ticket.description,
                status: ticket.status,
                priority: ticket.priority,
                category: ticket.category,
                assigned_to: ticket.assigned_to || '',
                resolution_notes: ticket.resolution_notes || '',
            });
        } catch (error) {
            console.error('Error fetching ticket:', error);
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            await axios.patch(`/api/tickets/${ticketId}`, formData);
            
            setSuccess(true);
            
            // Redirect after success
            setTimeout(() => {
                window.location.href = `/helpdesk/${ticketId}`;
            }, 1000);
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else if (error.response?.data?.message) {
                setErrors({ submit: error.response.data.message });
            } else {
                setErrors({ submit: 'Terjadi kesalahan saat memperbarui tiket' });
            }
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Tiket</h2>}>
                <Head title="Edit Tiket" />
                <div className="py-12">
                    <div className="mx-auto max-w-2xl sm:px-6 lg:px-8 text-center text-gray-500">
                        Memuat data...
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Tiket</h2>}>
            <Head title="Edit Tiket" />
            
            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    {/* Back Link */}
                    <div className="mb-6">
                        <Link href={`/helpdesk/${ticketId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                            ← Kembali ke Detail Tiket
                        </Link>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                            Tiket berhasil diperbarui! Anda akan diarahkan ke detail tiket...
                        </div>
                    )}

                    {/* Error Message */}
                    {errors.submit && (
                        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            {errors.submit}
                        </div>
                    )}

                    {/* Form */}
                    <div className="bg-white shadow-sm rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Judul Tiket
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.title ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.title && (
                                    <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Deskripsi
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.description ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    rows={4}
                                />
                                {errors.description && (
                                    <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.status ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                >
                                    <option value="open">Terbuka</option>
                                    <option value="in_progress">Sedang Diproses</option>
                                    <option value="pending">Menunggu</option>
                                    <option value="resolved">Selesai</option>
                                    <option value="closed">Ditutup</option>
                                </select>
                                {errors.status && (
                                    <p className="mt-1 text-sm text-red-500">{errors.status}</p>
                                )}
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Prioritas
                                </label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.priority ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                >
                                    <option value="low">Rendah</option>
                                    <option value="medium">Sedang</option>
                                    <option value="high">Tinggi</option>
                                    <option value="urgent">Mendesak</option>
                                </select>
                                {errors.priority && (
                                    <p className="mt-1 text-sm text-red-500">{errors.priority}</p>
                                )}
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kategori
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.category ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                >
                                    <option value="billing">Penagihan</option>
                                    <option value="technical">Teknis</option>
                                    <option value="service">Layanan</option>
                                    <option value="complaint">Keluhan</option>
                                    <option value="other">Lainnya</option>
                                </select>
                                {errors.category && (
                                    <p className="mt-1 text-sm text-red-500">{errors.category}</p>
                                )}
                            </div>

                            {/* Assigned To */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ditugaskan Ke
                                </label>
                                <select
                                    name="assigned_to"
                                    value={formData.assigned_to}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.assigned_to ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                >
                                    <option value="">-- Tidak Ditugaskan --</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.assigned_to && (
                                    <p className="mt-1 text-sm text-red-500">{errors.assigned_to}</p>
                                )}
                            </div>

                            {/* Resolution Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Catatan Resolusi
                                </label>
                                <textarea
                                    name="resolution_notes"
                                    value={formData.resolution_notes}
                                    onChange={handleChange}
                                    placeholder="Tambahkan catatan tentang cara tiket diselesaikan"
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.resolution_notes ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    rows={4}
                                />
                                {errors.resolution_notes && (
                                    <p className="mt-1 text-sm text-red-500">{errors.resolution_notes}</p>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-4 pt-6 border-t">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                                <Link
                                    href={`/helpdesk/${ticketId}`}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors text-center"
                                >
                                    Batal
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
