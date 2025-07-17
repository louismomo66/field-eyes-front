"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSoilReadings, getDevices } from "@/lib/api"
import type { Device } from "@/types"
import type { SoilReading } from "@/types/field-eyes"

export function RecentReadings() {
  const [readings, setReadings] = useState<SoilReading[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReadings = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // First, fetch available devices
        const devices = await getDevices()
        
        if (devices.length === 0) {
          setError("No devices available")
          setIsLoading(false)
          return
        }

        // Get the most recent reading for each device
        const latestReadings: SoilReading[] = []
        for (const device of devices) {
          if (device.serial_number) {
            const deviceReadings = await getSoilReadings(device.serial_number)
            if (deviceReadings.length > 0) {
              // Get the most recent reading for this device
              const latestReading = deviceReadings.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]
              latestReadings.push(latestReading)
            }
          }
        }

        // Sort by timestamp (newest first)
        const sortedData = latestReadings.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        setReadings(sortedData)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching recent readings:", err)
        setError("Failed to load recent readings")
        setIsLoading(false)
      }
    }

    fetchReadings()
  }, [])

  // Helper function to format relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const readingTime = new Date(timestamp)
    const diffMs = now.getTime() - readingTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-[200px]">Loading recent readings...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-[200px] text-red-500">{error}</div>
  }

  if (readings.length === 0) {
    return <div className="flex justify-center items-center h-[200px]">No recent readings available</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Device</TableHead>
            <TableHead>Moisture</TableHead>
            <TableHead>Temperature</TableHead>
            <TableHead>pH</TableHead>
            <TableHead>Nitrogen</TableHead>
            <TableHead>Phosphorous</TableHead>
            <TableHead>Potassium</TableHead>
            <TableHead>EC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {readings.map((reading) => (
            <TableRow key={`${reading.serial_number}-${reading.created_at}`}>
              <TableCell className="font-medium">{formatRelativeTime(reading.created_at)}</TableCell>
              <TableCell>{`Sensor ${reading.device_id}`}</TableCell>
              <TableCell>{reading.soil_moisture !== undefined ? `${reading.soil_moisture}%` : "N/A"}</TableCell>
              <TableCell>{reading.soil_temperature !== undefined ? `${reading.soil_temperature}°C` : "N/A"}</TableCell>
              <TableCell>{reading.ph !== undefined ? reading.ph : "N/A"}</TableCell>
              <TableCell>{reading.nitrogen !== undefined ? `${reading.nitrogen} mg/kg` : "N/A"}</TableCell>
              <TableCell>{reading.phosphorous !== undefined ? `${reading.phosphorous} mg/kg` : "N/A"}</TableCell>
              <TableCell>{reading.potassium !== undefined ? `${reading.potassium} mg/kg` : "N/A"}</TableCell>
              <TableCell>{reading.electrical_conductivity !== undefined ? `${(reading.electrical_conductivity * 1000).toFixed(0)} µS/cm` : "N/A"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
