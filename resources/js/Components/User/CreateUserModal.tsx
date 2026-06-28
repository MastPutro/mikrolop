import React, { useState } from 'react';
import axios from 'axios';
import MapLocationSelector from './MapLocationSelector';
// import { stat } from 'fs';

interface ODP {
    id: number;
    name: string;
}

interface Package {
    id: number;
    name: string;
}

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    odps: ODP[];
    packages: Package[];
}

export default function CreateUserModal({ isOpen, onClose, onSuccess, odps, packages }: CreateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        lat: -7.47733500,
        lng: 112.56159480,
        odp_id: '',
        package_id: '',
        status: 'suspended',
        phone_number: '',
        ip_address: '',
        router_mac: '',
        interface_name: 'N/A',
        sync_with_server: false,
    });


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name } = e.target;
        const value = (e.target as HTMLInputElement).type === 'checkbox' 
            ? (e.target as HTMLInputElement).checked 
            : e.target.value;
        
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleLocationSelect = (lat: number, lng: number) => {
        setFormData((prev) => ({
            ...prev,
            lat,
            lng,
        }));
    };

    const handleSyncMikrotik = async () => {
        setLoading(true);
        setError(null);
        try {
            await axios.post(`/api/user/execute-script/${formData.name}/${formData.ip_address}/${formData.package_id}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to sync with server');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await axios.post('/api/user', {
                ...formData,
                odp_id: parseInt(formData.odp_id),
                package_id: parseInt(formData.package_id),
                
            });

            // Call handleSyncMikrotik if sync_with_server is true
            if (formData.sync_with_server) {
                await handleSyncMikrotik();
            }

            // Reset form
            setFormData({
                name: '',
                lat: -7.47733500,
                lng: 112.56159480,
                odp_id: '',
                package_id: '',
                status: 'suspended',
                phone_number: '',
                ip_address: '',
                router_mac: '',
                interface_name: 'N/A',
                sync_with_server: false,
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 my-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Tambah User Baru</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 flex gap-4">
                    <div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nama User *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Contoh: User-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ODP *
                            </label>
                            <select
                                name="odp_id"
                                value={formData.odp_id}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Pilih ODP</option>
                                {odps.map((odp) => (
                                    <option key={odp.id} value={odp.id}>
                                        {odp.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status *
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                defaultValue="suspended"
                                disabled
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div> */}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Paket Internet *
                            </label>
                            <select
                                name="package_id"
                                value={formData.package_id}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Pilih Paket</option>
                                {packages.map((pkg) => (
                                    <option key={pkg.id} value={pkg.id}>
                                        {pkg.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nomor Telepon
                            </label>
                            <input
                                type="text"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Contoh: 081234567890"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alamat IP *
                            </label>
                            <input
                                type="text"
                                name="ip_address"
                                value={formData.ip_address}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Contoh: 192.168.1.1"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Router MAC Address
                            </label>
                            <input
                                type="text"
                                name="router_mac"
                                value={formData.router_mac}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Contoh: 00:1A:2B:3C:4D:5E"
                            />
                        </div>
                        {/* <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Interface Name
                            </label>
                            <input
                                type="text"
                                name="interface_name"
                                value={formData.interface_name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Contoh: ether1"
                            />
                        </div> */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sinkronkan dengan Server
                            </label>
                            <input
                                type="checkbox"
                                name="sync_with_server"
                                checked={formData.sync_with_server}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-blue-400"
                            >
                                {loading ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lokasi User (Pilih dari Peta) *
                        </label>
                        <MapLocationSelector
                            onLocationSelect={handleLocationSelect}
                            initialLat={formData.lat}
                            initialLng={formData.lng}
                        />
                    </div>

                    
                    
                </form>
            </div>
        </div>
    );
}