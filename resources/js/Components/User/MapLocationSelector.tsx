import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapLocationSelectorProps {
    onLocationSelect: (lat: number, lng: number) => void;
    initialLat?: number;
    initialLng?: number;
}

export default function MapLocationSelector({ onLocationSelect, initialLat = -7.47738000, initialLng = 112.56159500 }: MapLocationSelectorProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const marker = useRef<L.Marker | null>(null);
    const [selectedLat, setSelectedLat] = useState(initialLat);
    const [selectedLng, setSelectedLng] = useState(initialLng);

    useEffect(() => {
        if (!mapContainer.current) return;

        // Initialize map
        map.current = L.map(mapContainer.current).setView([initialLat, initialLng], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map.current);

        // Add initial marker
        marker.current = L.marker([initialLat, initialLng], {
            draggable: true,
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            }),
        }).addTo(map.current);

        const handleMarkerMove = () => {
            if (marker.current) {
                const latLng = marker.current.getLatLng();
                setSelectedLat(latLng.lat);
                setSelectedLng(latLng.lng);
                onLocationSelect(latLng.lat, latLng.lng);
            }
        };

        marker.current.on('dragend', handleMarkerMove);

        // Handle map click
        const handleMapClick = (e: L.LeafletMouseEvent) => {
            if (marker.current) {
                marker.current.setLatLng(e.latlng);
                setSelectedLat(e.latlng.lat);
                setSelectedLng(e.latlng.lng);
                onLocationSelect(e.latlng.lat, e.latlng.lng);
            }
        };

        map.current.on('click', handleMapClick);

        return () => {
            if (map.current) {
                map.current.off('click', handleMapClick);
                map.current.remove();
            }
        };
    }, []);

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
                        value={selectedLat.toFixed(6)}
                        readOnly
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-600"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Longitude
                    </label>
                    <input
                        type="text"
                        value={selectedLng.toFixed(6)}
                        readOnly
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-600"
                    />
                </div>
            </div>
            <p className="text-xs text-gray-500">
                💡 Klik pada peta atau drag marker untuk memilih lokasi
            </p>
        </div>
    );
}
