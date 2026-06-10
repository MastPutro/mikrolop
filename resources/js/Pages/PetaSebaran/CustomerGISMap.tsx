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
    parent_id?: number;
    parentId?: number;
    status: 'online' | 'offline';
    ports: number;
    used_ports?: number;
    usedPorts?: number;
    depth?: number;
    is_leaf?: boolean;
    root_server?: Server;
    parent_odp?: ODP;
    child_odps?: ODP[];
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
    const [snmpStats, setSnmpStats] = useState<any>(null);
    const [snmpLoading, setSnmpLoading] = useState(false);

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

    /**
     * Fetch SNMP statistics for selected customer on-demand
     * This includes TX/RX rates and bytes from MikroTik
     */
    const fetchCustomerSnmpStats = async (customerId: number) => {
        setSnmpLoading(true);
        setSnmpStats(null);
        
        try {
            const response = await axios.get(`/api/gis/customer/${customerId}/snmp-stats`);
            const { snmp_stats, debug } = response.data;
            
            setSnmpStats({
                ...snmp_stats,
                debug: debug // Store debug info if available
            });
            
            // Log for debugging
            console.log('SNMP Stats fetched:', snmp_stats);
            if (debug) {
                console.log('Debug Log:', debug);
            }
        } catch (error: any) {
            console.error('Error fetching SNMP stats:', error);
            
            // Extract error message from response or use default
            const errorMessage = error.response?.data?.message || 
                                error.response?.data?.error ||
                                error.message || 
                                'Failed to fetch SNMP data';
            
            setSnmpStats({
                error: true,
                message: errorMessage,
                details: error.response?.data
            });
        } finally {
            setSnmpLoading(false);
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

    // Fetch SNMP stats when customer is selected
    useEffect(() => {
        if (selectedNode?.type === 'customer' && selectedNode?.data?.id) {
            fetchCustomerSnmpStats(selectedNode.data.id);
        } else {
            // Reset SNMP stats if non-customer node is selected
            setSnmpStats(null);
        }
    }, [selectedNode?.data?.id, selectedNode?.type]);

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
            // Server to Root ODP lines (ODPs with server_id)
            odps.forEach((odp: any) => {
                const server = servers.find(s => s.id === (odp.serverId || odp.server_id));
                // Only draw Server→ODP for root ODPs (those with server_id)
                if (server && !odp.parent_id && !odp.parentId && (filter === 'all' || filter === 'server' || filter === 'odp')) {
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

            // Child ODP to Parent ODP lines (hierarchical ODP connections)
            odps.forEach((odp: any) => {
                const parentId = odp.parentId || odp.parent_id;
                if (parentId) {
                    const parentOdp = odps.find(o => o.id === parentId);
                    if (parentOdp && (filter === 'all' || filter === 'odp')) {
                        L.polyline(
                            [[parentOdp.lat, parentOdp.lng], [odp.lat, odp.lng]],
                            { 
                                color: '#3b82f6', 
                                weight: 1.5, 
                                opacity: 0.5,
                                dashArray: '5, 5'
                            }
                        ).addTo(map);
                    }
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
                                        
                                        {/* Hierarchy Information */}
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-1">Hierarchy Level</div>
                                            <div className="text-base font-semibold text-white">
                                                Depth: {selectedNode.data.depth || 0}
                                            </div>
                                        </div>

                                        {/* Connected To (Server or Parent ODP) */}
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-1">Connected to</div>
                                            {selectedNode.data.parent_id || selectedNode.data.parentId ? (
                                                <div>
                                                    <div className="text-xs text-zinc-500 mb-1">Parent ODP:</div>
                                                    <div className="text-base font-semibold text-blue-300">
                                                        {odps.find(o => o.id === (selectedNode.data.parentId || selectedNode.data.parent_id))?.name}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-base font-semibold text-white">
                                                    {servers.find(s => s.id === (selectedNode.data.serverId || selectedNode.data.server_id))?.name}
                                                </div>
                                            )}
                                        </div>

                                        {/* Port Usage */}
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

                                        {/* Connected Customers */}
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-2">Connected Customers</div>
                                            <div className="text-2xl font-bold text-white">
                                                {customers.filter(c => (c.odpId || c.odp_id) === selectedNode.data.id).length}
                                            </div>
                                        </div>

                                        {/* Child ODPs List (if any) */}
                                        {selectedNode.data.child_odps && selectedNode.data.child_odps.length > 0 && (
                                            <div className="p-3 bg-zinc-800/50 rounded-lg">
                                                <div className="text-sm text-zinc-400 mb-2">Child ODPs ({selectedNode.data.child_odps.length})</div>
                                                <div className="space-y-1">
                                                    {selectedNode.data.child_odps.map((child: any) => (
                                                        <div key={child.id} className="text-sm text-blue-300">
                                                            • {child.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
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
                                                <div className="text-sm font-semibold text-white">
                                                    {selectedNode.data.package?.name || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-zinc-800/50 rounded-lg">
                                                <div className="text-xs text-zinc-400 mb-1">Speed (TX/RX)</div>
                                                <div className="text-sm font-semibold text-white">
                                                    {selectedNode.data.package?.speed_tx ? (
                                                        <>
                                                            {selectedNode.data.package.speed_tx}Mbps / {selectedNode.data.package.speed_rx}Mbps
                                                        </>
                                                    ) : (
                                                        'N/A'
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Connection Path - Full Hierarchy */}
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-3">Connection Path</div>
                                            <div className="space-y-2">
                                                {/* Show full ODP hierarchy */}
                                                {(() => {
                                                    const odpId = selectedNode.data.odpId || selectedNode.data.odp_id;
                                                    const customerOdp = odps.find(o => o.id === odpId);
                                                    
                                                    // Build path from root to customer ODP
                                                    const path: any[] = [];
                                                    if (customerOdp) {
                                                        let current: ODP | undefined = customerOdp;
                                                        while (current) {
                                                            path.unshift(current);
                                                            if (current.parent_id || current.parentId) {
                                                                current = odps.find(o => o.id === (current!.parent_id || current!.parentId));
                                                            } else {
                                                                break;
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        <>
                                                            {/* Server at top of hierarchy */}
                                                            {customerOdp?.root_server && (
                                                                <div className="text-sm font-semibold text-emerald-400">
                                                                    🖥️ {customerOdp.root_server.name}
                                                                </div>
                                                            )}
                                                            
                                                            {/* All ODPs in the path */}
                                                            {path.map((odp, idx) => (
                                                                <div key={odp.id} className="text-sm">
                                                                    <div className="text-blue-300">
                                                                        {'  '.repeat(idx)}├─ {odp.name}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            
                                                            {/* Customer at the end */}
                                                            <div className="text-sm text-green-300">
                                                                {'  '.repeat(path.length)}└─ {selectedNode.data.name}
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-sm text-zinc-400 mb-3">Traffic Statistics (SNMP)</div>
                                            
                                            {/* Loading State */}
                                            {snmpLoading && (
                                                <div className="flex items-center justify-center py-4">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="animate-spin">
                                                            <svg className="w-5 h-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        </div>
                                                        <span className="text-xs text-zinc-500">Fetching SNMP data...</span>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Error State - Detailed */}
                                            {snmpStats?.error && (
                                                <div className="space-y-2">
                                                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400">
                                                        <div className="font-semibold mb-1">⚠️ {snmpStats.message || 'Failed to fetch SNMP data'}</div>
                                                        {snmpStats.details && (
                                                            <div className="text-red-300/80 mt-1">
                                                                <details className="cursor-pointer">
                                                                    <summary className="hover:underline">Details</summary>
                                                                    <pre className="text-xs bg-red-900/20 p-2 mt-1 rounded overflow-auto max-h-40">
                                                                        {JSON.stringify(snmpStats.details, null, 2)}
                                                                    </pre>
                                                                </details>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Troubleshooting Tips */}
                                                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600">
                                                        <div className="font-semibold mb-1">💡 Troubleshooting:</div>
                                                        <ul className="list-disc list-inside space-y-1 text-yellow-600/80">
                                                            <li>Check if SNMP extension is installed: <code className="bg-yellow-900/30 px-1">php -m | grep snmp</code></li>
                                                            <li>Verify MIKROTIK_HOST in .env file</li>
                                                            <li>Check customer router_mac is set</li>
                                                            <li>Ensure SNMP is enabled on MikroTik device</li>
                                                            <li>Check server logs: <code className="bg-yellow-900/30 px-1">tail -f storage/logs/laravel.log</code></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Data Display */}
                                            {!snmpLoading && snmpStats && !snmpStats.error && (
                                                <div className="space-y-3">
                                                    {/* Interface Info */}
                                                    <div className="pb-2 border-b border-zinc-700/50">
                                                        <span className="text-xs text-zinc-500">Interface: <span className="text-zinc-300">{snmpStats.interface_name || 'Unknown'}</span></span>
                                                        {snmpStats.message && <p className="text-xs text-orange-400 mt-1">{snmpStats.message}</p>}
                                                    </div>
                                                    
                                                    {/* TX Rate/Bytes */}
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-zinc-400">TX Bytes</span>
                                                        <span className="text-sm font-mono text-orange-400">
                                                            {snmpStats.tx_rate || 'N/A'}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* RX Rate/Bytes */}
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-zinc-400">RX Bytes</span>
                                                        <span className="text-sm font-mono text-blue-400">
                                                            {snmpStats.rx_rate || 'N/A'}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Speed */}
                                                    <div className="flex justify-between items-center pt-2 border-t border-zinc-700/50">
                                                        <span className="text-xs text-zinc-400">Link Speed</span>
                                                        <span className="text-sm font-mono text-cyan-400">
                                                            {snmpStats.speed || 'Unknown'}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Debug Log Display */}
                                                    {snmpStats.debug && snmpStats.debug.length > 0 && (
                                                        <div className="pt-3 border-t border-zinc-700/50 mt-3">
                                                            <details className="cursor-pointer">
                                                                <summary className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold">🔍 Debug Info ({snmpStats.debug.length} steps)</summary>
                                                                <div className="text-xs bg-zinc-900/50 p-2 mt-2 rounded max-h-48 overflow-y-auto space-y-1">
                                                                    {snmpStats.debug.map((line: string, idx: number) => (
                                                                        <div key={idx} className="font-mono text-zinc-400">
                                                                            {line.includes('✓') && <span className="text-green-400">{line}</span>}
                                                                            {line.includes('✗') && <span className="text-red-400">{line}</span>}
                                                                            {line.includes('⚠️') && <span className="text-yellow-400">{line}</span>}
                                                                            {!line.includes('✓') && !line.includes('✗') && !line.includes('⚠️') && <span>{line}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Empty State */}
                                            {!snmpLoading && !snmpStats && (
                                                <div className="text-xs text-zinc-500 italic">
                                                    No SNMP data available
                                                </div>
                                            )}
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