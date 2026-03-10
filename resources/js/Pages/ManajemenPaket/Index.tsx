import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Package {
    id: number;
    name: string;
    speed_tx: number;
    speed_rx: number;
    bucket_size: number;
    parent_queue: string;
    priority: number;
    description: string | null;
    price: number;
    is_active: boolean;
    customers_count?: number;
    created_at: string;
}

interface CreateModalState {
    isOpen: boolean;
    formData: {
        name: string;
        speed_tx: string;
        speed_rx: string;
        bucket_size: string;
        parent_queue: string;
        priority: string;
        description: string;
        price: string;
    };
}

interface EditModalState {
    isOpen: boolean;
    package: Package | null;
    formData: {
        name: string;
        speed_tx: string;
        speed_rx: string;
        bucket_size: string;
        parent_queue: string;
        priority: string;
        description: string;
        price: string;
    };
}

export default function ManajemenPaketIndex(props: { auth: any; packages?: Package[] }) {
    const initialPackages = Array.isArray(props.packages) ? props.packages : [];
    const [packages, setPackages] = useState<Package[]>(initialPackages);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedScript, setSelectedScript] = useState<string | null>(null);
    const [showScriptModal, setShowScriptModal] = useState(false);

    const [createModal, setCreateModal] = useState<CreateModalState>({
        isOpen: false,
        formData: {
            name: '',
            speed_tx: '',
            speed_rx: '',
            bucket_size: '',
            parent_queue: 'Broadband',
            priority: '8',
            description: '',
            price: '',
        },
    });

    const [editModal, setEditModal] = useState<EditModalState>({
        isOpen: false,
        package: null,
        formData: {
            name: '',
            speed_tx: '',
            speed_rx: '',
            bucket_size: '',
            parent_queue: 'Broadband',
            priority: '8',
            description: '',
            price: '',
        },
    });

    // Fetch packages
    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/paket-list', {
                params: {
                    search: searchQuery,
                    is_active: filterStatus,
                },
            });
            // Handle different response formats
            const data = response.data?.data || response.data || [];
            const packagesArray = Array.isArray(data) ? data : [];
            setPackages(packagesArray.filter(pkg => pkg && typeof pkg === 'object'));
        } catch (error) {
            console.error('Error fetching packages:', error);
            alert('Gagal mengambil data paket');
            setPackages([]);
        } finally {
            setLoading(false);
        }
    };

    // Handle create package
    const handleCreatePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/paket', {
                name: createModal.formData.name,
                speed_tx: parseInt(createModal.formData.speed_tx),
                speed_rx: parseInt(createModal.formData.speed_rx),
                bucket_size: parseInt(createModal.formData.bucket_size),
                parent_queue: createModal.formData.parent_queue,
                priority: parseInt(createModal.formData.priority),
                description: createModal.formData.description,
                price: parseFloat(createModal.formData.price),
            });

            setPackages([...packages, response.data.data]);
            resetCreateModal();
            setSelectedScript(response.data.script);
            setShowScriptModal(true);
            alert('Paket berhasil dibuat! Silakan lihat script Mikrotik yang dihasilkan');
            fetchPackages();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal membuat paket';
            alert(message);
        }
    };

    // Handle update package
    const handleUpdatePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal.package) return;

        try {
            const response = await axios.put(`/api/paket/${editModal.package.id}`, {
                name: editModal.formData.name,
                speed_tx: parseInt(editModal.formData.speed_tx),
                speed_rx: parseInt(editModal.formData.speed_rx),
                bucket_size: parseInt(editModal.formData.bucket_size),
                parent_queue: editModal.formData.parent_queue,
                priority: parseInt(editModal.formData.priority),
                description: editModal.formData.description,
                price: parseFloat(editModal.formData.price),
            });

            setPackages(packages.map(p => p.id === editModal.package!.id ? response.data.data : p));
            resetEditModal();
            alert('Paket berhasil diperbarui');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal memperbarui paket';
            alert(message);
        }
    };

    // Handle delete package
    const handleDeletePackage = async (id: number) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus paket ini?')) return;

        try {
            await axios.delete(`/api/paket/${id}`);
            setPackages(packages.filter(p => p.id !== id));
            alert('Paket berhasil dihapus');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal menghapus paket';
            alert(message);
        }
    };


    const resetCreateModal = () => {
        setCreateModal({
            isOpen: false,
            formData: {
                name: '',
                speed_tx: '',
                speed_rx: '',
                bucket_size: '',
                parent_queue: 'Broadband',
                priority: '8',
                description: '',
                price: '',
            },
        });
    };

    const resetEditModal = () => {
        setEditModal({
            isOpen: false,
            package: null,
            formData: {
                name: '',
                speed_tx: '',
                speed_rx: '',
                bucket_size: '',
                parent_queue: 'Broadband',
                priority: '8',
                description: '',
                price: '',
            },
        });
    };

    const openEditModal = (pkg: Package) => {
        setEditModal({
            isOpen: true,
            package: pkg,
            formData: {
                name: pkg.name,
                speed_tx: pkg.speed_tx.toString(),
                speed_rx: pkg.speed_rx.toString(),
                bucket_size: pkg.bucket_size.toString(),
                parent_queue: pkg.parent_queue,
                priority: pkg.priority.toString(),
                description: pkg.description || '',
                price: pkg.price.toString(),
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Manajemen Paket</h2>}
        >
            <Head title="Manajemen Paket" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Daftar Paket</h3>
                            <p className="text-sm text-gray-600 mt-1">Total: {packages.length} Paket</p>
                        </div>
                        <button
                            onClick={() => setCreateModal({ ...createModal, isOpen: true })}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Paket
                        </button>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="mb-6 bg-white shadow-sm rounded-lg p-4 space-y-4">
                        <div className="flex gap-4 flex-col md:flex-row">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cari Paket</label>
                                <input
                                    type="text"
                                    placeholder="Cari berdasarkan nama paket..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="true">Aktif</option>
                                    <option value="false">Non-Aktif</option>
                                </select>
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterStatus('all');
                                        fetchPackages();
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-gray-600 mt-4">Memuat paket...</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Speed</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bucket Size</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Queue</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {packages && Array.isArray(packages) && packages.filter(pkg => pkg && pkg.id).map((pkg) => (
                                        <tr key={pkg.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.speed_tx || 0} Mbps / {pkg.speed_rx || 0} Mbps</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.bucket_size || 0}KB</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.parent_queue || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {pkg.is_active ? 'Aktif' : 'Non-Aktif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rp {pkg.price?.toLocaleString('id-ID') || '0'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 space-x-2">
                                                <button
                                                    onClick={() => openEditModal(pkg)}
                                                    className="text-blue-600 hover:text-blue-900 font-medium"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePackage(pkg.id)}
                                                    className="text-red-600 hover:text-red-900 font-medium"
                                                >
                                                    Hapus
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {packages.length === 0 && (
                                <div className="px-6 py-12 text-center text-gray-500">
                                    Tidak ada paket yang tersedia
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {createModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Tambah Paket Baru</h3>
                        <form onSubmit={handleCreatePackage} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nama Paket"
                                value={createModal.formData.name}
                                onChange={(e) => setCreateModal({
                                    ...createModal,
                                    formData: { ...createModal.formData, name: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Speed TX (Mbps)"
                                value={createModal.formData.speed_tx}
                                onChange={(e) => setCreateModal({
                                    ...createModal,
                                    formData: { ...createModal.formData, speed_tx: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Speed RX (Mbps)"
                                value={createModal.formData.speed_rx}
                                onChange={(e) => setCreateModal({
                                    ...createModal,
                                    formData: { ...createModal.formData, speed_rx: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Bucket Size (KB)"
                                value={createModal.formData.bucket_size}
                                onChange={(e) => setCreateModal({
                                    ...createModal,
                                    formData: { ...createModal.formData, bucket_size: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Parent Queue"
                                value={createModal.formData.parent_queue}
                                onChange={(e) => setCreateModal({
                                    ...createModal,
                                    formData: { ...createModal.formData, parent_queue: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Priority (0-7)"
                                value={createModal.formData.priority}
                                onChange={(e) => setCreateModal({
                                    ...createModal,
                                    formData: { ...createModal.formData, priority: e.target.value }
                                })}
                                min="0"
                                max="7"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="number"
                                placeholder="Price (Rp)"
                                value={createModal.formData.price}
                                onChange={(e) => setCreateModal({
                                    ...createModal,
                                    formData: { ...createModal.formData, price: e.target.value }
                                })}
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <textarea
                                placeholder="Deskripsi (opsional)"
                                value={createModal.formData.description}
                                onChange={(e) => setCreateModal({
                                    ...createModal,
                                    formData: { ...createModal.formData, description: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={resetCreateModal}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
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
            )}

            {/* Edit Modal */}
            {editModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Edit Paket</h3>
                        <form onSubmit={handleUpdatePackage} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nama Paket"
                                value={editModal.formData.name}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, name: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="number"
                                placeholder="Speed TX (Mbps)"
                                value={editModal.formData.speed_tx}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, speed_tx: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="number"
                                placeholder="Speed RX (Mbps)"
                                value={editModal.formData.speed_rx}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, speed_rx: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="number"
                                placeholder="Bucket Size (KB)"
                                value={editModal.formData.bucket_size}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, bucket_size: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="text"
                                placeholder="Parent Queue"
                                value={editModal.formData.parent_queue}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, parent_queue: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="number"
                                placeholder="Priority (0-7)"
                                value={editModal.formData.priority}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, priority: e.target.value }
                                })}
                                min="0"
                                max="7"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <textarea
                                placeholder="Deskripsi (opsional)"
                                value={editModal.formData.description}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, description: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={resetEditModal}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Script Display Modal */}
            {showScriptModal && selectedScript && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-96 overflow-auto">
                        <h3 className="text-lg font-semibold mb-4">Mikrotik Queue Script</h3>
                        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-auto max-h-64">
                            {selectedScript}
                        </pre>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(selectedScript);
                                alert('Script berhasil disalin ke clipboard');
                            }}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Salin Script
                        </button>
                        <button
                            onClick={() => setShowScriptModal(false)}
                            className="mt-4 ml-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}