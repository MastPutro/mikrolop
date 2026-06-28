import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import CreateUserModal from '@/Components/User/CreateUserModal';
import MapLocationSelector from '@/Components/User/MapLocationSelector';

interface Customer {
    id: number;
    name: string;
    lat: number;
    lng: number;
    odp_id: number;
    package_id: number | null;
    status: 'active' | 'inactive' | 'suspended';
    is_isolated: 'yes' | 'no';
    phone_number: string | null;
    ip_address: string;
    odp?: {
        id: number;
        name: string;
    };
    package?: {
        id: number;
        name: string;
    };
    created_at: string;
}

interface ODP {
    id: number;
    name: string;
}

interface Package {
    id: number;
    name: string;
}

interface EditModalState {
    isOpen: boolean;
    customer: Customer | null;
    formData: {
        name: string;
        lat: string;
        lng: string;
        odp_id: string;
        package_id: string;
        status: 'active' | 'inactive' | 'suspended';
        phone_number: string;
        ip_address: string;
    };
}

type SortConfig = {
    key: keyof Customer;
    direction: 'asc' | 'desc';
} | null;

export default function ManajemenUserIndex(props: { auth: any; customers?: Customer[]; odps?: ODP[]; packages?: Package[] }) {
    const [customers, setCustomers] = useState<Customer[]>(Array.isArray(props.customers) ? props.customers : []);
    const [odps, setODPs] = useState<ODP[]>(Array.isArray(props.odps) ? props.odps : []);
    const [packages, setPackages] = useState<Package[]>(Array.isArray(props.packages) ? props.packages : []);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterODP, setFilterODP] = useState('all');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // --- State Pagination & Sorting ---
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const itemsPerPage = 10;

    const [editModal, setEditModal] = useState<EditModalState>({
        isOpen: false,
        customer: null,
        formData: {
            name: '',
            lat: '',
            lng: '',
            odp_id: '',
            package_id: '',
            status: 'active',
            phone_number: '',
            ip_address: '',
        },
    });

    // Reset halaman ke 1 jika filter/pencarian berubah
    useEffect(() => {
        setCurrentPage(1);
        fetchCustomers();
    }, [searchQuery, filterStatus, filterODP]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/user-list', {
                params: {
                    search: searchQuery,
                    status: filterStatus,
                    odp_id: filterODP,
                },
            });
            const data = response.data?.data || response.data || [];
            const customersArray = Array.isArray(data) ? data : [];
            setCustomers(customersArray.filter(customer => customer && customer.id));
        } catch (error) {
            console.error('Error fetching customers:', error);
            alert('Gagal mengambil data customer');
        } finally {
            setLoading(false);
        }
    };

    const syncCustomerStatus = async () => {
        try {
            setSyncing(true);
            const response = await axios.post('/api/customer-sync/sync');
            const result = response.data?.data || {};

            const message = `Sinkronisasi berhasil!\n\nTotal Customer: ${result.total_customers}\nDi-update: ${result.updated}\nDi-suspend: ${result.suspended}\nAda status aktif: ${result.activated}\nTidak ditemukan: ${result.not_found}`;
            alert(message);

            await fetchCustomers();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal melakukan sinkronisasi';
            alert(message);
            console.error('Error syncing customer status:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleUpdateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal.customer) return;

        try {
            const payload = {
                name: editModal.formData.name,
                lat: parseFloat(editModal.formData.lat),
                lng: parseFloat(editModal.formData.lng),
                odp_id: parseInt(editModal.formData.odp_id),
                package_id: editModal.formData.package_id ? parseInt(editModal.formData.package_id) : null,
                status: editModal.formData.status,
                phone_number: editModal.formData.phone_number,
                ip_address: editModal.formData.ip_address,
            };

            const response = await axios.put(`/api/user/${editModal.customer.id}`, payload);
            setCustomers(customers.map(c => c.id === editModal.customer!.id ? response.data.data : c));
            resetEditModal();
            alert('Customer berhasil diperbarui');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal memperbarui customer';
            alert(message);
        }
    };

    const handleDeleteCustomer = async (id: number) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus customer ini?')) return;

        try {
            await axios.delete(`/api/user/${id}`);
            setCustomers(customers.filter(c => c.id !== id));
            alert('Customer berhasil dihapus');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal menghapus customer';
            alert(message);
        }
    };

    const resetEditModal = () => {
        setEditModal({
            isOpen: false,
            customer: null,
            formData: {
                name: '',
                lat: '',
                lng: '',
                odp_id: '',
                package_id: '',
                status: 'active',
                phone_number: '',
                ip_address: '',
            },
        });
    };

    const openEditModal = (customer: Customer) => {
        setEditModal({
            isOpen: true,
            customer,
            formData: {
                name: customer.name,
                lat: customer.lat.toString(),
                lng: customer.lng.toString(),
                odp_id: customer.odp_id.toString(),
                package_id: customer.package_id?.toString() || '',
                status: customer.status,
                phone_number: customer.phone_number || '',
                ip_address: customer.ip_address,
            },
        });
    };

    const handleEditLocationSelect = (lat: number, lng: number) => {
        setEditModal((prev) => ({
            ...prev,
            formData: {
                ...prev.formData,
                lat: lat.toString(),
                lng: lng.toString(),
            },
        }));
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'inactive': return 'bg-gray-100 text-gray-800';
            case 'suspended': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Aktif';
            case 'inactive': return 'Non-Aktif';
            case 'suspended': return 'Suspended';
            default: return status;
        }
    };

    const handleCreateModalClose = () => {
        setIsCreateModalOpen(false);
    };

    // --- Fungsi Sort ---
    const handleSort = (key: keyof Customer) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- Pemrosesan Data (Sort & Paginasi) ---
    const processedData = useMemo(() => {
        let sortableItems = [...customers];

        // Eksekusi Sorting
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (aValue === null || aValue === undefined) aValue = '';
                if (bValue === null || bValue === undefined) bValue = '';

                // Logika khusus untuk IP Address agar terbaca sebagai angka
                if (sortConfig.key === 'ip_address') {
                    const ipA = String(aValue).split('.').map(num => num.padStart(3, '0')).join('');
                    const ipB = String(bValue).split('.').map(num => num.padStart(3, '0')).join('');
                    return sortConfig.direction === 'asc' ? ipA.localeCompare(ipB) : ipB.localeCompare(ipA);
                }

                // Logika string/angka default
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [customers, sortConfig]);

    // Eksekusi Paginasi
    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedCustomers = processedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const SortIcon = ({ columnKey }: { columnKey: keyof Customer }) => {
        if (sortConfig?.key !== columnKey) return <span className="ml-1 text-gray-300">↕</span>;
        return <span className="ml-1 text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Manajemen User</h2>}
        >
            <Head title="Manajemen User" />

            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={handleCreateModalClose}
                onSuccess={fetchCustomers}
                odps={odps}
                packages={packages}
            />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Daftar Customer</h3>
                            <p className="text-sm text-gray-600 mt-1">Total: {customers.length} Customer</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Tambah Customer
                            </button>
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="mb-6 bg-white shadow-sm rounded-lg p-4 space-y-4">
                        <div className="flex gap-4 flex-col md:flex-row">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cari Customer</label>
                                <input
                                    type="text"
                                    placeholder="Cari berdasarkan nama, ODP, atau IP address ..."
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
                                    <option value="active">Aktif</option>
                                    <option value="inactive">Non-Aktif</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ODP</label>
                                <select
                                    value={filterODP}
                                    onChange={(e) => setFilterODP(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Semua ODP</option>
                                    {odps.map((odp) => (
                                        <option key={odp.id} value={odp.id}>
                                            {odp.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterStatus('all');
                                        setFilterODP('all');
                                        setCurrentPage(1);
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
                            <p className="text-gray-600 mt-4">Memuat data customer...</p>
                        </div>
                    ) : (
                        <div className="bg-white shadow-sm sm:rounded-lg">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th
                                                onClick={() => handleSort('id')}
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                            >
                                                ID <SortIcon columnKey="id" />
                                            </th>
                                            <th
                                                onClick={() => handleSort('name')}
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                            >
                                                Nama <SortIcon columnKey="name" />
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ODP</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Telpon</th>
                                            <th
                                                onClick={() => handleSort('ip_address')}
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                            >
                                                IP Address <SortIcon columnKey="ip_address" />
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedCustomers.map((customer) => (
                                            <tr key={customer.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.name || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <a
                                                        href={`https://maps.google.com/?q=$${customer.lat},${customer.lng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-900 hover:underline"
                                                    >
                                                        Lihat
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.odp?.name || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(customer.status)}`}>
                                                        {getStatusLabel(customer.status)}
                                                    </span>
                                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${customer.is_isolated === 'yes' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                        {customer.is_isolated === 'yes' ? 'Isolir' : 'Tidak Isolir'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.package?.name || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.phone_number || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono text-xs">{customer.ip_address}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(customer)}
                                                        className="text-blue-600 hover:text-blue-900 font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCustomer(customer.id)}
                                                        className="text-red-600 hover:text-red-900 font-medium"
                                                    >
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(!paginatedCustomers || paginatedCustomers.length === 0) && (
                                    <div className="px-6 py-12 text-center text-gray-500">
                                        Tidak ada data customer yang tersedia
                                    </div>
                                )}
                            </div>

                            {/* Komponen Paginasi */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                                    <div className="text-sm text-gray-700">
                                        Menampilkan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-medium">{Math.min(currentPage * itemsPerPage, processedData.length)}</span> dari <span className="font-medium">{processedData.length}</span> hasil
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Sebelumnya
                                        </button>
                                        <div className="flex space-x-1">
                                            {[...Array(totalPages)].map((_, i) => (
                                                <button
                                                    key={i + 1}
                                                    onClick={() => setCurrentPage(i + 1)}
                                                    className={`px-3 py-1 rounded-md ${currentPage === i + 1
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Selanjutnya
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Edit (Tidak diubah, tetap sama) */}
            {editModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Edit Customer</h3>
                        <form onSubmit={handleUpdateCustomer} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nama Customer"
                                value={editModal.formData.name}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, name: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Lokasi Customer (Pilih dari Peta)
                                </label>
                                <MapLocationSelector
                                    onLocationSelect={handleEditLocationSelect}
                                    initialLat={parseFloat(editModal.formData.lat)}
                                    initialLng={parseFloat(editModal.formData.lng)}
                                />
                            </div>
                            <select
                                value={editModal.formData.odp_id}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, odp_id: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Pilih ODP</option>
                                {odps.map((odp) => (
                                    <option key={odp.id} value={odp.id}>
                                        {odp.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={editModal.formData.package_id}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, package_id: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Pilih Package (Opsional)</option>
                                {packages.map((pkg) => (
                                    <option key={pkg.id} value={pkg.id}>
                                        {pkg.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={editModal.formData.status}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, status: e.target.value as any }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="inactive">Non-Aktif</option>
                                <option value="suspended">Suspended</option>
                            </select>
                            <input
                                type="tel"
                                placeholder="Nomor Telepon (Opsional)"
                                value={editModal.formData.phone_number}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, phone_number: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="text"
                                placeholder="IP Address"
                                value={editModal.formData.ip_address}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, ip_address: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex gap-2 justify-end pt-4">
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
        </AuthenticatedLayout>
    );
}