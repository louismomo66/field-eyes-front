"use client"

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getUserDevices, getDeviceLogs } from '@/lib/field-eyes-api';
import type { Device, SoilReading } from '@/types/field-eyes';

interface DeviceLocation {
  device: Device;
  latitude: number;
  longitude: number;
  lastReading: SoilReading;
}

interface DashboardMapProps {
  onDeviceSelect?: (device: Device, readings: SoilReading[]) => void;
}

const DashboardMap: React.FC<DashboardMapProps> = ({ onDeviceSelect }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceLocations, setDeviceLocations] = useState<DeviceLocation[]>([]);
  const deviceReadingsRef = useRef<Record<string, SoilReading[]>>({});

  // Initialize Leaflet marker icons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      });
    }
  }, []);

  // Fetch device locations and their readings
  useEffect(() => {
    let mounted = true;

    const fetchDeviceLocations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all devices
        const devices = await getUserDevices();
        if (!mounted || !devices || devices.length === 0) {
          setIsLoading(false);
          return;
        }

        // Process devices in batches for better performance
        const batchSize = 5;
        const locations: DeviceLocation[] = [];
        const readingsMap: Record<string, SoilReading[]> = {};

        for (let i = 0; i < devices.length; i += batchSize) {
          const batch = devices.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (device) => {
              try {
                const logs = await getDeviceLogs(device.serial_number);
                if (logs && logs.length > 0) {
                  const lastLog = logs[0]; // Most recent log
                  if (lastLog.latitude && lastLog.longitude) {
                    locations.push({
                      device,
                      latitude: lastLog.latitude,
                      longitude: lastLog.longitude,
                      lastReading: lastLog
                    });
                    readingsMap[device.serial_number] = logs;
                  }
                }
              } catch (err) {
                console.error(`Error fetching logs for device ${device.serial_number}:`, err);
              }
            })
          );
        }

        if (mounted) {
          setDeviceLocations(locations);
          deviceReadingsRef.current = readingsMap;
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching device locations:', err);
        if (mounted) {
          setError('Failed to fetch device locations');
          setIsLoading(false);
        }
      }
    };

    fetchDeviceLocations();

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize and update map
  useEffect(() => {
    // Only initialize map if container exists and we're in the browser
    if (!mapRef.current && mapContainerRef.current && typeof window !== 'undefined') {
      // Create map instance
      const map = L.map(mapContainerRef.current).setView([39.8283, -98.5795], 4);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      mapRef.current = map;

      // Wait for the next frame to ensure the container is ready
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    }

    // Update markers when device locations change
    if (mapRef.current && deviceLocations.length > 0) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add markers for device locations
      const bounds = L.latLngBounds(deviceLocations.map(loc => [loc.latitude, loc.longitude]));
      
      deviceLocations.forEach(location => {
        // Create marker with custom popup content
        const marker = L.marker([location.latitude, location.longitude]);
        
        // Create popup content
        const popupContent = `
          <div class="p-2">
            <h3 class="font-bold">${location.device.name || location.device.serial_number}</h3>
            <div class="text-sm mt-2">
              <p><strong>Last Reading:</strong></p>
              <p>Temperature: ${location.lastReading.soil_temperature?.toFixed(1)}°C</p>
              <p>Moisture: ${location.lastReading.soil_moisture?.toFixed(1)}%</p>
              <p>pH: ${location.lastReading.ph?.toFixed(1)}</p>
              <p>Time: ${new Date(location.lastReading.created_at).toLocaleString()}</p>
            </div>
          </div>
        `;
        
        // Create popup with options to disable auto-panning which can cause refresh issues
        const popup = L.popup({
          autoPan: false,
          closeButton: true,
        }).setContent(popupContent);
        
        // Bind popup to marker with custom options
        marker.bindPopup(popup);
        
        // Add click handler for device selection with explicit event prevention
        marker.on('click', function(e) {
          // Stop event propagation
          L.DomEvent.stopPropagation(e);
          
          // Prevent any default browser behavior
          if (e.originalEvent) {
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
          }
          
          // Get the readings and call onDeviceSelect
          const readings = deviceReadingsRef.current[location.device.serial_number] || [];
          if (onDeviceSelect) {
            console.log('Selected device:', location.device.name || location.device.serial_number);
            onDeviceSelect(location.device, readings);
          }
          
          // Return false to prevent any further event propagation
          return false;
        });
        
        // Add to map and store in markers ref
        marker.addTo(mapRef.current!);
        markersRef.current.push(marker);
      });

      // Fit map bounds to show all markers
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      
      // Ensure map is properly sized
      requestAnimationFrame(() => {
        mapRef.current?.invalidateSize();
      });
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [deviceLocations, onDeviceSelect]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        requestAnimationFrame(() => {
          mapRef.current?.invalidateSize();
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading device locations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
        <div className="text-center p-4">
          <p className="text-red-600 font-medium mb-2">Failed to load device locations</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (deviceLocations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
        <div className="text-center p-4">
          <p className="text-gray-600 font-medium mb-2">No device locations available</p>
          <p className="text-sm text-gray-500">Add devices or ensure they are reporting location data.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainerRef}
      className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-200 relative z-0"
    />
  );
};

export default DashboardMap; 