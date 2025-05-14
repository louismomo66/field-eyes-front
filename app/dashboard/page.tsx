"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/dashboard/overview"
import { RecentReadings } from "@/components/dashboard/recent-readings"
import { SoilHealthIndicator } from "@/components/dashboard/soil-health-indicator"
import { getUserDevices, getDeviceLogs } from "@/lib/field-eyes-api"
import { transformDevices, transformSoilReadings } from "@/lib/transformers"
import type { Device as FieldEyesDevice, SoilReading as FieldEyesSoilReading } from "@/types/field-eyes"
import type { Device as IndexDevice, SoilReading as IndexSoilReading } from "@/types"
import dynamic from 'next/dynamic'
import { Skeleton } from "@/components/ui/skeleton"

// Dynamically import the FixedMap component with no SSR
const DashboardMap = dynamic(
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
  return readings.map(reading => {
    const deviceNameStr = sourceDevice?.name || sourceDevice?.serial_number || reading.serial_number;
    let calculatedStatus: IndexSoilReading['status'] = "optimal";
    if (reading.soil_moisture !== undefined) {
      if (reading.soil_moisture < 30) calculatedStatus = "critical";
      else if (reading.soil_moisture > 70) calculatedStatus = "warning";
    }
    const transformedReading: IndexSoilReading = {
      id: String(reading.id || `${reading.serial_number}-${reading.created_at}`),
      deviceId: reading.serial_number,
      deviceName: deviceNameStr,
      timestamp: reading.created_at,
      moisture: reading.soil_moisture,
      temperature: reading.soil_temperature,
      ph: reading.ph,
      nitrogen: reading.nitrogen,
      phosphorus: reading.phosphorous,
      potassium: reading.potassium,
      ec: reading.electrical_conductivity,
      status: calculatedStatus,
    };
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

  const fetchDeviceReadings = async (device: FieldEyesDevice): Promise<FieldEyesSoilReading[]> => {
    try {
      const readings = await getDeviceLogs(device.serial_number);
      return readings ? readings.map(r => ({...r})) : [];
    } catch (err) {
      console.error(`Error fetching logs for device ${device.serial_number}:`, err)
      return []
    }
  }
  
  // Function to update everything at once
  const updateAllStates = (device: FieldEyesDevice, readings: FieldEyesSoilReading[]) => {
    // Update the device and readings
    setSelectedDevice(device);
    setSelectedDeviceReadings(readings);
    
    // Update counter to force re-renders
    setUpdateCounter(prev => prev + 1);
    
    // Calculate dashboard stats
    const totalDevices = allDevices.length;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const relevantReadings = readings.filter(r => r.serial_number === device.serial_number);
    const weeklyReadings = relevantReadings.filter(r => new Date(r.created_at) >= oneWeekAgo);
    
    let totalMoisture = 0, moistureCount = 0, totalPh = 0, phCount = 0;
    
    weeklyReadings.forEach((reading) => {
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
    
    const alertCount = weeklyReadings.filter((r) => {
      return (
        (r.ph !== undefined && (r.ph < 5.5 || r.ph > 7.5)) ||
        (r.soil_moisture !== undefined && (r.soil_moisture < 30 || r.soil_moisture > 70)) ||
        (r.soil_temperature !== undefined && (r.soil_temperature < 15 || r.soil_temperature > 30)) ||
        (r.electrical_conductivity !== undefined && (r.electrical_conductivity < 0.5 || r.electrical_conductivity > 1.5))
      );
    }).length;
    
    // Update dashboard stats
    setDashboardStats({
      totalDevices,
      avgMoisture,
      avgPh,
      alertCount,
    });
  };

  useEffect(() => {
    let mounted = true

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        
        const devices: FieldEyesDevice[] = await getUserDevices()
        if (!mounted || !devices || devices.length === 0) {
          setIsLoading(false)
          return
        }
        setAllDevices(devices)

        if (!selectedDevice && devices.length > 0) {
          const firstDevice = devices[0]
          const deviceReadings = await fetchDeviceReadings(firstDevice)
          
          if (mounted) {
            setDefaultDevice(firstDevice)
            setDefaultDeviceReadings(deviceReadings)
          }
        }

        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        const readingsForStatsPromises = devices.slice(0, 5).map(device => fetchDeviceReadings(device))
        const allReadingsArrays = await Promise.all(readingsForStatsPromises);
        const allReadingsFlat: FieldEyesSoilReading[] = allReadingsArrays.flat();

        if (mounted) {
          updateAllStates(
            devices[0], 
            allReadingsFlat
          )
        setIsLoading(false)
        }
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
  }, [selectedDevice, updateAllStates])

  // currentDevice and currentReadings are of FieldEyes types
  const currentDevice = selectedDevice || defaultDevice
  const currentReadings = selectedDeviceReadings.length > 0 ? selectedDeviceReadings : defaultDeviceReadings

  // Prepare props for SoilHealthIndicator using adapters
  const indicatorDevice = transformDeviceForIndicator(currentDevice);
  const indicatorReadings = transformReadingsForIndicator(currentReadings, currentDevice);

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

  return (
    <>
      <div className="flex-col md:flex">
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
            <div className="text-2xl font-bold">{dashboardStats.totalDevices}</div>
                <p className="text-xs text-muted-foreground">
                  Active monitoring devices
                </p>
          </CardContent>
        </Card>
        <Card>
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
            <div className="text-2xl font-bold">{dashboardStats.avgMoisture}%</div>
                <p className="text-xs text-muted-foreground">
                  {currentDevice 
                    ? `Weekly average for ${currentDevice.name || "Selected Device"}`
                    : "Weekly average across all devices"} | Optimal: 40-60%
                </p>
          </CardContent>
        </Card>
        <Card>
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
            <div className="text-2xl font-bold">{dashboardStats.avgPh}</div>
                <p className="text-xs text-muted-foreground">
                  {currentDevice 
                    ? `Weekly average for ${currentDevice.name || "Selected Device"}`
                    : "Weekly average across all devices"} | Optimal: 6.0-7.0
                </p>
          </CardContent>
        </Card>
        <Card>
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
            <div className="text-2xl font-bold">{dashboardStats.alertCount}</div>
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
                  onDeviceSelect={(device, readings) => {
                    console.log("Direct inline callback fired!");
                    updateAllStates(device, readings);
                  }} 
                />
              </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Soil Health</CardTitle>
                <CardDescription>
                  {currentDevice 
                    ? `Soil health indicators for ${currentDevice.name || currentDevice.serial_number}`
                    : "No device data available"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SoilHealthIndicator 
                  key={`health-${currentDevice?.serial_number || 'default'}-${updateCounter}`}
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
