"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// Note: Overview component removed as it's not used in current dashboard layout
// Note: RecentReadings component removed as it's not used in current dashboard layout
import { SoilHealthIndicator } from "@/components/dashboard/soil-health-indicator"
import { getUserDevices, getLatestDeviceLog } from "@/lib/field-eyes-api"
import { transformDevices, transformSoilReadings } from "@/lib/transformers"
import type { Device as FieldEyesDevice, SoilReading as FieldEyesSoilReading } from "@/types/field-eyes"
import type { Device as IndexDevice, SoilReading as IndexSoilReading } from "@/types"
import dynamic from 'next/dynamic'
import { Skeleton } from "@/components/ui/skeleton"

// Dashboard loading skeleton component
const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Stats cards skeleton */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[60px] mb-2" />
            <Skeleton className="h-3 w-[120px]" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    {/* Main content skeleton */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-4">
        <CardHeader>
          <Skeleton className="h-6 w-[80px]" />
          <Skeleton className="h-4 w-[200px]" />
        </CardHeader>
        <CardContent className="p-0" style={{ height: '600px' }}>
          <Skeleton className="h-full w-full rounded-lg" />
        </CardContent>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-4 w-[150px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[60px]" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
)
import { DashboardMapProps, DashboardMapType } from "./map-types"

// Dynamically import the FixedMap component with no SSR
const DashboardMap = dynamic<DashboardMapProps>(
  () => import('@/components/dashboard/fixed-map'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }
)

// Adapter function to transform FieldEyesDevice to IndexDevice
const transformDeviceForIndicator = (device: FieldEyesDevice | null): IndexDevice | null => {
  if (!device) return null;
  // Access potentially missing properties with type assertion or default value if type is incorrect
  const lat = (device as any).latitude || 0;
  const lng = (device as any).longitude || 0;
  return {
    id: String(device.serial_number), 
    name: device.name || device.serial_number,
    status: device.status || 'active',
    lat: lat, 
    lng: lng, 
    serial_number: device.serial_number, 
    readings: {}, 
  };
};

// Adapter function to transform FieldEyesSoilReading[] to IndexSoilReading[]
const transformReadingsForIndicator = (
  readings: FieldEyesSoilReading[],
  sourceDevice: FieldEyesDevice | null
): IndexSoilReading[] => {
  // Add debug logging - show raw data being transformed
  console.log("Transforming readings:", readings.length > 0 ? readings[0] : "No readings");
  
  return readings.map(reading => {
    const deviceNameStr = sourceDevice?.name || sourceDevice?.serial_number || reading.serial_number;
    let calculatedStatus: IndexSoilReading['status'] = "optimal";
    if (reading.soil_moisture !== undefined) {
      if (reading.soil_moisture < 30) calculatedStatus = "critical";
      else if (reading.soil_moisture > 70) calculatedStatus = "warning";
    }
    
    // Convert backend field names to frontend ones
    const transformedReading: IndexSoilReading = {
      id: String(reading.id || `${reading.serial_number}-${reading.created_at}`),
      deviceId: reading.serial_number,
      deviceName: deviceNameStr,
      timestamp: reading.created_at,
      // Make sure all fields are properly mapped according to the SoilReading interface
      moisture: reading.soil_moisture,
      temperature: reading.soil_temperature,
      ph: reading.ph,
      nitrogen: reading.nitrogen,
      phosphorus: reading.phosphorous, // Note the spelling difference
      potassium: reading.potassium,
      ec: reading.electrical_conductivity,
      status: calculatedStatus,
    };
    
    // Debug transformed data
    console.log(`Transformed reading fields mapped to SoilReading interface:`, {
      deviceId: transformedReading.deviceId,
      moisture: transformedReading.moisture,
      temperature: transformedReading.temperature,
      ph: transformedReading.ph,
      nitrogen: transformedReading.nitrogen,
      phosphorus: transformedReading.phosphorus,
      potassium: transformedReading.potassium,
      ec: transformedReading.ec
    });
    
    return transformedReading;
  });
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardStats, setDashboardStats] = useState({
    totalDevices: 0,
    avgMoisture: 0,
    avgPh: 0,
    alertCount: 0,
  })
  const [allDevices, setAllDevices] = useState<FieldEyesDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<FieldEyesDevice | null>(null)
  const [selectedDeviceReadings, setSelectedDeviceReadings] = useState<FieldEyesSoilReading[]>([])
  const [defaultDevice, setDefaultDevice] = useState<FieldEyesDevice | null>(null)
  const [defaultDeviceReadings, setDefaultDeviceReadings] = useState<FieldEyesSoilReading[]>([])
  const [updateCounter, setUpdateCounter] = useState(0)
  const [debugEvents, setDebugEvents] = useState<string[]>([])
  const [hoveredStats, setHoveredStats] = useState<{
    avgMoisture: number;
    avgPh: number;
    alertCount: number;
    isHovering: boolean;
    deviceName: string;
    deviceSerial: string;
  } | null>(null)
  const [hoveredDevice, setHoveredDevice] = useState<FieldEyesDevice | null>(null)
  const [hoveredReadings, setHoveredReadings] = useState<FieldEyesSoilReading[]>([])

  // Enhanced cache for device readings with better performance
  const readingsCache = useRef<Map<string, { data: FieldEyesSoilReading[], timestamp: number, isStale: boolean }>>(new Map())
  const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes cache duration (reduced for fresher data)
  const STALE_WHILE_REVALIDATE = 5 * 60 * 1000; // 5 minutes stale-while-revalidate

  // Helper to add debug events
  const addDebugEvent = (event: string) => {
    console.log("DEBUG EVENT:", event);
    setDebugEvents(prev => [event, ...prev].slice(0, 5)); // Keep last 5 events
  };

  useEffect(() => {
    addDebugEvent("Dashboard page mounted");
  }, []);

  const fetchDeviceReadings = async (device: FieldEyesDevice): Promise<FieldEyesSoilReading[]> => {
    try {
      const serialNumber = device.serial_number;
      const cachedEntry = readingsCache.current.get(serialNumber);
      const now = Date.now();

      // Check if we have fresh cached data
      if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
        addDebugEvent(`Using fresh cached reading for device ${serialNumber}`);
        return cachedEntry.data;
      }

      // Check if we have stale but usable cached data (stale-while-revalidate pattern)
      if (cachedEntry && (now - cachedEntry.timestamp) < STALE_WHILE_REVALIDATE) {
        addDebugEvent(`Using stale cached reading for device ${serialNumber}, revalidating in background`);
        
        // Return stale data immediately for better performance
        const staleData = cachedEntry.data;
        
        // Revalidate in background (non-blocking)
        setTimeout(async () => {
          try {
            const reading = await getLatestDeviceLog(serialNumber);
            const readings = reading ? [reading] : [];
            readingsCache.current.set(serialNumber, { data: readings, timestamp: now, isStale: false });
            addDebugEvent(`Background revalidation completed for device ${serialNumber}`);
          } catch (err) {
            console.warn(`Background revalidation failed for device ${serialNumber}:`, err);
          }
        }, 0);
        
        return staleData;
      }

      // Fetch new data if no cache or cache is too old
      addDebugEvent(`Fetching latest reading for device ${serialNumber}`);
      const reading = await getLatestDeviceLog(serialNumber);
      addDebugEvent(`Got latest reading for device ${serialNumber}`);
      const readings = reading ? [reading] : [];

      // Update cache with fresh data
      readingsCache.current.set(serialNumber, { data: readings, timestamp: now, isStale: false });
      return readings;
    } catch (err) {
      console.error(`Error fetching latest reading for device ${device.serial_number}:`, err)
      addDebugEvent(`Error fetching latest reading for device ${device.serial_number}`);
      
      // Return cached data if available, even if stale, rather than empty array
      const cachedEntry = readingsCache.current.get(device.serial_number);
      if (cachedEntry) {
        addDebugEvent(`Returning stale cached data due to fetch error for device ${device.serial_number}`);
        return cachedEntry.data;
      }
      
      return []
    }
  }
  
  // Handle device selection from map - simpler version that updates everything directly
  const handleDeviceSelect = useCallback((device: FieldEyesDevice, readings: FieldEyesSoilReading[]) => {
    console.log(`Selected device: ${device.name || device.serial_number} with ${readings.length} readings`);
    console.log("DEVICE OBJECT:", JSON.stringify(device, null, 2));
    console.log("FIRST READING:", readings.length > 0 ? JSON.stringify(readings[0], null, 2) : "No readings");
    
    // Add debug event
    addDebugEvent(`Device selected: ${device.name || device.serial_number} (${readings.length} readings)`);
    
    // Create a new copy of the readings to ensure reference changes
    const readingsCopy = [...readings];
    
    // Update device and readings state
    setSelectedDevice({...device});
    setSelectedDeviceReadings(readingsCopy);
    
    // Calculate new stats directly
    const totalDevices = allDevices.length;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Filter readings for this specific device and within the last week
    const deviceReadings = readingsCopy.filter(r => r.serial_number === device.serial_number);
    const weeklyReadings = deviceReadings.filter(r => new Date(r.created_at) >= oneWeekAgo);
    
    // Calculate moisture and pH averages
    let totalMoisture = 0, moistureCount = 0, totalPh = 0, phCount = 0;
    
    weeklyReadings.forEach(reading => {
      if (reading.soil_moisture !== undefined) {
        totalMoisture += reading.soil_moisture;
        moistureCount++;
      }
      if (reading.ph !== undefined) {
        totalPh += reading.ph;
        phCount++;
      }
    });
    
    const avgMoisture = moistureCount > 0 ? Math.round(totalMoisture / moistureCount) : 0;
    const avgPh = phCount > 0 ? Number.parseFloat((totalPh / phCount).toFixed(1)) : 0;
    
    // Count alerts
    const alertCount = weeklyReadings.filter(r => 
      (r.ph !== undefined && (r.ph < 5.5 || r.ph > 7.5)) ||
      (r.soil_moisture !== undefined && (r.soil_moisture < 30 || r.soil_moisture > 70)) ||
      (r.soil_temperature !== undefined && (r.soil_temperature < 15 || r.soil_temperature > 30)) ||
      (r.electrical_conductivity !== undefined && (r.electrical_conductivity < 0.5 || r.electrical_conductivity > 1.5))
    ).length;
    
    // Update dashboard stats
    setDashboardStats({
      totalDevices,
      avgMoisture,
      avgPh,
      alertCount,
    });
    
    // Force re-render with update counter
    setUpdateCounter(prev => prev + 1);
    
    console.log(`Dashboard updated with new values - Moisture: ${avgMoisture}%, pH: ${avgPh}`);
    addDebugEvent(`Dashboard updated with new values - Moisture: ${avgMoisture}%, pH: ${avgPh}`);
  }, [allDevices]);

  // Add global debug interface for console troubleshooting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.dashboardDebug = {
        selectDevice: (index: number) => {
          if (index >= 0 && index < allDevices.length) {
            const device = allDevices[index];
            addDebugEvent(`Manual selection of device at index ${index}: ${device.name || device.serial_number}`);
            fetchDeviceReadings(device).then(readings => {
              handleDeviceSelect(device, readings);
            });
            return `Selected device: ${device.name || device.serial_number}`;
          }
          return `Invalid index: ${index}, available: 0-${allDevices.length - 1}`;
        },
        listDevices: () => {
          console.table(allDevices.map((d, i) => ({ 
            index: i, 
            name: d.name || "Unnamed", 
            serial: d.serial_number 
          })));
          return `Found ${allDevices.length} devices`;
        },
        forceUpdate: () => {
          setUpdateCounter(prev => prev + 1);
          return "Forced re-render";
        }
      };
    }
  }, [allDevices, handleDeviceSelect, fetchDeviceReadings]);

  useEffect(() => {
    let mounted = true

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        
        // Step 1: Fetch devices list quickly
        const devices = await getUserDevices()
        if (!mounted || !devices || devices.length === 0) {
          setIsLoading(false)
          return
        }
        setAllDevices(devices)

        // Step 2: Show basic dashboard immediately with device count
        setDashboardStats(prev => ({
          ...prev,
          totalDevices: devices.length
        }))

        // Step 3: Only fetch readings for first device initially (fastest UI response)
        if (!selectedDevice && devices.length > 0) {
          const firstDevice = devices[0]
          
          // Set default device immediately (no waiting for readings)
          setDefaultDevice(firstDevice)
          setIsLoading(false) // Show UI immediately
          
          // Fetch readings asynchronously in background
          fetchDeviceReadings(firstDevice).then(deviceReadings => {
            if (mounted) {
              setDefaultDeviceReadings(deviceReadings)
            }
          }).catch(err => {
            console.warn("Error fetching default device readings:", err)
          })
        } else {
          setIsLoading(false)
        }

        // Step 4: Fetch stats for all devices in background (non-blocking)
        setTimeout(async () => {
          if (!mounted) return
          
          try {
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

            // Batch API calls in smaller chunks to prevent overwhelming
            const BATCH_SIZE = 3
            const allReadingsFlat: FieldEyesSoilReading[] = []
            
            for (let i = 0; i < Math.min(devices.length, 10); i += BATCH_SIZE) {
              const batch = devices.slice(i, i + BATCH_SIZE)
              const batchPromises = batch.map(device => 
                fetchDeviceReadings(device).catch(err => {
                  console.warn(`Failed to fetch readings for device ${device.serial_number}:`, err)
                  return [] // Return empty array for failed requests
                })
              )
              
              const batchResults = await Promise.all(batchPromises)
              allReadingsFlat.push(...batchResults.flat())
              
              // Small delay between batches to prevent API overload
              if (i + BATCH_SIZE < devices.length) {
                await new Promise(resolve => setTimeout(resolve, 100))
              }
            }

            if (mounted) {
              // Update dashboard stats
              const activeDevice = selectedDevice || defaultDevice
              const weeklyReadings = activeDevice 
                ? allReadingsFlat.filter(r => r.serial_number === activeDevice.serial_number && new Date(r.created_at) >= oneWeekAgo)
                : allReadingsFlat.filter(r => new Date(r.created_at) >= oneWeekAgo)
                
              let totalMoisture = 0, moistureCount = 0, totalPh = 0, phCount = 0
              
              weeklyReadings.forEach((reading) => {
                if (reading.soil_moisture !== undefined) {
                  totalMoisture += reading.soil_moisture
                  moistureCount++
                }
                if (reading.ph !== undefined) {
                  totalPh += reading.ph
                  phCount++
                }
              })
              
              const avgMoisture = moistureCount > 0 ? Math.round(totalMoisture / moistureCount) : 0
              const avgPh = phCount > 0 ? Number.parseFloat((totalPh / phCount).toFixed(1)) : 0
              
              const alertCount = weeklyReadings.filter(r => 
                (r.ph !== undefined && (r.ph < 5.5 || r.ph > 7.5)) ||
                (r.soil_moisture !== undefined && (r.soil_moisture < 30 || r.soil_moisture > 70)) ||
                (r.soil_temperature !== undefined && (r.soil_temperature < 15 || r.soil_temperature > 30)) ||
                (r.electrical_conductivity !== undefined && (r.electrical_conductivity < 0.5 || r.electrical_conductivity > 1.5))
              ).length
              
              setDashboardStats({
                totalDevices: devices.length,
                avgMoisture,
                avgPh,
                alertCount,
              })
            }
          } catch (err) {
            console.warn("Error fetching background stats:", err)
            // Don't show error to user since this is background loading
          }
        }, 0) // Start immediately but non-blocking
        
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchDashboardData()

    return () => {
      mounted = false
    }
  }, [selectedDevice])

  // currentDevice and currentReadings are of FieldEyes types
  const currentDevice = selectedDevice || defaultDevice
  const currentReadings = selectedDeviceReadings.length > 0 ? selectedDeviceReadings : defaultDeviceReadings

  // Function to calculate stats for a device
  const calculateDeviceStats = (readings: FieldEyesSoilReading[]) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Filter readings for the last week
    const weeklyReadings = readings.filter(r => new Date(r.created_at) >= oneWeekAgo);
    
    // Calculate moisture and pH averages
    let totalMoisture = 0, moistureCount = 0, totalPh = 0, phCount = 0;
    
    weeklyReadings.forEach(reading => {
      if (reading.soil_moisture !== undefined) {
        totalMoisture += reading.soil_moisture;
        moistureCount++;
      }
      if (reading.ph !== undefined) {
        totalPh += reading.ph;
        phCount++;
      }
    });
    
    const avgMoisture = moistureCount > 0 ? Math.round(totalMoisture / moistureCount) : 0;
    const avgPh = phCount > 0 ? Number.parseFloat((totalPh / phCount).toFixed(1)) : 0;
    
    // Count alerts
    const alertCount = weeklyReadings.filter(r => 
      (r.ph !== undefined && (r.ph < 5.5 || r.ph > 7.5)) ||
      (r.soil_moisture !== undefined && (r.soil_moisture < 30 || r.soil_moisture > 70)) ||
      (r.soil_temperature !== undefined && (r.soil_temperature < 15 || r.soil_temperature > 30)) ||
      (r.electrical_conductivity !== undefined && (r.electrical_conductivity < 0.5 || r.electrical_conductivity > 1.5))
    ).length;
    
    return { avgMoisture, avgPh, alertCount };
  };
  
  // Handle temp stats update on hover - now stats persist between hovers
  const handleDeviceHover = useCallback((device: FieldEyesDevice, readings: FieldEyesSoilReading[], isHovering: boolean) => {
    if (isHovering) {
      // Calculate stats for the hovered device
      const stats = calculateDeviceStats(readings);
      
      // Store hover stats with device info
      setHoveredStats({
        ...stats,
        isHovering: true,
        deviceName: device.name || "Sensor",
        deviceSerial: device.serial_number
      });
      
      // Store hovered device and readings
      setHoveredDevice(device);
      setHoveredReadings(readings);
      
      addDebugEvent(`Hover stats for ${device.name || device.serial_number}: Moisture: ${stats.avgMoisture}%, pH: ${stats.avgPh}`);
    }
    // No longer resetting on mouseout - stats persist until next hover
  }, []);
  
  // Prepare stats for display - use hovered stats if available (persists between hovers)
  const displayStats = hoveredStats 
    ? {
        ...dashboardStats,
        avgMoisture: hoveredStats.avgMoisture,
        avgPh: hoveredStats.avgPh,
        alertCount: hoveredStats.alertCount
      }
    : dashboardStats;

  // Determine which device and readings to show in the soil health indicator
  const displayDevice = hoveredDevice || currentDevice;
  const displayReadings = hoveredDevice ? hoveredReadings : currentReadings;
  
  // Prepare props for SoilHealthIndicator using adapters with either hovered or selected device
  const indicatorDevice = transformDeviceForIndicator(displayDevice);
  const indicatorReadings = transformReadingsForIndicator(displayReadings, displayDevice);

  if (isLoading) {
    return (
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="space-y-0 pb-2">
                  <Skeleton className="h-4 w-[100px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[60px]" />
                  <Skeleton className="h-4 w-[120px] mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <Skeleton className="h-6 w-[100px]" />
                <Skeleton className="h-4 w-[200px]" />
              </CardHeader>
              <CardContent className="p-0">
                <Skeleton className="h-[600px] w-full" />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <Skeleton className="h-6 w-[100px]" />
                <Skeleton className="h-4 w-[200px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[400px] w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Show skeleton loading only on initial load
  if (isLoading && allDevices.length === 0) {
    return (
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2 mb-6">
            <Skeleton className="h-9 w-[200px]" />
          </div>
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex-col md:flex">
        {/* REMOVED Debug Panel */}
        
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-primary"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayStats.totalDevices}</div>
                <p className="text-xs text-muted-foreground">
                  Active monitoring devices
                </p>
              </CardContent>
            </Card>
            <Card className={hoveredStats ? "border-blue-400 transition-all duration-300" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Soil Moisture</CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-blue-500"
                >
                  <path d="M16 18a4 4 0 0 0-8 0" />
                  <path d="M12 2v5" />
                  <path d="m4.93 10.93 2.83-2.83" />
                  <path d="M2 18h2" />
                  <path d="M20 18h2" />
                  <path d="m19.07 10.93-2.83-2.83" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold transition-all duration-300 ${hoveredStats ? "text-blue-600" : ""}`}>
                  {displayStats.avgMoisture}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {hoveredStats 
                    ? `${hoveredStats.deviceName} (${hoveredStats.deviceSerial})` 
                    : currentDevice 
                      ? `${currentDevice.name || "Selected Device"} (${currentDevice.serial_number})`
                      : "Weekly average across all devices"} | Optimal: 40-60%
                </p>
              </CardContent>
            </Card>
            <Card className={hoveredStats ? "border-purple-400 transition-all duration-300" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Soil pH</CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-purple-500"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold transition-all duration-300 ${hoveredStats ? "text-purple-600" : ""}`}>
                  {displayStats.avgPh}
                </div>
                <p className="text-xs text-muted-foreground">
                  {hoveredStats 
                    ? `${hoveredStats.deviceName} (${hoveredStats.deviceSerial})` 
                    : currentDevice 
                      ? `${currentDevice.name || "Selected Device"} (${currentDevice.serial_number})`
                      : "Weekly average across all devices"} | Optimal: 6.0-7.0
                </p>
              </CardContent>
            </Card>
            <Card className={hoveredStats ? "border-red-400 transition-all duration-300" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-destructive"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold transition-all duration-300 ${hoveredStats ? "text-red-600" : ""}`}>
                  {displayStats.alertCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active alerts requiring attention
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Map</CardTitle>
                <CardDescription>Location of your soil monitoring devices</CardDescription>
              </CardHeader>
              <CardContent className="p-0" style={{ height: '600px', position: 'relative' }}>
                <DashboardMap 
                  onDeviceSelect={handleDeviceSelect}
                  onDeviceHover={handleDeviceHover}
                />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Soil Health</CardTitle>
                <CardDescription>
                  {hoveredDevice 
                    ? `Soil health indicators for ${hoveredDevice.name || hoveredDevice.serial_number}`
                    : currentDevice 
                      ? `Soil health indicators for ${currentDevice.name || currentDevice.serial_number}`
                      : "No device data available"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SoilHealthIndicator 
                  key={`soil-indicator-${displayDevice?.serial_number}-${updateCounter}-${hoveredDevice ? "hovered" : "selected"}`}
                  device={indicatorDevice} 
                  readings={indicatorReadings}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
