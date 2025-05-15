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

// New interface for hover tooltip
interface HoverTooltipOptions {
  offset: L.Point;
  className: string;
  opacity: number;
}

interface FixedMapProps {
  onDeviceSelect?: (device: Device, readings: SoilReading[]) => void;
  onDeviceHover?: (device: Device, readings: SoilReading[], isHovering: boolean) => void;
}

// This is a fixed version of the map component that properly handles device selection
const FixedMap: React.FC<FixedMapProps> = ({ onDeviceSelect, onDeviceHover }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceLocations, setDeviceLocations] = useState<DeviceLocation[]>([]);
  const deviceReadingsRef = useRef<Record<string, SoilReading[]>>({});
  const hoverTooltipRef = useRef<L.Tooltip | null>(null);
  const [lastHoveredSerialNumber, setLastHoveredSerialNumber] = useState<string | null>(null);
  // Track markers by serial number for easy lookup
  const markersBySerialRef = useRef<Record<string, L.Marker>>({});

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

  // Format the soil metrics for the hover tooltip with complete device log information
  const formatSoilMetrics = (reading: SoilReading, deviceName: string): string => {
    return `
      <div class="soil-metrics">
        <div class="device-name mb-2 font-bold text-center">${deviceName}</div>
        <div class="last-reading-container">
          <div class="metric-row">
            <span class="label">Temperature:</span>
            <span class="value ${getTempClass(reading.soil_temperature)}">${reading.soil_temperature ? `${reading.soil_temperature.toFixed(1)}°C` : 'N/A'}</span>
          </div>
          <div class="metric-row">
            <span class="label">Moisture:</span>
            <span class="value ${getMoistureClass(reading.soil_moisture)}">${reading.soil_moisture ? `${reading.soil_moisture.toFixed(1)}%` : 'N/A'}</span>
          </div>
          <div class="metric-row">
            <span class="label">pH Level:</span>
            <span class="value ${getPhClass(reading.ph)}">${reading.ph ? reading.ph.toFixed(1) : 'N/A'}</span>
          </div>
          <div class="metric-row">
            <span class="label">EC:</span>
            <span class="value">${reading.electrical_conductivity ? `${reading.electrical_conductivity.toFixed(2)} mS/cm` : 'N/A'}</span>
          </div>
          <div class="metric-row">
            <span class="label">Nitrogen:</span>
            <span class="value">${reading.nitrogen ? `${reading.nitrogen.toFixed(1)} mg/kg` : 'N/A'}</span>
          </div>
          <div class="metric-row">
            <span class="label">Phosphorous:</span>
            <span class="value">${reading.phosphorous ? `${reading.phosphorous.toFixed(1)} mg/kg` : 'N/A'}</span>
          </div>
          <div class="metric-row">
            <span class="label">Potassium:</span>
            <span class="value">${reading.potassium ? `${reading.potassium.toFixed(1)} mg/kg` : 'N/A'}</span>
          </div>
          <div class="metric-row updated-at">
            <span class="label">Last Update:</span>
            <span class="value timestamp">${new Date(reading.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;
  };

  // Helper functions to determine status classes
  const getTempClass = (temp?: number): string => {
    if (temp === undefined) return '';
    if (temp < 15 || temp > 30) return 'critical';
    if (temp < 18 || temp > 25) return 'warning';
    return 'optimal';
  };
  
  const getMoistureClass = (moisture?: number): string => {
    if (moisture === undefined) return '';
    if (moisture < 30) return 'critical';
    if (moisture > 70) return 'warning';
    return 'optimal';
  };

  const getPhClass = (ph?: number): string => {
    if (ph === undefined) return '';
    if (ph < 5.5 || ph > 7.5) return 'critical';
    if (ph < 6.0 || ph > 7.0) return 'warning';
    return 'optimal';
  };

  // Create a separate tooltip for hover that's different from the popup
  const createHoverTooltip = (content: string): L.Tooltip => {
    if (!mapRef.current) {
      throw new Error("Map not initialized");
    }
    
    // Create tooltip with custom styling - larger to fit more data
    const tooltipOptions: HoverTooltipOptions = {
      offset: new L.Point(0, -15),
      className: 'custom-hover-tooltip',
      opacity: 0.95
    };
    
    return L.tooltip(tooltipOptions).setContent(content);
  };

  // Reset visual markers when new device is hovered
  const resetAllMarkerStyles = () => {
    try {
      if (mapRef.current) {
        markersRef.current.forEach(marker => {
          try {
            const markerEl = marker.getElement();
            if (markerEl) {
              const dotEl = markerEl.querySelector('.marker-dot');
              if (dotEl) {
                dotEl.classList.remove('hover-active');
                dotEl.classList.remove('hover-locked');
              }
            }
          } catch (error) {
            console.error("Error resetting marker style:", error);
          }
        });
      }
    } catch (error) {
      console.error("Error in resetAllMarkerStyles:", error);
    }
  };
  
  // Find a marker by device serial number
  const findMarkerBySerialNumber = (serialNumber: string): L.Marker | null => {
    return markersBySerialRef.current[serialNumber] || null;
  };
  
  // Helper to visually highlight a specific marker to show it's locked
  const highlightLockedMarker = (serialNumber: string) => {
    try {
      // Reset previous styles first
      resetAllMarkerStyles();
      
      // Find and highlight the new marker
      const marker = findMarkerBySerialNumber(serialNumber);
      if (marker) {
        try {
          const markerEl = marker.getElement();
          if (markerEl) {
            const dotEl = markerEl.querySelector('.marker-dot');
            if (dotEl) {
              dotEl.classList.add('hover-locked');
            }
          }
        } catch (error) {
          console.error("Error highlighting marker:", error);
        }
      }
    } catch (error) {
      console.error("Error in highlightLockedMarker:", error);
    }
  };

  // Initialize and update map
  useEffect(() => {
    // Only initialize map if container exists and we're in the browser
    if (!mapRef.current && mapContainerRef.current && typeof window !== 'undefined') {
      try {
        // Create map instance
        const map = L.map(mapContainerRef.current, {
          // Disable zoom until fully initialized to prevent race conditions
          zoomControl: false
        }).setView([39.8283, -98.5795], 4);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Store reference
        mapRef.current = map;
        
        // Add zoom control after initialization
        setTimeout(() => {
          if (mapRef.current) {
            L.control.zoom().addTo(mapRef.current);
            // Force a resize to make sure everything is properly sized
            mapRef.current.invalidateSize(true);
          }
        }, 500);
      } catch (error) {
        console.error("Error initializing map:", error);
        setError("Failed to initialize map. Please try refreshing the page.");
      }
    }

    // Update markers when device locations change - only if map is ready
    if (mapRef.current && deviceLocations.length > 0) {
      try {
        // Ensure map is valid and container is attached to DOM
        if (!mapContainerRef.current || !mapContainerRef.current.isConnected) {
          console.error("Map container is not connected to DOM");
          return;
        }
        
        // Force a resize to ensure map is properly sized
        mapRef.current.invalidateSize(true);
        
        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        markersBySerialRef.current = {}; // Clear marker reference map

        // Add markers for device locations
        const bounds = L.latLngBounds(deviceLocations.map(loc => [loc.latitude, loc.longitude]));
        
        // Don't add markers all at once to prevent race conditions
        setTimeout(() => {
          deviceLocations.forEach(location => {
            try {
              // Store current location in closure to ensure it's preserved
              const currentLocation = {...location};
              const deviceId = currentLocation.device.serial_number;
              const deviceName = currentLocation.device.name || deviceId;
              
              // Create marker with specific options for clicking
              const marker = L.marker([currentLocation.latitude, currentLocation.longitude], {
                interactive: true, // Ensure marker is interactive
                bubblingMouseEvents: false, // Prevent event bubbling
                zIndexOffset: 1000, // Make sure markers are on top
                riseOnHover: true, // Bring to front on hover
                riseOffset: 2000 // Higher rise offset to ensure it's above other elements
              });
              
              // Store marker reference by serial number and in markers array
              if (mapRef.current) {
                markersBySerialRef.current[deviceId] = marker;
                markersRef.current.push(marker);
                
                // Create a custom marker icon with a much larger click area
                try {
                  const customIcon = L.divIcon({
                    className: 'custom-marker-icon',
                    html: `
                      <div class="marker-container" style="
                        position: relative;
                        width: 60px; 
                        height: 60px;
                        cursor: pointer;
                        z-index: 1000;
                      ">
                        <div class="marker-dot" style="
                          position: absolute;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%);
                          width: 20px;
                          height: 20px;
                          background-color: #3498db; 
                          border-radius: 50%;
                          border: 2px solid white;
                          box-shadow: 0 0 8px rgba(0,0,0,0.4);
                          z-index: 1001;
                        "></div>
                        <div class="marker-pulse" style="
                          position: absolute;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%);
                          width: 40px;
                          height: 40px;
                          background-color: rgba(52,152,219,0.15);
                          border-radius: 50%;
                          animation: pulse 2s infinite;
                          z-index: 1000;
                        "></div>
                        <div class="clickable-area" style="
                          position: absolute;
                          top: 0;
                          left: 0;
                          width: 100%;
                          height: 100%;
                          cursor: pointer;
                          z-index: 1002;
                        "></div>
                        <div class="device-name" style="
                          position: absolute;
                          top: 100%;
                          left: 50%;
                          transform: translateX(-50%);
                          white-space: nowrap;
                          background-color: rgba(52,152,219,0.9);
                          color: white;
                          padding: 2px 5px;
                          border-radius: 3px;
                          font-size: 10px;
                          font-weight: bold;
                          pointer-events: none;
                          margin-top: -5px;
                        ">${deviceName}</div>
                      </div>
                    `,
                    iconSize: [60, 60],
                    iconAnchor: [30, 30]
                  });
                  
                  marker.setIcon(customIcon);
                } catch (error) {
                  console.error("Error setting custom icon:", error);
                }
                
                // Add popup functionality
                try {
                  // Create popup content for device info
                  const popupContent = document.createElement('div');
                  popupContent.className = 'p-3';
                  popupContent.style.minWidth = '200px';
                  
                  // Create device name header
                  const header = document.createElement('div');
                  header.className = 'font-bold text-base mb-2';
                  header.textContent = deviceName;
                  popupContent.appendChild(header);
                  
                  // Add device info
                  const infoDiv = document.createElement('div');
                  infoDiv.className = 'text-sm';
                  
                  // Add reading fields if available
                  if (currentLocation.lastReading) {
                    const fields = [
                      { label: 'Temperature', value: currentLocation.lastReading.soil_temperature ? `${currentLocation.lastReading.soil_temperature.toFixed(1)}°C` : 'N/A' },
                      { label: 'Moisture', value: currentLocation.lastReading.soil_moisture ? `${currentLocation.lastReading.soil_moisture.toFixed(1)}%` : 'N/A' },
                      { label: 'pH', value: currentLocation.lastReading.ph ? currentLocation.lastReading.ph.toFixed(1) : 'N/A' },
                      { label: 'Updated', value: new Date(currentLocation.lastReading.created_at).toLocaleString() }
                    ];
                    
                    fields.forEach(field => {
                      const row = document.createElement('div');
                      row.className = 'mb-1 flex justify-between';
                      row.innerHTML = `<span class="font-medium">${field.label}:</span> <span>${field.value}</span>`;
                      infoDiv.appendChild(row);
                    });
                  }
                  
                  popupContent.appendChild(infoDiv);
                  
                  // Add select button
                  const selectButton = document.createElement('button');
                  selectButton.textContent = 'Select This Device';
                  selectButton.className = 'mt-3 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs w-full';
                  selectButton.style.cursor = 'pointer';
                  selectButton.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Call the device select callback
                    const readings = deviceReadingsRef.current[deviceId] || [];
                    if (onDeviceSelect) {
                      onDeviceSelect(currentLocation.device, readings);
                    }
                    
                    // Close popup
                    marker.closePopup();
                    return false;
                  };
                  
                  popupContent.appendChild(selectButton);
                  
                  // Create popup with better styling and positioning
                  const popup = new L.Popup({
                    offset: new L.Point(0, -20),
                    closeButton: true,
                    autoClose: false,
                    className: 'custom-popup'
                  }).setContent(popupContent);
                  
                  // Bind popup to marker
                  marker.bindPopup(popup);
                } catch (error) {
                  console.error("Error setting up popup:", error);
                }
                
                // Add event handlers safely
                try {
                  // Wrap event handlers in try/catch
                  marker.on('mouseover', function(this: L.Marker) {
                    try {
                      console.log('Device hovered:', currentLocation.device);
                      const readings = deviceReadingsRef.current[deviceId] || [];
                      
                      // Only update the last hovered serial number if it's different
                      // This prevents unnecessary state updates and rerenders
                      if (lastHoveredSerialNumber !== deviceId) {
                        setLastHoveredSerialNumber(deviceId);
                        
                        // Reset all other markers
                        resetAllMarkerStyles();
                        
                        // Trigger the hover callback only when changing devices
                        if (onDeviceHover) {
                          onDeviceHover(currentLocation.device, readings, true);
                        }
                      }
                      
                      // Show hover tooltip with soil metrics if we have readings
                      if (currentLocation.lastReading) {
                        const tooltipContent = formatSoilMetrics(currentLocation.lastReading, deviceName);
                        
                        // Remove existing tooltip
                        if (hoverTooltipRef.current) {
                          this.unbindTooltip();
                          hoverTooltipRef.current = null;
                        }
                        
                        // Create and bind new tooltip
                        try {
                          hoverTooltipRef.current = createHoverTooltip(tooltipContent);
                          this.bindTooltip(hoverTooltipRef.current, {
                            permanent: true, // Keep tooltip visible
                            direction: 'top',
                            offset: [0, -12]
                          }).openTooltip();
                        } catch (error) {
                          console.error("Error creating tooltip:", error);
                        }
                        
                        // Highlight marker
                        try {
                          const markerEl = this.getElement();
                          if (markerEl) {
                            const dotEl = markerEl.querySelector('.marker-dot');
                            if (dotEl) {
                              dotEl.classList.add('hover-active');
                            }
                          }
                        } catch (error) {
                          console.error("Error highlighting marker element:", error);
                        }
                      }
                    } catch (error) {
                      console.error("Error in mouseover handler:", error);
                    }
                  });
                  
                  marker.on('mouseout', function(this: L.Marker) {
                    try {
                      // Close popup
                      this.closePopup();
                      
                      // Only remove the tooltip, not the hover state
                      if (hoverTooltipRef.current) {
                        this.unbindTooltip();
                        hoverTooltipRef.current = null;
                      }
                      
                      // Visually highlight the locked marker
                      if (lastHoveredSerialNumber) {
                        highlightLockedMarker(lastHoveredSerialNumber);
                      }
                    } catch (error) {
                      console.error("Error in mouseout handler:", error);
                    }
                  });
                } catch (error) {
                  console.error("Error setting up event handlers:", error);
                }
                
                // Click handler that focuses primarily on selection rather than popup
                try {
                  marker.on('click', function(this: L.Marker, e: L.LeafletMouseEvent) {
                    try {
                      // Stop event propagation to prevent map click handler
                      L.DomEvent.stopPropagation(e as unknown as Event);
                      L.DomEvent.preventDefault(e as unknown as Event);
                      
                      // Get readings and call the select callback
                      const readings = deviceReadingsRef.current[deviceId] || [];
                      
                      if (onDeviceSelect) {
                        onDeviceSelect(currentLocation.device, readings);
                        
                        // Show temporary feedback to indicate marker was clicked
                        const markerEl = this.getElement();
                        if (markerEl) {
                          markerEl.style.transition = 'transform 0.2s';
                          markerEl.style.transform = 'scale(1.2)';
                          setTimeout(() => {
                            markerEl.style.transform = 'scale(1)';
                          }, 200);
                        }
                      }
                      
                      // Open popup for additional info
                      this.openPopup();
                    } catch (error) {
                      console.error("Error in click handler:", error);
                    }
                  });
                } catch (error) {
                  console.error("Error setting up click handler:", error);
                }
                
                // Add marker to map
                try {
                  marker.addTo(mapRef.current);
                } catch (error) {
                  console.error("Error adding marker to map:", error);
                }
              }
            } catch (error) {
              console.error("Error creating marker for device:", location.device.serial_number, error);
            }
          });
          
          // Fit map bounds safely
          if (mapRef.current && deviceLocations.length > 0) {
            // Use timeout to ensure DOM is ready
            setTimeout(() => {
              try {
                if (mapRef.current) {
                  mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                }
              } catch (error) {
                console.error("Error fitting bounds:", error);
              }
            }, 100);
          }
          
          // If there was a previously hovered device, restore its visual state
          if (lastHoveredSerialNumber) {
            setTimeout(() => {
              highlightLockedMarker(lastHoveredSerialNumber);
            }, 200);
          }
        }, 300);
      } catch (error) {
        console.error("Error updating markers:", error);
      }
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.error("Error removing map:", error);
        }
        mapRef.current = null;
      }
    };
  }, [deviceLocations, onDeviceSelect, onDeviceHover, lastHoveredSerialNumber]);

  // Handle window resize more safely
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        try {
          // Use timeout to ensure DOM is ready
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.invalidateSize(true);
            }
          }, 100);
        } catch (error) {
          console.error("Error handling resize:", error);
        }
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
      style={{ position: 'relative', pointerEvents: 'auto', touchAction: 'auto' }}
    >
      <style jsx global>{`
        .custom-hover-tooltip {
          background: rgba(255, 255, 255, 0.95);
          border: none;
          border-radius: 6px;
          color: #333;
          font-size: 12px;
          padding: 8px 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          max-width: 250px;
          min-width: 200px;
        }
        
        .custom-hover-tooltip .soil-metrics {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .custom-hover-tooltip .device-name {
          text-align: center;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          padding-bottom: 5px;
          margin-bottom: 5px;
          font-size: 14px;
          color: #2c3e50;
        }
        
        .custom-hover-tooltip .metric-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 3px 0;
          border-bottom: 1px dotted rgba(0,0,0,0.05);
        }
        
        .custom-hover-tooltip .label {
          font-weight: bold;
          color: #555;
        }
        
        .custom-hover-tooltip .value {
          font-weight: bold;
        }
        
        .custom-hover-tooltip .updated-at {
          margin-top: 5px;
          border-top: 1px solid rgba(0,0,0,0.1);
          border-bottom: none;
          padding-top: 5px;
        }
        
        .custom-hover-tooltip .timestamp {
          font-size: 10px;
          color: #666;
        }
        
        .custom-hover-tooltip .optimal {
          color: #27ae60;
        }
        
        .custom-hover-tooltip .warning {
          color: #f39c12;
        }
        
        .custom-hover-tooltip .critical {
          color: #e74c3c;
        }
        
        .marker-dot.hover-active {
          transform: scale(1.5);
          transition: transform 0.2s ease;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
          background-color: #2ecc71 !important;
        }
        
        .marker-dot.hover-locked {
          transform: scale(1.3);
          transition: transform 0.2s ease;
          box-shadow: 0 0 15px rgba(255, 255, 0, 0.8);
          background-color: #f1c40f !important;
          border: 2px solid white;
        }
        
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default FixedMap; 