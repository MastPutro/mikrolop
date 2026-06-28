import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapLocationViewerProps {
    lat?: number;
    lng?: number;
}

export default function MapLocationViewer({ lat = -7.47738000, lng = 112.56159500 }: MapLocationViewerProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapContainer.current) return;

        // Initialize map
        map.current = L.map(mapContainer.current).setView([lat, lng], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map.current);

        // Add marker (non-draggable)
        L.marker([lat, lng], {
            draggable: false,
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            }),
        }).addTo(map.current);

        return () => {
            if (map.current) {
                map.current.remove();
            }
        };
    }, [lat, lng]);

    return (
        <div className="space-y-3">
            <div
                ref={mapContainer}
                className="w-full h-64 border border-gray-300 rounded-md overflow-hidden"
            />
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Latitude
                    </label>
                    <input
                        type="text"
                        value={lat.toFixed(6)}
                        readOnly
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Longitude
                    </label>
                    <input
                        type="text"
                        value={lng.toFixed(6)}
                        readOnly
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                </div>
            </div>
        </div>
    );
}
