import Authenticated from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { useEffect, useState } from "react";

interface invoice {
    customer_name: string;
    customer_phone: string;
    amount: number;
    month: string;
    year: number;
    status: string;
    payment_method: string;
    paid_date: string;
}

export default function History(props: invoice) {
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
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Daftar Pembayaran</h3>
                        </div>
                        <div className="flex gap-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={props.status}
                                    onChange={() => { }}
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                    <option value="overdue">Overdue</option>
                                    <option value="canceled">Canceled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
                                <select
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={props.payment_method}
                                    onChange={() => { }}
                                >
                                    <option value="all">Semua Metode</option>
                                    <option value="transfer">Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                        </div>

                    </div>
                </div>
            </div>


        </Authenticated>
    );
}