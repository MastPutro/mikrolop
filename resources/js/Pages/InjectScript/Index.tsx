import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface PrntInterface {
    id: number;
    name: string;
}

export default function InjectScriptIndex(props: { interfaces: PrntInterface[] }) {
    const [interfaces, setInterfaces] = useState<PrntInterface[]>([]);

    
    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Inject Script</h2>}
        >
            <Head title="Inject Script" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <h3 className="text-2xl font-bold mb-4">Policy Base Routing</h3>
                            <div className="mb-4">
                                <label htmlFor="interface" className="block text-sm font-medium text-gray-700 mb-1">Select Interface:</label>
                                <select className="border border-gray-300 rounded-md p-2 w-full mb-4">
                                    <option value="">Pilih Interface</option>
                                    {props.interfaces.map((iface) => (
                                        <option key={iface.id} value={iface.id}>{iface.name}</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">Select the applications you want to apply the policy to:</p>
                            <div className="mb-4 flex flex-wrap">
                                <span className="mr-4">
                                    <label htmlFor="tiktok" className="block text-sm font-medium text-gray-700 mb-1">Tiktok</label>
                                    <input type="checkbox" id="tiktok" name="tiktok" className="mr-2 leading-tight" />
                                </span>
                                <span className="mr-4">
                                    <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                                    <input type="checkbox" id="facebook" name="facebook" className="mr-2 leading-tight" />
                                </span>
                                <span className="mr-4">
                                    <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                                    <input type="checkbox" id="twitter" name="twitter" className="mr-2 leading-tight" />
                                </span>
                                <span className="mr-4">
                                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                                    <input type="checkbox" id="instagram" name="instagram" className="mr-2 leading-tight" />
                                </span>
                                <span className="mr-4">
                                    <label htmlFor="youtube" className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
                                    <input type="checkbox" id="youtube" name="youtube" className="mr-2 leading-tight" />
                                </span>
                                
                            </div>
                            <button className="bg-blue-500 text-white px-4 py-2 rounded-md">Apply Policy</button>
                        </div>
                        <div className="p-6 bg-white border-t border-gray-200">
                            <h3 className="text-2xl font-bold mb-4">Load Balance PCC</h3>
                            <span className='mr-4'>
                                <label htmlFor='ether1' className='block text-sm font-medium text-gray-700 mb-1'>ISP 1 :</label>
                                <select className='border border-gray-300 rounded-md p-2 w-full mb-4'>
                                    <option value=''>Pilih Interface</option>
                                    {props.interfaces.map((iface) => (
                                        <option key={iface.id} value={iface.id}>{iface.name}</option>
                                    ))}
                                </select>
                            </span>
                            <span className='mr-4'>
                                <label htmlFor='ether2' className='block text-sm font-medium text-gray-700 mb-1'>ISP 2 :</label>
                                <select className='border border-gray-300 rounded-md p-2 w-full mb-4'>
                                    <option value=''>Pilih Interface</option>
                                    {props.interfaces.map((iface) => (
                                        <option key={iface.id} value={iface.id}>{iface.name}</option>
                                    ))}
                                </select>
                            </span>
                            <button className='bg-green-500 text-white px-4 py-2 rounded-md'>Apply Load Balance</button>
                        </div>
                        <div className="p-6 bg-white border-t border-gray-200">
                            <h3 className="text-2xl font-bold mb-4">Pisah Trafik Game</h3>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}