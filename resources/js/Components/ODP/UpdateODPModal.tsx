import React, { useState } from 'react';
import axios from 'axios';
import MapLocationSelector from './MapLocationSelector';

interface Server {
    id: number;
    name: string;
}

interface ODP {
    id: number;
    name: string;
    lat: number;
    lng: number;
    server_id: number;
    status: string;
    ports: number;
    used_ports: number;
}

interface UpdateODPModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    servers: Server[];
    odp: ODP | null;
}

export default function UpdateODPModal({ isOpen, onClose, onSuccess, servers, odp }: UpdateODPModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<ODP | null>(odp);

    React.useEffect(() => {
        if (odp) {
            setFormData({ ...odp });
        }
    }, [odp, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (formData) {
            setFormData((prev) =>
                prev
                    ? {
                          ...prev,
                          [name]: [
                              'server_id',
                              'ports',
                              'used_ports',
                          ].includes(name)
                              ? parseInt(value)
                              : value,
                      }
                    : null
            );
        }
    };

    const handleLocationSelect = (lat: number, lng: number) => {
        if (formData) {
            setFormData((prev) =>
                prev
                    ? {
                          ...prev,
                          lat,
                          lng,
                      }
                    : null
            );
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        setError(null);
        setLoading(true);

        try {
            await axios.put(`/api/odp/${formData.id}`, {
                name: formData.name,
                lat: formData.lat,
                lng: formData.lng,
                server_id: formData.server_id,
                status: formData.status,
                ports: formData.ports,
                used_ports: formData.used_ports,
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error updating ODP');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !formData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 my-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Edit ODP - {formData.name}</h2>
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama ODP *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Contoh: ODP-JKT-005"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Server *
                        </label>
                        <select
                            name="server_id"
                            value={formData.server_id}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Pilih Server</option>
                            {servers.map((server) => (
                                <option key={server.id} value={server.id}>
                                    {server.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lokasi ODP (Pilih dari Peta) *
                        </label>
                        <MapLocationSelector
                            onLocationSelect={handleLocationSelect}
                            initialLat={formData.lat}
                            initialLng={formData.lng}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status *
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Total Port *
                            </label>
                            <input
                                type="number"
                                name="ports"
                                value={formData.ports}
                                onChange={handleChange}
                                required
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Port Terpakai *
                            </label>
                            <input
                                type="number"
                                name="used_ports"
                                value={formData.used_ports}
                                onChange={handleChange}
                                required
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
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
                            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
