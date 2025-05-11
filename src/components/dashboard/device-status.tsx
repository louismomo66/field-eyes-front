"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Battery, Signal, ThermometerSun, Droplets, FlaskConical } from "lucide-react"
import { getDevices } from "@/lib/api"
import type { Device } from "@/types"

export function DeviceStatus() {
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true;

    const fetchDevices = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch devices from API
        const data = await getDevices()
        
        if (!isMounted) return;

        if (!data || !Array.isArray(data)) {
          throw new Error("Invalid device data received");
        }

        setDevices(data)
        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return;
        console.error("Error fetching devices:", err)
        setError("Failed to load devices")
        setIsLoading(false)
      }
    }

    fetchDevices()

    return () => {
      isMounted = false;
    }
  }, [])

  if (isLoading) {
    return <div className="flex justify-center items-center h-[200px]">Loading devices...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-[200px] text-red-500">{error}</div>
  }

  if (devices.length === 0) {
    return <div className="flex justify-center items-center h-[200px]">No devices available</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {devices.map((device) => (
        <Card key={device.id}>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{device.name}</span>
                <Badge
                  className={
                    device.status === "active"
                      ? "bg-green-500"
                      : device.status === "warning"
                        ? "text-amber-500 border-amber-500"
                        : "text-red-500 border-red-500"
                  }
                >
                  {device.status === "active" ? "Online" : device.status === "warning" ? "Warning" : "Offline"}
                </Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Battery
                  className={`mr-1 h-4 w-4 ${device.battery && device.battery > 20 ? "text-green-500" : "text-amber-500"}`}
                />
                {device.battery ? `${device.battery}% Battery` : "Unknown Battery"}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Signal className={`mr-1 h-4 w-4 ${device.status !== "offline" ? "text-green-500" : "text-red-500"}`} />
                {device.signal || "No Signal"}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <ThermometerSun className="mr-1 h-4 w-4" />
                {device.readings.temperature !== undefined ? `${device.readings.temperature}°C` : "N/A"}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Droplets className="mr-1 h-4 w-4" />
                {device.readings.moisture !== undefined ? `${device.readings.moisture}% Moisture` : "N/A"}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <FlaskConical className="mr-1 h-4 w-4" />
                {device.readings.ph !== undefined ? `pH ${device.readings.ph}` : "N/A"}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
