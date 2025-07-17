"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { getSoilReadings, getDevices } from "@/lib/api"
import type { SoilReading as IndexSoilReading, Device } from "@/types"
import type { SoilReading as FieldEyesSoilReading } from "@/types/field-eyes"

export function Overview() {
  const [data, setData] = useState<any[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // First, fetch available devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const userDevices = await getDevices()
        setDevices(userDevices)
        
        // Select the first device by default
        if (userDevices.length > 0) {
          setSelectedDevice(userDevices[0])
        }
      } catch (err) {
        console.error("Error fetching devices:", err)
        setError("Failed to load devices")
        setIsLoading(false)
      }
    }

    fetchDevices()
  }, [])

  // Then, fetch readings for the selected device
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDevice?.id) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Fetch soil readings for the selected device
        const readings = await getSoilReadings(selectedDevice.id)

        // Map readings to the expected format
        const mappedReadings = readings.map(reading => ({
          // Required fields from IndexSoilReading type
          id: reading.id?.toString() || `reading-${reading.device_id}-${Date.now()}`,
          deviceId: reading.device_id.toString(),
          deviceName: selectedDevice.name,
          status: "optimal",
          // Fields used in the processReadingsForChart function
          moisture: reading.moisture || reading.soil_moisture,
          temperature: reading.temperature || reading.soil_temperature,
          ph: reading.ph,
          // Add EC field with fallbacks
          ec: reading.ec !== undefined ? Number(reading.ec) : 
               reading.electrical_conductivity !== undefined ? Number(reading.electrical_conductivity) : undefined,
          timestamp: reading.created_at || new Date().toISOString()
        } as IndexSoilReading))

        // Process the data for the chart
        const processedData = processReadingsForChart(mappedReadings)

        setData(processedData)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching overview data:", err)
        setError("Failed to load chart data")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedDevice])

  // Process readings into chart-friendly format
  const processReadingsForChart = (readings: IndexSoilReading[]) => {
    // Group readings by date/time period
    const groupedData: { [key: string]: any } = {}

    readings.forEach((reading) => {
      // Extract date part only
      const date = new Date(reading.timestamp).toLocaleDateString()

      if (!groupedData[date]) {
        groupedData[date] = {
          name: date,
          moisture: 0,
          temperature: 0,
          ph: 0,
          ec: 0,
          count: 0,
        }
      }

      // Sum values for averaging
      if (reading.moisture !== undefined) groupedData[date].moisture += reading.moisture
      if (reading.temperature !== undefined) groupedData[date].temperature += reading.temperature
      if (reading.ph !== undefined) groupedData[date].ph += reading.ph
      if (reading.ec !== undefined) groupedData[date].ec += reading.ec
      groupedData[date].count++
    })

    // Calculate averages and format for chart
    return Object.values(groupedData).map((group) => ({
      name: group.name,
      moisture: group.count > 0 ? Number((group.moisture / group.count).toFixed(2)) : 0,
      temperature: group.count > 0 ? Number((group.temperature / group.count).toFixed(2)) : 0,
      ph: group.count > 0 ? Number((group.ph / group.count).toFixed(2)) : 0,
      // Convert EC from mS/cm to µS/cm for chart display
      ec: group.count > 0 ? Number(((group.ec / group.count) * 1000).toFixed(0)) : 0,
    }))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[350px]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-sm text-gray-500">Loading chart data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[350px] text-red-500">
        <div className="text-center">
          <p className="font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-1">Please try again later</p>
        </div>
      </div>
    )
  }

  if (!selectedDevice) {
    return (
      <div className="flex justify-center items-center h-[350px] text-gray-500">
        <div className="text-center">
          <p className="font-medium">No devices available</p>
          <p className="text-sm mt-1">Please add a device to view soil readings</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-[350px] text-gray-500">
        <div className="text-center">
          <p className="font-medium">No data available</p>
          <p className="text-sm mt-1">No readings found for the selected device</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Soil Readings for {selectedDevice.name}
        </h3>
        {devices.length > 1 && (
          <select
            value={selectedDevice.id}
            onChange={(e) => {
              const device = devices.find(d => d.id === e.target.value)
              if (device) setSelectedDevice(device)
            }}
            className="rounded-md border border-gray-300 py-1 px-3 text-sm"
          >
            {devices.map(device => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="moisture" 
            name="Moisture (%)" 
            stroke="#3b82f6" 
            activeDot={{ r: 8 }} 
          />
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="temperature" 
            name="Temperature (°C)" 
            stroke="#ef4444" 
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="ph" 
            name="pH" 
            stroke="#10b981" 
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="ec" 
                            name="EC (µS/cm)" 
            stroke="#06b6d4" 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
