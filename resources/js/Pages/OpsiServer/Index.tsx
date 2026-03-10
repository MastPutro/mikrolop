import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import MapLocationViewer from '@/Components/User/MapLocationViewer';

interface ServerData {
    name: string;
    status: string;
    ip: string;
    used: string;
    capacity: string;
    lat: number;
    lng: number;
}

export default function OpsiServerIndex(PageProps: { server: ServerData }) {

    const [serverData, setServerData] = useState<ServerData>(PageProps.server);

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Opsi Server</h2>}
        >
            <Head title="Opsi Server" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="text-gray-600 w-full flex-initial">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Server Name
                                </label>
                                <input
                                    type="text"
                                    value={serverData.name}
                                    readOnly
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
                                    Server Status
                                </label>
                                <input
                                    type="text"
                                    value={serverData.status}
                                    readOnly
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
                                    Server IP
                                </label>
                                <input
                                    type="text"
                                    value={serverData.ip}
                                    readOnly
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
                                    Used
                                </label>
                                <input
                                    type="text"
                                    value={serverData.used + '/' + serverData.capacity}
                                    readOnly
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                                />
                            </div>
                            <div className="text-gray-600 w-full flex-initial">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Lokasi Server
                                </label>
                                <MapLocationViewer
                                    lat={serverData.lat}
                                    lng={serverData.lng}
                                />
                            </div>
                            <div>
                                
                            </div>
                        </div>
                        <div className='p-6 bg-white border-t border-gray-200 text-right'>
                            <button className="m-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                                Edit Server
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}