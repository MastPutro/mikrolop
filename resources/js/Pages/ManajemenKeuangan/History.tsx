import Authenticated from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { useState, useMemo, useEffect } from "react";

interface Payment {
    id: number;
    invoice_number: string;
    customer_name: string;
    amount: number;
    payment_method: string;
    status: string;
    created_at: string;
}

interface PageProps {
    payments: Payment[];
    auth?: any;
}

export default function History({ payments }: PageProps) {
    // State untuk filter dan search
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // State untuk paginasi
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset ke halaman 1 setiap kali filter atau pencarian berubah
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, startDate, endDate]);

    // Proses filter data
    const filteredPayments = useMemo(() => {
        return payments.filter((payment) => {
            // Pencarian berdasarkan nama customer
            const matchSearch = payment.customer_name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

            // Filter berdasarkan tanggal
            const paymentDate = new Date(payment.created_at).setHours(0, 0, 0, 0);
            const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
            const end = endDate ? new Date(endDate).setHours(0, 0, 0, 0) : null;

            const matchStartDate = start ? paymentDate >= start : true;
            const matchEndDate = end ? paymentDate <= end : true;

            return matchSearch && matchStartDate && matchEndDate;
        });
    }, [payments, searchQuery, startDate, endDate]);

    // Proses paginasi
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const paginatedPayments = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPayments, currentPage]);

    return (
        <Authenticated
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    History Pembayaran
                </h2>
            }
        >
            <Head title="History Pembayaran" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">

                    {/* Bagian Filter & Search */}
                    <div className="mb-6 bg-white p-4 shadow-sm sm:rounded-lg flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="w-full md:w-1/3">
                            <input
                                type="text"
                                placeholder="Cari nama customer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto items-center">
                            <span className="text-sm text-gray-600">Dari:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                            />
                            <span className="text-sm text-gray-600">Sampai:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                            />
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setStartDate("");
                                    setEndDate("");
                                }}
                                className="ml-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Tabel Data */}
                    <div className="bg-white shadow-sm sm:rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedPayments.length > 0 ? (
                                    paginatedPayments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.customer_name}</td>
                                            {/* Anda bisa menambahkan format mata uang pada amount di sini */}
                                            <td className="px-6 py-4 whitespace-nowrap">Rp {payment.amount.toLocaleString('id-ID')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.payment_method}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.status}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(payment.created_at).toLocaleDateString('id-ID')}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                            Data tidak ditemukan
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Kontrol Paginasi */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex justify-between items-center bg-white p-4 shadow-sm sm:rounded-lg">
                            <span className="text-sm text-gray-700">
                                Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPayments.length)} dari {filteredPayments.length} data
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                                >
                                    Prev
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`px-4 py-2 border rounded-md ${currentPage === i + 1 ? "bg-indigo-600 text-white" : "hover:bg-gray-50"
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Authenticated>
    );
}