import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
    resources: any;
    interfaces: any[];
    ethernetInterfaces?: any[];
    error?: string;
}

interface BandwidthData {
    time: string;
    rx: number;
    tx: number;
}

export default function MikrotikIndex({ resources: initialResources, interfaces: initialInterfaces, ethernetInterfaces: initialEthernetInterfaces = [], error: initialError }: Props) {
    const [resources, setResources] = useState(initialResources);
    const [interfaces, setInterfaces] = useState(initialInterfaces);
    const [ethernetInterfaces, setEthernetInterfaces] = useState(initialEthernetInterfaces);
    const [error, setError] = useState(initialError);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [selectedInterface, setSelectedInterface] = useState(initialEthernetInterfaces?.[0]?.name || '');
    const [bandwidthData, setBandwidthData] = useState<BandwidthData[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(route('mikrotik.getResourcesApi'));
                if (!response.ok) throw new Error('Failed to fetch data');
                const data = await response.json();
                setResources(data.resources);
                setInterfaces(data.interfaces);
                setEthernetInterfaces(data.ethernetInterfaces || []);
                
                // Set selected interface jika belum dipilih
                if (!selectedInterface && data.ethernetInterfaces?.length > 0) {
                    setSelectedInterface(data.ethernetInterfaces[0].name);
                }
                
                setError(undefined);
                setLastUpdate(new Date());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Gagal mengambil data');
            } finally {
                setIsLoading(false);
            }
        };

        // Fetch immediately on mount
        fetchData();

        // Set up interval for polling every 5 seconds
        const interval = setInterval(fetchData, 5000);

        return () => clearInterval(interval);
    }, []);

    // Update bandwidth data setiap kali interface berubah atau data diperbarui
    useEffect(() => {
        if (selectedInterface) {
            const iface = interfaces.find(i => i.name === selectedInterface);
            if (iface) {
                const rxBytes = parseInt(iface['rx-byte']) || 0;
                const txBytes = parseInt(iface['tx-byte']) || 0;
                
                // Konversi ke Mbps
                const rxMbps = (rxBytes * 8) / 1000000;
                const txMbps = (txBytes * 8) / 1000000;
                
                setBandwidthData(prev => {
                    const newData = [...prev, {
                        time: new Date().toLocaleTimeString('id-ID'),
                        rx: Math.round(rxMbps * 100) / 100,
                        tx: Math.round(txMbps * 100) / 100,
                    }];
                    // Simpan maksimal 12 data point (1 menit dengan update setiap 5 detik)
                    return newData.slice(-12);
                });
            }
        }
    }, [lastUpdate, selectedInterface, interfaces]);
    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold">Resource Monitor - Mikrolop</h2>}
        >
            <Head title="Resource" />

            <div className="py-12 px-4 max-w-7xl mx-auto space-y-6">
                {error && <div className="bg-red-500 text-white p-4 rounded">{error}</div>}

                {/* Update Status */}
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                    <span className="text-gray-700">🔄 Pembaruan otomatis setiap 5 detik</span>
                    <span className="text-gray-600">
                        {isLoading ? '⏳ Mengambil data...' : `✓ Terakhir update: ${lastUpdate.toLocaleTimeString('id-ID')}`}
                    </span>
                </div>

                {/* Bandwidth Graph Section */}
                {ethernetInterfaces.length > 0 && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Pilih Interface Ethernet:
                            </label>
                            <select
                                value={selectedInterface}
                                onChange={(e) => setSelectedInterface(e.target.value)}
                                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {ethernetInterfaces.map((iface) => (
                                    <option key={iface.name} value={iface.name}>
                                        {iface.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {bandwidthData.length > 0 ? (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bandwidth Usage</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={bandwidthData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="time" 
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis 
                                            label={{ value: 'Mbps', angle: -90, position: 'insideLeft' }}
                                        />
                                        <Tooltip formatter={(value) => [`${value} Mbps`, '']} />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="rx"
                                            stroke="#3b82f6"
                                            dot={false}
                                            name="RX (Download)"
                                            strokeWidth={2}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="tx"
                                            stroke="#ef4444"
                                            dot={false}
                                            name="TX (Upload)"
                                            strokeWidth={2}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">Mengumpulkan data bandwidth...</p>
                        )}
                    </div>
                )}

                {/* Card Resource */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 shadow rounded-lg">
                        <h3 className="text-gray-500">CPU Load</h3>
                        <p className="text-2xl font-bold">{resources['cpu-load']}%</p>
                    </div>
                    <div className="bg-white p-6 shadow rounded-lg">
                        <h3 className="text-gray-500">Uptime</h3>
                        <p className="text-2xl font-bold">{resources['uptime']}</p>
                    </div>
                    <div className="bg-white p-6 shadow rounded-lg">
                        <h3 className="text-gray-500">Model</h3>
                        <p className="text-2xl font-bold">{resources['board-name']}</p>
                    </div>
                </div>

                {/* Tabel Interface */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Running</th>
                            </tr>
                        </thead>
                        <tbody>
                            {interfaces.map((iface, idx) => (
                                <tr key={idx} className="border-t">
                                    <td className="p-4">{iface.name}</td>
                                    <td className="p-4">{iface.type}</td>
                                    <td className="p-4">
                                        {iface.running === 'true' ? '✅' : '❌'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}