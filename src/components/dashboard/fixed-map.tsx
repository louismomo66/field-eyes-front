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

interface FixedMapProps {
  onDeviceSelect?: (device: Device, readings: SoilReading[]) => void;
}

// This is a fixed version of the map component that properly handles device selection
const FixedMap: React.FC<FixedMapProps> = ({ onDeviceSelect }) => {
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
        // Create marker with custom popup and specific options for clicking
        const marker = L.marker([location.latitude, location.longitude], {
          interactive: true, // Ensure marker is interactive
          bubblingMouseEvents: false // Prevent event bubbling
        });
        
        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'p-2';
        
        // Create device name header
        const header = document.createElement('h3');
        header.className = 'font-bold';
        header.textContent = location.device.name || location.device.serial_number;
        popupContent.appendChild(header);
        
        // Create a direct selection button at the top
        const quickSelectButton = document.createElement('button');
        quickSelectButton.textContent = 'Select This Device';
        quickSelectButton.className = 'w-full my-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs';
        quickSelectButton.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          console.log('Quick select button clicked for device:', location.device.name || location.device.serial_number);
          
          // Get readings with fallback to empty array
          const readings = deviceReadingsRef.current[location.device.serial_number] || [];
          console.log('Found readings for selected device:', readings.length);
          
          if (onDeviceSelect) {
            // Create a visible indicator showing the selection is working
            const indicator = document.createElement('div');
            indicator.style.position = 'fixed';
            indicator.style.top = '10px';
            indicator.style.right = '10px';
            indicator.style.backgroundColor = 'green';
            indicator.style.color = 'white';
            indicator.style.padding = '10px';
            indicator.style.borderRadius = '5px';
            indicator.style.zIndex = '10000';
            indicator.textContent = `Selected: ${location.device.name || location.device.serial_number}`;
            document.body.appendChild(indicator);
            setTimeout(() => document.body.removeChild(indicator), 2000);
            
            // Call the callback directly - no wrapping or setTimeout
            onDeviceSelect(location.device, readings);
            console.log('Called onDeviceSelect with device and readings');
          } else {
            console.error('No onDeviceSelect callback provided');
          }
          
          marker.closePopup();
          return false;
        };
        popupContent.appendChild(quickSelectButton);
        
        // Create readings info
        const readingsDiv = document.createElement('div');
        readingsDiv.className = 'text-sm mt-2';
        
        // Add reading fields
        const fields = [
          { label: 'Temperature', value: `${location.lastReading.soil_temperature?.toFixed(1)}°C` },
          { label: 'Moisture', value: `${location.lastReading.soil_moisture?.toFixed(1)}%` },
          { label: 'pH', value: location.lastReading.ph?.toFixed(1) },
          { label: 'Time', value: new Date(location.lastReading.created_at).toLocaleString() }
        ];
        
        // Add title
        const title = document.createElement('p');
        title.innerHTML = '<strong>Last Reading:</strong>';
        readingsDiv.appendChild(title);
        
        // Add each field
        fields.forEach(field => {
          const p = document.createElement('p');
          p.textContent = `${field.label}: ${field.value}`;
          readingsDiv.appendChild(p);
        });
        
        popupContent.appendChild(readingsDiv);
        
        // Add a select device button at the bottom
        const selectButton = document.createElement('button');
        selectButton.textContent = 'View Device Data';
        selectButton.className = 'mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs';
        selectButton.onclick = (e) => {
          // Prevent default behavior
          e.preventDefault();
          e.stopPropagation();
          
          console.log('View Device Data button clicked for device:', location.device.name || location.device.serial_number);
          
          // Get the readings
          const readings = deviceReadingsRef.current[location.device.serial_number] || [];
          console.log('Found readings for selected device:', readings.length);
          
          // Call the callback directly
          if (onDeviceSelect) {
            // Create a visible indicator showing the selection is working
            const indicator = document.createElement('div');
            indicator.style.position = 'fixed';
            indicator.style.top = '10px';
            indicator.style.right = '10px';
            indicator.style.backgroundColor = 'green';
            indicator.style.color = 'white';
            indicator.style.padding = '10px';
            indicator.style.borderRadius = '5px';
            indicator.style.zIndex = '10000';
            indicator.textContent = `Selected: ${location.device.name || location.device.serial_number}`;
            document.body.appendChild(indicator);
            setTimeout(() => document.body.removeChild(indicator), 2000);
            
            // Call the callback directly - no wrapping or setTimeout
            onDeviceSelect(location.device, readings);
            console.log('Called onDeviceSelect with device and readings');
          } else {
            console.error('No onDeviceSelect callback provided');
          }
          
          // Close the popup
          marker.closePopup();
          
          return false;
        };
        
        popupContent.appendChild(selectButton);
        
        // Create popup
        const popup = L.popup({
          autoPan: false,
          closeButton: true,
          className: 'custom-popup', // Add custom class for styling
        }).setContent(popupContent);
        
        // Bind popup to marker
        marker.bindPopup(popup);
        
        // Add direct click handler as a simple function
        marker.on('click', function() {
          // Get the readings
          const readings = deviceReadingsRef.current[location.device.serial_number] || [];
          
          // Call the callback directly without any delay or unnecessary event handling
          if (onDeviceSelect) {
            // Call onDeviceSelect immediately
            onDeviceSelect(location.device, readings);
            console.log(`Clicked device ${location.device.name || location.device.serial_number} with ${readings.length} readings`);
          }
        });
        
        // Add mouseover handler for better UX
        marker.on('mouseover', function() {
          marker.openPopup();
        });
        
        // Add the marker to the map
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
      className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-200 relative z-0 map-container"
    />
  );
};

export default FixedMap; 