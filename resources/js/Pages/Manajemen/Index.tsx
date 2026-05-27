import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import CreateODPModal from '@/Components/ODP/CreateODPModal';
import UpdateODPModal from '@/Components/ODP/UpdateODPModal';
import axios from 'axios';

interface Server {
    id: number;
    name: string;
}

interface ODP {
    id: number;
    name: string;
    lat: number;
    lng: number;
    server_id: number | null;
    parent_id: number | null;
    status: string;
    ports: number;
    used_ports: number;
    depth?: number;
    is_leaf?: boolean;
    root_server?: Server;
    server?: Server;
    parent?: ODP;
    parent_odp?: ODP;
    child_odps?: ODP[];
}

export default function ManajemenIndex(props: { auth: any; errors: any; odps: ODP[]; servers: Server[] }) {
    const [odps, setOdps] = useState<ODP[]>(props.odps || []);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedODP, setSelectedODP] = useState<ODP | null>(null);
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    
    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterServer, setFilterServer] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter ODPs based on search and filters
    const filteredOdps = odps.filter((odp) => {
        const matchesSearch = odp.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || odp.status === filterStatus;
        // Get the root server either from server_id or from parent hierarchy
        const rootServerId = odp.server_id || odp.root_server?.id;
        const matchesServer = filterServer === 'all' || rootServerId === parseInt(filterServer);
        return matchesSearch && matchesStatus && matchesServer;
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredOdps.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOdps = filteredOdps.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStatus, filterServer]);

    const handleEditClick = (odp: ODP) => {
        setSelectedODP(odp);
        setIsUpdateModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        setDeleteConfirm(id);
    };

    const handleConfirmDelete = async (id: number) => {
        setLoading(true);
        try {
            await axios.delete(`/api/odp/${id}`);
            setOdps(odps.filter((odp) => odp.id !== id));
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error deleting ODP:', error);
            alert('Error deleting ODP');
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshODPs = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/odp-list');
            const data = await response.json();
            setOdps(data);
        } catch (error) {
            console.error('Error fetching ODPs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateModalClose = () => {
        setIsCreateModalOpen(false);
    };

    const handleUpdateModalClose = () => {
        setIsUpdateModalOpen(false);
        setSelectedODP(null);
    };

    const handleCreateSuccess = () => {
        handleRefreshODPs();
    };

    const handleUpdateSuccess = () => {
        handleRefreshODPs();
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Manajemen ODP
                </h2>
            }
        >
            <Head title="Manajemen ODP" />
            
            <CreateODPModal
                isOpen={isCreateModalOpen}
                onClose={handleCreateModalClose}
                onSuccess={handleCreateSuccess}
                servers={props.servers || []}
                odps={odps}
            />

            <UpdateODPModal
                isOpen={isUpdateModalOpen}
                onClose={handleUpdateModalClose}
                onSuccess={handleUpdateSuccess}
                servers={props.servers || []}
                odps={odps}
                odp={selectedODP}
            />

            {deleteConfirm !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm mx-4">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Hapus ODP</h2>
                        <p className="text-gray-600 mb-6">
                            Apakah Anda yakin ingin menghapus ODP ini? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleConfirmDelete(deleteConfirm)}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:bg-red-400"
                            >
                                {loading ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Daftar ODP</h3>
                            <p className="text-sm text-gray-600 mt-1">Total: {filteredOdps.length} dari {odps.length} ODP</p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah ODP
                        </button>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="mb-6 bg-white shadow-sm rounded-lg p-4 space-y-4">
                        {/* Search Bar */}
                        <div className="flex gap-4 flex-col md:flex-row">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cari ODP</label>
                                <input
                                    type="text"
                                    placeholder="Cari berdasarkan nama ODP..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Filter Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>

                            {/* Filter Server */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Server</label>
                                <select
                                    value={filterServer}
                                    onChange={(e) => setFilterServer(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Semua Server</option>
                                    {props.servers.map((server) => (
                                        <option key={server.id} value={server.id}>
                                            {server.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Reset Button */}
                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterStatus('all');
                                        setFilterServer('all');
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hierarchy</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Server / Parent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedOdps && paginatedOdps.length > 0 ? (
                                    paginatedOdps.map((odp) => {
                                        const usagePercentage = odp.ports > 0 ? (odp.used_ports / odp.ports) * 100 : 0;
                                        const statusColor = odp.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                                        const isRoot = odp.server_id !== null && odp.parent_id === null;
                                        const isLeaf = odp.is_leaf ?? (odp.child_odps?.length === 0);
                                        
                                        return (
                                            <tr key={odp.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{odp.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{odp.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            {isRoot ? (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">Root</span>
                                                            ) : (
                                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">Child</span>
                                                            )}
                                                        </div>
                                                        {odp.depth !== undefined && (
                                                            <span className="text-xs text-gray-600">Level: {odp.depth}</span>
                                                        )}
                                                        {isLeaf && !isRoot && (
                                                            <span className="text-xs text-gray-500">Leaf Node</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {isRoot ? (
                                                        odp.server?.name || 'N/A'
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            {odp.parent_odp?.name && (
                                                                <div className="text-xs">
                                                                    <span className="text-gray-600">Parent: </span>
                                                                    <span className="font-medium text-blue-600">{odp.parent_odp.name}</span>
                                                                </div>
                                                            )}
                                                            {odp.root_server?.name && (
                                                                <div className="text-xs">
                                                                    <span className="text-gray-600">Server: </span>
                                                                    <span className="font-medium">{odp.root_server.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <a 
                                                        href={`https://maps.google.com/?q=${odp.lat},${odp.lng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-900 hover:underline"
                                                    >
                                                        Lihat
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                                                        {odp.status === 'online' ? 'Online' : 'Offline'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{odp.ports}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center">
                                                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                                            <div
                                                                className={`h-2 rounded-full transition-all ${
                                                                    usagePercentage > 80 ? 'bg-red-500' : usagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                                                }`}
                                                                style={{ width: `${usagePercentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-semibold">{usagePercentage.toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(odp)}
                                                        className="text-blue-600 hover:text-blue-900 hover:underline font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(odp.id)}
                                                        className="text-red-600 hover:text-red-900 hover:underline font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                                            {filteredOdps.length === 0 && odps.length > 0 ? 'Tidak ada hasil pencarian' : 'Belum ada data ODP'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Section */}
                    {filteredOdps.length > 0 && (
                        <div className="mt-6 flex flex-col md:flex-row items-center justify-between bg-white shadow-sm rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-4 md:mb-0">
                                Menampilkan {startIndex + 1} hingga {Math.min(endIndex, filteredOdps.length)} dari {filteredOdps.length} ODP
                            </div>
                            <div className="flex gap-2 items-center">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    ← Sebelumnya
                                </button>

                                <div className="flex gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-3 py-2 rounded-lg transition ${
                                                currentPage === page
                                                    ? 'bg-blue-600 text-white'
                                                    : 'border border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    Selanjutnya →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}