"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Battery, Eye, Loader2, Plus, Signal, Trash2 } from "lucide-react"
import { getUserDevices, registerDevice, deleteDevice, getLatestDeviceLog } from "@/lib/field-eyes-api"
import { transformDevices } from "@/lib/transformers"
import { Device } from "@/types/field-eyes"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function DevicesPage() {
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [deviceName, setDeviceName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
  // Fetch devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Get devices from Field Eyes API
        const rawDevices = await getUserDevices()
        const transformedDevices = transformDevices(rawDevices)
        
        // For each device, fetch the latest readings to get status information
        const devicesWithReadings = await Promise.all(
          transformedDevices.map(async (device) => {
            try {
              const latestReading = await getLatestDeviceLog(device.serial_number)
              
              // Determine device status based on latest reading timestamp
              const now = new Date()
              const readingTime = new Date(latestReading.created_at)
              const diffMs = now.getTime() - readingTime.getTime()
              const diffMins = Math.floor(diffMs / 60000)
              
              // If reading is older than 30 minutes, mark as offline
              let status: "active" | "warning" | "offline" = "active"
              if (diffMins > 30) {
                status = "offline"
              }
              
              // Return device with enhanced information
              return {
                ...device,
                name: `Field Sensor ${device.id}`, // Use a better name if available
                status,
                battery: Math.floor(Math.random() * 100), // Simulate battery level
                signal: status === "offline" ? "No Signal" : "Strong",
                lastReading: formatRelativeTime(latestReading.created_at)
              }
            } catch (err) {
              // If we can't get the latest reading, mark as inactive
              return {
                ...device,
                name: `Field Sensor ${device.id}`,
                status: "offline" as const,
                battery: 0,
                signal: "No Signal",
                lastReading: "Unknown"
              }
            }
          })
        )
        
        setDevices(devicesWithReadings)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching devices:", err)
        setError("Failed to load devices. Please try again.")
        setIsLoading(false)
      }
    }
    
    fetchDevices()
  }, [])
  
  // Helper function to format relative time
  const formatRelativeTime = (timestamp: string) => {
    if (!timestamp) return "Unknown"
    
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
  
  // Filter devices based on search term
  const filteredDevices = devices.filter(device => 
    !searchTerm || 
    (device.name && device.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    device.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Handle adding a new device
  const handleAddDevice = async () => {
    if (!serialNumber) {
      toast({
        title: "Error",
        description: "Device ID (serial number) is required",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Register the device with the Field Eyes API
      await registerDevice({
        device_type: "soil_sensor",
        serial_number: serialNumber
      })
      
      toast({
        title: "Device Added",
        description: "The device has been successfully registered to your account",
      })
      
      // Reset form and close dialog
      setSerialNumber("")
      setDeviceName("")
      setIsAddDeviceOpen(false)
      
      // Refresh the devices list
      const rawDevices = await getUserDevices()
      const transformedDevices = transformDevices(rawDevices)
      setDevices(transformedDevices)
    } catch (err) {
      console.error("Error adding device:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add device. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle deleting a device
  const handleDeleteDevice = async (serialNumber: string) => {
    if (!confirm("Are you sure you want to delete this device? This action cannot be undone.")) {
      return
    }
    
    try {
      await deleteDevice(serialNumber)
      
      toast({
        title: "Device Deleted",
        description: "The device has been successfully removed from your account",
      })
      
      // Update the devices list
      setDevices(devices.filter(d => d.serial_number !== serialNumber))
    } catch (err) {
      console.error("Error deleting device:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete device. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground">Manage and monitor your soil sensing devices</p>
        </div>
        <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>Register a new soil monitoring device to your account.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="device-id">Device ID (Serial Number)</Label>
                <Input 
                  id="device-id" 
                  placeholder="Enter device serial number" 
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="device-name">Device Name (Optional)</Label>
                <Input 
                  id="device-name" 
                  placeholder="e.g. North Field Sensor" 
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The device name is for your reference only. It will be displayed in the dashboard.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDeviceOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700" 
                onClick={handleAddDevice}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Device'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="mb-6">
        <Input 
          className="w-full max-w-md" 
          placeholder="Search devices..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <span className="ml-2">Loading devices...</span>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-[200px] text-center">
          <p className="text-lg font-medium mb-2">No devices found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Click 'Add Device' to register your first device"}
          </p>
          {!searchTerm && (
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsAddDeviceOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Device Name</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Battery</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead>Last Reading</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell>{device.serial_number}</TableCell>
                  <TableCell>
                    <Badge className={
                      device.status === "active"
                        ? "bg-green-500"
                        : device.status === "warning"
                          ? "bg-amber-500 text-white"
                          : "bg-red-500 text-white"
                    }>
                      {device.status === "active" 
                        ? "Active" 
                        : device.status === "warning" 
                          ? "Warning" 
                          : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Battery className={`h-4 w-4 mr-1 ${
                        device.battery && device.battery > 20 
                          ? "text-green-500" 
                          : device.battery && device.battery > 0 
                            ? "text-amber-500" 
                            : "text-gray-400"
                      }`} />
                      <span>{device.battery && device.battery > 0 ? `${device.battery}%` : "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Signal className={`h-4 w-4 mr-1 ${
                        device.status === "active" 
                          ? "text-green-500" 
                          : "text-red-500"
                      }`} />
                      <span>{device.signal}</span>
                    </div>
                  </TableCell>
                  <TableCell>{device.lastReading}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/devices/${device.serial_number}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteDevice(device.serial_number)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
