import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BandwidthData {
    name: string;
    rx_bps: number;
    tx_bps: number;
    rx_kbps: number;
    tx_kbps: number;
    rx_mbps: number;
    tx_mbps: number;
    rx_formatted: string;
    tx_formatted: string;
    rx_bytes: number;
    tx_bytes: number;
    rx_errors: number;
    tx_errors: number;
    timestamp: string;
    error?: string;
}

interface InterfaceBandwidth {
    [key: string]: BandwidthData;
}

interface BandwidthChartProps {
    interfaces?: string[];
    refreshInterval?: number;
    chartType?: 'bar' | 'line';
    height?: number;
}

/**
 * BandwidthChart Component
 * Menampilkan grafik TX/RX Rate (kecepatan) dari interface Mikrotik
 * 
 * @param interfaces - Array nama interface yang akan dimonitor (default: ['ether1', 'ether2'])
 * @param refreshInterval - Interval refresh data dalam ms (default: 5000)
 * @param chartType - Tipe grafik 'bar' atau 'line' (default: 'bar')
 * @param height - Tinggi grafik dalam px (default: 300)
 */
export default function BandwidthChart({
    interfaces = ['ether1', 'ether2'],
    refreshInterval = 5000,
    chartType = 'bar',
    height = 300,
}: BandwidthChartProps) {
    const [bandwidthData, setBandwidthData] = useState<InterfaceBandwidth>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);

    // Fetch bandwidth data
    const fetchBandwidth = async () => {
        try {
            const params = new URLSearchParams();
            interfaces.forEach(iface => {
                params.append('interfaces[]', iface);
            });

            const response = await axios.get('/api/mikrotik/bandwidth', { params });

            if (response.data.success) {
                const data = response.data.data;
                setBandwidthData(data);
                setError(null);

                // Format data untuk chart - gunakan Mbps untuk display yang lebih readable
                const chartDataArray = Object.entries(data).map(([key, value]: [string, any]) => ({
                    name: value.name,
                    rx_mbps: value.rx_mbps || 0,
                    tx_mbps: value.tx_mbps || 0,
                    rx_kbps: value.rx_kbps || 0,
                    tx_kbps: value.tx_kbps || 0,
                    rx_bps: value.rx_bps || 0,
                    tx_bps: value.tx_bps || 0,
                    rx_formatted: value.rx_formatted || '0 bps',
                    tx_formatted: value.tx_formatted || '0 bps',
                }));

                setChartData(chartDataArray);
            } else {
                setError(response.data.error || 'Gagal mengambil data bandwidth');
            }
        } catch (err: any) {
            console.error('Error fetching bandwidth:', err);
            setError(err.response?.data?.error || 'Error mengambil data bandwidth');
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch dan setup interval
    useEffect(() => {
        fetchBandwidth();
        const interval = setInterval(fetchBandwidth, refreshInterval);

        return () => clearInterval(interval);
    }, [interfaces, refreshInterval]);

    // Render loading state
    if (isLoading && chartData.length === 0) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Render error state
    if (error && chartData.length === 0) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm"><strong>Error:</strong> {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header dengan info */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-700">Monitoring Bandwidth Interface (Rate)</h3>
                <button
                    onClick={fetchBandwidth}
                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
                    disabled={isLoading}
                >
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Chart Container */}
            <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200">
                <ResponsiveContainer width="100%" height={height}>
                    {chartType === 'bar' ? (
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                label={{ value: 'Interface', position: 'insideBottomRight', offset: -10 }}
                            />
                            <YAxis
                                label={{ value: 'Rate (Mbps)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                                formatter={(value: any, name: string) => {
                                    if (name === 'rx_mbps') return [(parseFloat(value).toFixed(2)), 'RX (Mbps)'];
                                    if (name === 'tx_mbps') return [(parseFloat(value).toFixed(2)), 'TX (Mbps)'];
                                    return [value, name];
                                }}
                                labelFormatter={(label) => `Interface: ${label}`}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => {
                                    if (value === 'rx_mbps') return 'RX (Mbps)';
                                    if (value === 'tx_mbps') return 'TX (Mbps)';
                                    return value;
                                }}
                            />
                            <Bar dataKey="rx_mbps" fill="#3b82f6" name="rx_mbps" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="tx_mbps" fill="#ef4444" name="tx_mbps" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    ) : (
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                label={{ value: 'Interface', position: 'insideBottomRight', offset: -10 }}
                            />
                            <YAxis
                                label={{ value: 'Rate (Mbps)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                                formatter={(value: any, name: string) => {
                                    if (name === 'rx_mbps') return [(parseFloat(value).toFixed(2)), 'RX (Mbps)'];
                                    if (name === 'tx_mbps') return [(parseFloat(value).toFixed(2)), 'TX (Mbps)'];
                                    return [value, name];
                                }}
                                labelFormatter={(label) => `Interface: ${label}`}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => {
                                    if (value === 'rx_mbps') return 'RX (Mbps)';
                                    if (value === 'tx_mbps') return 'TX (Mbps)';
                                    return value;
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="rx_mbps"
                                stroke="#3b82f6"
                                name="rx_mbps"
                                connectNulls
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="tx_mbps"
                                stroke="#ef4444"
                                name="tx_mbps"
                                connectNulls
                                strokeWidth={2}
                                dot={{ fill: '#ef4444', r: 4 }}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Data Summary */}
            {chartData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chartData.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-700 mb-3 capitalize">{item.name}</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">RX Rate:</span>
                                    <span className="font-mono font-medium text-blue-600">{item.rx_formatted}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">TX Rate:</span>
                                    <span className="font-mono font-medium text-red-600">{item.tx_formatted}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-300">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">RX (Mbps):</span>
                                        <span className="font-medium text-blue-700">{item.rx_mbps.toFixed(2)} Mbps</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">TX (Mbps):</span>
                                        <span className="font-medium text-red-700">{item.tx_mbps.toFixed(2)} Mbps</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error banner for individual interfaces */}
            {Object.entries(bandwidthData).map(([key, value]: [string, any]) => (
                value.error && (
                    <div key={key} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                        <p className="text-yellow-800">
                            <strong>{value.name}:</strong> {value.error}
                        </p>
                    </div>
                )
            ))}
        </div>
    );
}
