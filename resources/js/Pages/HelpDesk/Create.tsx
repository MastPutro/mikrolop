import React, { useState, useEffect } from "react";
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';

interface Customer {
    id: number;
    name: string;
}

export default function TicketCreate() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        customer_id: '',
        title: '',
        description: '',
        priority: 'medium',
        category: 'other',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await axios.get('/api/user-list');
            setCustomers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        // Clear error for this field when user starts typing
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
            const response = await axios.post('/api/tickets', formData);
            
            setSuccess(true);
            
            // Redirect after success
            setTimeout(() => {
                window.location.href = `/helpdesk/${response.data.data.id}`;
            }, 1000);
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else if (error.response?.data?.message) {
                setErrors({ submit: error.response.data.message });
            } else {
                setErrors({ submit: 'Terjadi kesalahan saat membuat tiket' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Buat Tiket Baru</h2>}>
            <Head title="Buat Tiket Baru" />
            
            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    {/* Back Link */}
                    <div className="mb-6">
                        <Link href="/helpdesk" className="text-blue-600 hover:text-blue-800 font-medium">
                            ← Kembali ke Daftar Tiket
                        </Link>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                            Tiket berhasil dibuat! Anda akan diarahkan ke detail tiket...
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
                            {/* Customer Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Pelanggan <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="customer_id"
                                    value={formData.customer_id}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.customer_id ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    required
                                >
                                    <option value="">-- Pilih Pelanggan --</option>
                                    {customers.map(customer => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.customer_id && (
                                    <p className="mt-1 text-sm text-red-500">{errors.customer_id}</p>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Judul Tiket <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Masukkan judul tiket"
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.title ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    required
                                />
                                {errors.title && (
                                    <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Deskripsi <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Jelaskan masalah atau pertanyaan Anda secara detail"
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.description ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    rows={6}
                                    required
                                />
                                {errors.description && (
                                    <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kategori <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.category ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    required
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

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Prioritas <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.priority ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    required
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

                            {/* Buttons */}
                            <div className="flex gap-4 pt-6 border-t">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Membuat...' : 'Buat Tiket'}
                                </button>
                                <Link
                                    href="/helpdesk"
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
