import React, { useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Types
interface Server {
    id: number;
    name: string;
    lat: number;
    lng: number;
    status: 'online' | 'offline' | 'warning';
    ip: string;
    capacity: number;
    used: number;
}

interface ODP {
    id: number;
    name: string;
    lat: number;
    lng: number;
    server_id?: number;
    serverId?: number;
    status: 'online' | 'offline';
    ports: number;
    used_ports?: number;
    usedPorts?: number;
    server?: Server;
}

interface Customer {
    id: number;
    name: string;
    lat: number;
    lng: number;
    odp_id?: number;
    odpId?: number;
    status: 'active' | 'inactive' | 'suspended';
    package: string;
    speed: string;
    router_mac?: string;
    routerMac?: string;
    odp?: ODP;
}

// Transform database data to component format
const transformServerData = (server: Server): Server => ({
    ...server,
    lat: parseFloat(server.lat as any),
    lng: parseFloat(server.lng as any),
});

const transformODPData = (odp: ODP): ODP => ({
    ...odp,
    lat: parseFloat(odp.lat as any),
    lng: parseFloat(odp.lng as any),
});

const transformCustomerData = (customer: Customer): Customer => ({
    ...customer,
    lat: parseFloat(customer.lat as any),
    lng: parseFloat(customer.lng as any),
});

interface Props {
    servers: Server[];
    odps: ODP[];
    customers: Customer[];
    stats: any;
    auth: any;
}

export default function CustomerGISMap(props: Props) {
    const mapRef = useRef<L.Map | null>(null);
    const [servers, setServers] = useState<Server[]>(props.servers || []);
    const [odps, setOdps] = useState<ODP[]>(props.odps || []);
    const [customers, setCustomers] = useState<Customer[]>(props.customers || []);
    const [stats, setStats] = useState<any>(props.stats || {});
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [filter, setFilter] = useState<'all' | 'server' | 'odp' | 'customer'>('all');
    const [showTopology, setShowTopology] = useState(true);
    const [loading, setLoading] = useState(false);

    // Fetch real-time data from API
    const fetchData = async () => {
        try {
            const response = await axios.get('/api/gis/data');
            const { servers: fetchedServers, odps: fetchedOdps, customers: fetchedCustomers } = response.data;
            
            setServers(fetchedServers.map(transformServerData));
            setOdps(fetchedOdps.map(transformODPData));
            setCustomers(fetchedCustomers.map(transformCustomerData));
        } catch (error) {
            console.error('Error fetching GIS data:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get('/api/gis/statistics');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    // Load data on mount
    useEffect(() => {
        fetchData();
        fetchStats();

        // Refresh data every 30 seconds
        const interval = setInterval(() => {
            fetchData();
            fetchStats();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!mapRef.current) {
            // Initialize map
            const map = L.map('map', {
                center: [-7.47, 112.56],
                zoom: 13,
                zoomControl: false,
            });

            // Add tile layer with dark theme
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
                maxZoom: 19,
            }).addTo(map);

            // Add zoom control on top right
            L.control.zoom({ position: 'topright' }).addTo(map);

            mapRef.current = map;
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);;

    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;
        
        // Clear existing layers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });

        // Custom icons
        const serverIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="server-marker">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#10b981" opacity="0.2"/>
                    <circle cx="20" cy="20" r="12" fill="#10b981"/>
                    <rect x="15" y="16" width="10" height="2" fill="white"/>
                    <rect x="15" y="20" width="10" height="2" fill="white"/>
                    <rect x="15" y="24" width="10" height="2" fill="white"/>
                </svg>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });

        const odpIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="odp-marker">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="14" fill="#3b82f6" opacity="0.2"/>
                    <circle cx="16" cy="16" r="10" fill="#3b82f6"/>
                    <circle cx="16" cy="16" r="3" fill="white"/>
                </svg>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });

        const customerIcon = (status: string) => L.divIcon({
            className: 'custom-marker',
            html: `<div class="customer-marker">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="${status === 'active' ? '#22c55e' : status === 'suspended' ? '#ef4444' : '#94a3b8'}" opacity="0.3"/>
                    <circle cx="12" cy="12" r="6" fill="${status === 'active' ? '#22c55e' : status === 'suspended' ? '#ef4444' : '#94a3b8'}"/>
                </svg>
            </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });
        // Draw topology lines
        if (showTopology) {
            // Server to ODP lines
            odps.forEach((odp: any) => {
                const server = servers.find(s => s.id === (odp.serverId || odp.server_id));
                if (server && (filter === 'all' || filter === 'server' || filter === 'odp')) {
                    L.polyline(
                        [[server.lat, server.lng], [odp.lat, odp.lng]],
                        { 
                            color: '#3b82f6', 
                            weight: 2, 
                            opacity: 0.6,
                            dashArray: '5, 5'
                        }
                    ).addTo(map);
                }
            });

            // ODP to Customer lines
            customers.forEach((customer: any) => {
                const odpId = customer.odpId || customer.odp_id;
                const odp = odps.find(o => o.id === odpId);
                if (odp && (filter === 'all' || filter === 'odp' || filter === 'customer')) {
                    L.polyline(
                        [[odp.lat, odp.lng], [customer.lat, customer.lng]],
                        { 
                            color: customer.status === 'active' ? '#22c55e' : '#ef4444', 
                            weight: 1.5, 
                            opacity: 0.4 
                        }
                    ).addTo(map);
                }
            });
        }

        // Add server markers
        if (filter === 'all' || filter === 'server') {
            servers.forEach(server => {
                const marker = L.marker([server.lat, server.lng], { icon: serverIcon })
                    .addTo(map)
                    .on('click', () => setSelectedNode({ type: 'server', data: server }));
            });
        }

        // Add ODP markers
        if (filter === 'all' || filter === 'odp') {
            odps.forEach(odp => {
                const marker = L.marker([odp.lat, odp.lng], { icon: odpIcon })
                    .addTo(map)
                    .on('click', () => setSelectedNode({ type: 'odp', data: odp }));
            });
        }

        // Add customer markers
        if (filter === 'all' || filter === 'customer') {
            customers.forEach(customer => {
                const marker = L.marker([customer.lat, customer.lng], { 
                    icon: customerIcon(customer.status) 
                })
                    .addTo(map)
                    .on('click', () => setSelectedNode({ type: 'customer', data: customer }));
            });
        }

    }, [filter, showTopology, servers, odps, customers]);

    // Calculate stats from current data
    const calculateStats = () => {
        const activeCustomers = customers.filter(c => c.status === 'active').length;
        const totalODPs = odps.length;
        const usedPorts = odps.reduce((sum, odp: any) => sum + (odp.usedPorts || odp.used_ports || 0), 0);
        const totalPorts = odps.reduce((sum, odp: any) => sum + (odp.ports || 0), 0);
        const avgODPUsage = totalPorts > 0 ? (usedPorts / totalPorts * 100).toFixed(1) : 0;
        
        return { activeCustomers, totalODPs, avgODPUsage };
    };

    const displayStats = calculateStats();

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        Network Topology GIS
                    </h2>
                    <div className="flex gap-3">
                        <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                            <div className="text-xs text-emerald-300 uppercase tracking-wider">Active</div>
                            <div className="text-xl font-bold text-emerald-400">{displayStats.activeCustomers}</div>
                        </div>
                        <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                            <div className="text-xs text-blue-300 uppercase tracking-wider">ODPs</div>
                            <div className="text-xl font-bold text-blue-400">{displayStats.totalODPs}</div>
                        </div>
                        <div className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                            <div className="text-xs text-purple-300 uppercase tracking-wider">Avg Usage</div>
                            <div className="text-xl font-bold text-purple-400">{displayStats.avgODPUsage}%</div>
                        </div>
                    </div>
                </div>
            }
        >
            <Head title="Customer GIS Map" />

            <style>{`
                body, #app {
                    background: #0a0a0a;
                    margin: 0;
                    padding: 0;
                }
                
                .custom-marker {
                    background: transparent;
                    border: none;
                }
                
                .server-marker, .odp-marker, .customer-marker {
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                
                .server-marker:hover, .odp-marker:hover, .customer-marker:hover {
                    transform: scale(1.2);
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .animate-pulse-slow {
                    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .slide-in {
                    animation: slideIn 0.3s ease-out;
                }

                .scrollbar-thin::-webkit-scrollbar {
                    width: 6px;
                }

                .scrollbar-thin::-webkit-scrollbar-track {
                    background: #1a1a1a;
                }

                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 3px;
                }

                .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: #444;
                }
            `}</style>

            <div className="relative h-screen bg-black">
                {/* Map Container */}
                <div id="map" className="absolute inset-0 z-0"></div>

                {/* Control Panel */}
                <div className="absolute top-6 left-6 z-10 space-y-4">
                    {/* Filter Controls */}
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-4 shadow-2xl">
                        <div className="text-xs text-zinc-400 uppercase tracking-wider mb-3 font-semibold">Display Filter</div>
                        <div className="flex flex-col gap-2">
                            {[
                                { value: 'all', label: 'All Nodes', color: 'zinc' },
                                { value: 'server', label: 'Servers', color: 'emerald' },
                                { value: 'odp', label: 'ODPs', color: 'blue' },
                                { value: 'customer', label: 'Customers', color: 'green' }
                            ].map(item => (
                                <button
                                    key={item.value}
                                    onClick={() => setFilter(item.value as any)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        filter === item.value
                                            ? `bg-${item.color}-500 text-white shadow-lg shadow-${item.color}-500/50`
                                            : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Topology Toggle */}
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-4 shadow-2xl">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showTopology}
                                onChange={(e) => setShowTopology(e.target.checked)}
                                className="w-5 h-5 rounded bg-zinc-800 border-zinc-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                            />
                            <span className="text-sm font-medium text-zinc-300">Show Topology Lines</span>
                        </label>
                    </div>

                    {/* Legend */}
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-4 shadow-2xl">
                        <div className="text-xs text-zinc-400 uppercase tracking-wider mb-3 font-semibold">Legend</div>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                                <span className="text-zinc-300">Core Server</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                                <span className="text-zinc-300">ODP</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                                <span className="text-zinc-300">Active Customer</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                <span className="text-zinc-300">Suspended</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detail Panel */}
                {selectedNode && (
                    <div className="absolute top-6 right-6 w-96 z-10 slide-in">
                        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className={`p-6 ${
                                selectedNode.type === 'server' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' :
                                selectedNode.type === 'odp' ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                                'bg-gradient-to-r from-green-600 to-green-700'
                            }`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-xs text-white/70 uppercase tracking-wider mb-1">
                                            {selectedNode.type === 'server' ? 'Core Server' :
                                             selectedNode.type === 'odp' ? 'Optical Distribution Point' :
                                             'Customer Router'}
                                        </div>
                                        <h3 className="text-xl font-bold text-white">
                                            {selectedNode.data.name}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setSelectedNode(null)}
                                        className="text-white/80 hover:text-white transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 max-h-96 overflow-y-auto scrollbar-thin">
                                {selectedNode.type === 'server' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                            <span className="text-sm text-zinc-400">Status</span>
                                            <span className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow"></div>
                                                <span className="text-sm font-semibold text-emerald-400 uppercase">
                                                    {selectedNode.data.status}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-1">IP Address</div>
                                            <div className="text-base font-mono text-white">{selectedNode.data.ip}</div>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-2">Capacity Usage</div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
                                                        style={{ width: `${(selectedNode.data.used / selectedNode.data.capacity) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-semibold text-white">
                                                    {((selectedNode.data.used / selectedNode.data.capacity) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs text-zinc-500">
                                                {selectedNode.data.used} / {selectedNode.data.capacity} connections
                                            </div>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-1">Coordinates</div>
                                            <div className="text-xs font-mono text-zinc-300">
                                                {selectedNode.data.lat.toFixed(6)}, {selectedNode.data.lng.toFixed(6)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedNode.type === 'odp' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                            <span className="text-sm text-zinc-400">Status</span>
                                            <span className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-slow"></div>
                                                <span className="text-sm font-semibold text-blue-400 uppercase">
                                                    {selectedNode.data.status}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-1">Connected to</div>
                                            <div className="text-base font-semibold text-white">
                                                {servers.find(s => s.id === (selectedNode.data.serverId || selectedNode.data.server_id))?.name}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-2">Port Usage</div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                                                        style={{ width: `${((selectedNode.data.usedPorts || selectedNode.data.used_ports) / selectedNode.data.ports) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-semibold text-white">
                                                    {(((selectedNode.data.usedPorts || selectedNode.data.used_ports) / selectedNode.data.ports) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs text-zinc-500">
                                                {selectedNode.data.usedPorts || selectedNode.data.used_ports} / {selectedNode.data.ports} ports used
                                            </div>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-2">Connected Customers</div>
                                            <div className="text-2xl font-bold text-white">
                                                {customers.filter(c => (c.odpId || c.odp_id) === selectedNode.data.id).length}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedNode.type === 'customer' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                            <span className="text-sm text-zinc-400">Status</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                                                selectedNode.data.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                selectedNode.data.status === 'suspended' ? 'bg-red-500/20 text-red-400' :
                                                'bg-zinc-500/20 text-zinc-400'
                                            }`}>
                                                {selectedNode.data.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-zinc-800/50 rounded-lg">
                                                <div className="text-xs text-zinc-400 mb-1">Package</div>
                                                <div className="text-sm font-semibold text-white">{selectedNode.data.package}</div>
                                            </div>
                                            <div className="p-3 bg-zinc-800/50 rounded-lg">
                                                <div className="text-xs text-zinc-400 mb-1">Speed</div>
                                                <div className="text-sm font-semibold text-white">{selectedNode.data.speed}</div>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-1">Connected to ODP</div>
                                            <div className="text-base font-semibold text-white">
                                                {odps.find(o => o.id === (selectedNode.data.odpId || selectedNode.data.odp_id))?.name}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-1">Router MAC</div>
                                            <div className="text-sm font-mono text-zinc-300">{selectedNode.data.routerMac}</div>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-1">Location</div>
                                            <div className="text-xs font-mono text-zinc-300">
                                                {selectedNode.data.lat.toFixed(6)}, {selectedNode.data.lng.toFixed(6)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}