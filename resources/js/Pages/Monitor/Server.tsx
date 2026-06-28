import Authenticated from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────
interface StatValues {
    last: number;
    min: number;
    avg: number;
    max: number;
}

interface InterfaceStats {
    rx: StatValues;
    tx: StatValues;
    rx_errors: StatValues;
    tx_errors: StatValues;
    rx_discards: StatValues;
    tx_discards: StatValues;
}

interface HistoryPoint {
    time: string;
    timestamp: string;
    rx_bps: number;
    tx_bps: number;
    rx_errors: number;
    tx_errors: number;
    rx_discards: number;
    tx_discards: number;
}

interface InterfaceData {
    name: string;
    type: string;
    history: HistoryPoint[];
    stats: InterfaceStats;
}

interface SystemInfo {
    board_name: string;
    uptime: string;
    cpu_load: number;
    sys_name: string;
}

// ─── Helpers ─────────────────────────────────────────────────────
const formatBps = (bps: number): string => {
    if (bps <= 0) return '0 bps';
    const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    let rate = bps;
    let i = 0;
    while (rate >= 1000 && i < units.length - 1) { rate /= 1000; i++; }
    return `${rate.toFixed(2)} ${units[i]}`;
};

const formatBpsShort = (bps: number): string => {
    if (bps <= 0) return '0';
    const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    let rate = bps;
    let i = 0;
    while (rate >= 1000 && i < units.length - 1) { rate /= 1000; i++; }
    return `${rate.toFixed(1)} ${units[i]}`;
};

// ─── Custom Tooltip ──────────────────────────────────────────────
const TrafficTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-300 rounded shadow-lg px-3 py-2 text-xs">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} style={{ color: entry.color }}>
                    {entry.name}: <span className="font-medium">{formatBps(entry.value)}</span>
                </p>
            ))}
        </div>
    );
};

// ─── Stats Table ─────────────────────────────────────────────────
const StatsTable = ({ stats, name }: { stats: InterfaceStats; name: string }) => {
    const rows = [
        { label: `Interface <${name}>(): Bits received`, color: '#4caf50', data: stats.rx, isBps: true },
        { label: `Interface <${name}>(): Bits sent`, color: '#ff5722', data: stats.tx, isBps: true },
        { label: `Interface <${name}>(): Outbound packets with errors`, color: '#ff5722', data: stats.tx_errors, isBps: false },
        { label: `Interface <${name}>(): Inbound packets with errors`, color: '#ff5722', data: stats.rx_errors, isBps: false },
        { label: `Interface <${name}>(): Outbound packets discarded`, color: '#ff5722', data: stats.tx_discards, isBps: false },
        { label: `Interface <${name}>(): Inbound packets discarded`, color: '#ff5722', data: stats.rx_discards, isBps: false },
    ];

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="text-left py-1 px-2 w-2/5"></th>
                        <th className="text-left py-1 px-2 w-[8%]"></th>
                        <th className="text-right py-1 px-2 font-semibold text-gray-600">last</th>
                        <th className="text-right py-1 px-2 font-semibold text-gray-600">min</th>
                        <th className="text-right py-1 px-2 font-semibold text-gray-600">avg</th>
                        <th className="text-right py-1 px-2 font-semibold text-gray-600">max</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-1 px-2">
                                <span className="inline-block w-3 h-2 mr-1.5 rounded-sm" style={{ backgroundColor: row.color }}></span>
                                <span className="text-gray-700">{row.label}</span>
                            </td>
                            <td className="py-1 px-2 text-gray-500">[avg]</td>
                            <td className="py-1 px-2 text-right font-mono text-gray-800">
                                {row.isBps ? formatBps(row.data.last) : row.data.last}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-gray-800">
                                {row.isBps ? formatBps(row.data.min) : row.data.min}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-gray-800">
                                {row.isBps ? formatBps(row.data.avg) : row.data.avg}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-gray-800">
                                {row.isBps ? formatBps(row.data.max) : row.data.max}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Interface Card ──────────────────────────────────────────────
const InterfaceCard = ({ iface, boardName }: { iface: InterfaceData; boardName: string }) => {
    // Calculate dynamic Y-axis domain
    const maxRx = Math.max(...iface.history.map(h => h.rx_bps), 1);
    const maxTx = Math.max(...iface.history.map(h => h.tx_bps), 1);
    const yMaxLeft = Math.max(maxTx, maxRx) * 1.15;

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-2.5">
                <h3 className="text-white text-sm font-medium tracking-wide">
                    {boardName}: Interface &lt;{iface.name}&gt;(): Network traffic
                </h3>
            </div>

            {/* Chart Area */}
            <div className="px-2 pt-3 pb-1" style={{ backgroundColor: '#fafafa' }}>
                {iface.history.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={iface.history} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                            <defs>
                                <linearGradient id={`rxGrad-${iface.name}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4caf50" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id={`txGrad-${iface.name}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff5722" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#ff5722" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 10, fill: '#666' }}
                                interval="preserveStartEnd"
                                angle={-45}
                                textAnchor="end"
                                height={50}
                            />
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 10, fill: '#666' }}
                                tickFormatter={(v: number) => formatBpsShort(v)}
                                domain={[0, yMaxLeft]}
                                width={65}
                            />
                            <Tooltip content={<TrafficTooltip />} />
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="rx_bps"
                                name="Bits received"
                                stroke="#4caf50"
                                strokeWidth={1.5}
                                fill={`url(#rxGrad-${iface.name})`}
                                dot={false}
                                activeDot={{ r: 3 }}
                            />
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="tx_bps"
                                name="Bits sent"
                                stroke="#ff5722"
                                strokeWidth={1.5}
                                fill={`url(#txGrad-${iface.name})`}
                                dot={false}
                                activeDot={{ r: 3 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
                        Belum ada data. Menunggu polling...
                    </div>
                )}
            </div>

            {/* Stats Table */}
            <div className="border-t border-gray-200 px-2 py-2 bg-white">
                <StatsTable stats={iface.stats} name={iface.name} />
            </div>
        </div>
    );
};

// ─── Main Page ───────────────────────────────────────────────────
export default function ServerMonitor() {
    const [activeTab, setActiveTab] = useState<'ethernet' | 'pppoe'>('ethernet');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [ethernet, setEthernet] = useState<InterfaceData[]>([]);
    const [pppoe, setPppoe] = useState<InterfaceData[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [countdown, setCountdown] = useState(60);
    const [searchQuery, setSearchQuery] = useState('');
    const [timeRange, setTimeRange] = useState(1440);

    const timeRangeOptions = [
        { value: 10, label: '10 Menit' },
        { value: 30, label: '30 Menit' },
        { value: 60, label: '1 Jam' },
        { value: 360, label: '6 Jam' },
        { value: 720, label: '12 Jam' },
        { value: 1440, label: '24 Jam' },
    ];

    const fetchData = useCallback(async () => {
        try {
            const response = await axios.get('/api/monitor/traffic-data', {
                params: { minutes: timeRange }
            });
            if (response.data.success) {
                setSystemInfo(response.data.data.system);
                setEthernet(response.data.data.ethernet);
                setPppoe(response.data.data.pppoe);
                setLastUpdated(new Date().toLocaleTimeString('id-ID'));
                setError(null);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal memuat data monitoring');
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    // Initial load + auto-refresh every 60s
    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            fetchData();
            setCountdown(60);
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 60));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter PPPoE interfaces by search query
    const filteredPppoe = searchQuery.trim()
        ? pppoe.filter(iface =>
            iface.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : pppoe;

    const tabs = [
        { id: 'ethernet' as const, label: 'Ethernet', count: ethernet.length, icon: '🔌' },
        { id: 'pppoe' as const, label: 'Client (PPPoE)', count: filteredPppoe.length, totalCount: pppoe.length, icon: '👤' },
    ];

    const currentInterfaces = activeTab === 'ethernet' ? ethernet : filteredPppoe;

    if (loading) {
        return (
            <Authenticated>
                <Head title="Monitor Server" />
                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="flex flex-col items-center justify-center min-h-[400px]">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                                <div className="w-12 h-12 border-4 border-gray-200 border-b-green-500 rounded-full animate-spin absolute top-2 left-2" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
                            </div>
                            <p className="mt-4 text-gray-500 animate-pulse">Memuat data monitoring...</p>
                        </div>
                    </div>
                </div>
            </Authenticated>
        );
    }

    return (
        <Authenticated
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Monitor Server
                    </h2>
                </div>
            }
        >
            <Head title="Monitor Server" />
            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">

                    {/* System Info Bar */}
                    {systemInfo && (
                        <div className="mb-6 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-xl shadow-lg p-5 text-white">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Device</p>
                                    <p className="font-semibold text-sm">{systemInfo.board_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Hostname</p>
                                    <p className="font-semibold text-sm">{systemInfo.sys_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Uptime</p>
                                    <p className="font-semibold text-sm">{systemInfo.uptime}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">CPU Load</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-600 rounded-full h-2.5 max-w-[120px]">
                                            <div
                                                className={`h-2.5 rounded-full transition-all duration-500 ${
                                                    systemInfo.cpu_load > 80 ? 'bg-red-500' :
                                                    systemInfo.cpu_load > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${Math.min(systemInfo.cpu_load, 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="font-semibold text-sm">{systemInfo.cpu_load}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status Bar */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span>Terakhir diperbarui: {lastUpdated || '-'}</span>
                            <span className="text-gray-300">|</span>
                            <span>Refresh dalam: <span className="font-mono font-medium text-gray-700">{countdown}s</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                                {timeRangeOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setTimeRange(opt.value)}
                                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                            timeRange === opt.value
                                                ? 'bg-white text-blue-700 shadow-sm border border-gray-200'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => { fetchData(); setCountdown(60); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-red-700">{error}</span>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="mb-6">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex gap-1">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                                            activeTab === tab.id
                                                ? 'bg-white text-blue-600 border border-b-white border-gray-200 -mb-px shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
                                        }`}
                                    >
                                        <span>{tab.icon}</span>
                                        <span>{tab.label}</span>
                                        <span className={`ml-1 px-2 py-0.5 text-xs rounded-full font-semibold ${
                                            activeTab === tab.id
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {tab.count}{tab.totalCount !== undefined && tab.count !== tab.totalCount ? `/${tab.totalCount}` : ''}
                                        </span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Search Bar (PPPoE only) */}
                    {activeTab === 'pppoe' && (
                        <div className="mb-5">
                            <div className="relative max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari pelanggan PPPoE..."
                                    className="block w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder-gray-400"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {searchQuery && (
                                <p className="mt-1.5 text-xs text-gray-500">
                                    Menampilkan {filteredPppoe.length} dari {pppoe.length} interface
                                </p>
                            )}
                        </div>
                    )}

                    {/* Interface Cards Grid */}
                    {currentInterfaces.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {currentInterfaces.map(iface => (
                                <InterfaceCard
                                    key={iface.name}
                                    iface={iface}
                                    boardName={systemInfo?.board_name || 'Mikrotik'}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-700 mb-1">
                                Belum ada data {activeTab === 'ethernet' ? 'Ethernet' : 'PPPoE'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                Data akan muncul setelah cron job <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">snmp:poll-traffic</code> berjalan.
                                <br />
                                Pastikan <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">php artisan schedule:work</code> sudah aktif.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Authenticated>
    );
}
