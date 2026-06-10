import Authenticated from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

interface Payment {
    id: number;
    invoice_number: string;
    customer_name: string;
    amount: number;
    payment_method: string;
    status: string;
    created_at: string;
}

// 1. Define the shape of your actual props object
interface PageProps {
    payments: Payment[]; 
    // auth?: any; // (Inertia often passes an auth object too)
}

// 2. Destructure 'payments' from the props object
export default function History({ payments }: PageProps) {
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
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {/* Table Headers */}
                                        {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th> */}
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {/* 3. Map over the destructured array instead of 'props' */}
                                    {payments && payments.map((payment) => (
                                        <tr key={payment.id}>
                                            {/* <td className="px-6 py-4 whitespace-nowrap">{payment.invoice_number}</td> */}
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.customer_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.amount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.payment_method}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.status}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.created_at}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </Authenticated>
    );
}