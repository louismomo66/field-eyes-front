"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Eye, Loader2, Plus, Trash2 } from "lucide-react"
import { getUserDevices, getAllDevicesForAdmin, claimDevice, deleteDevice, getLatestDeviceLog, getLatestDeviceLogForAdmin, registerDevice, APIError } from "@/lib/field-eyes-api"
import { transformDevices } from "@/lib/transformers"
import { Device } from "@/types/field-eyes"
import { useToast } from "@/components/ui/use-toast"
import { isAdmin } from "@/lib/client-auth"
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
              // Use admin endpoint if user is admin, otherwise use regular endpoint
              const latestReading = isAdmin() 
                ? await getLatestDeviceLogForAdmin(device.serial_number)
                : await getLatestDeviceLog(device.serial_number)
              
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
                name: device.name || `Field Sensor ${device.id}`, // Use provided name if available, fall back to default
                status,
                lastReading: formatRelativeTime(latestReading.created_at)
              }
            } catch (err) {
              // If we can't get the latest reading, mark as inactive
              return {
                ...device,
                name: device.name || `Field Sensor ${device.id}`, // Use provided name if available, fall back to default
                status: "offline" as const,
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
  ).map(device => {
    // Special handling for specific device with serial number 9565985947890
    if (device.serial_number === "9565985947890") {
      // Use window.localStorage to store and retrieve the custom name
      const storedName = typeof window !== 'undefined' ? window.localStorage.getItem('custom_name_9565985947890') : null;
      
      if (storedName) {
        console.log(`Using stored custom name for device 9565985947890: "${storedName}"`);
        return { ...device, name: storedName };
      } else if (typeof window !== 'undefined') {
        // Only prompt once to avoid annoying the user
        const hasPrompted = window.localStorage.getItem('prompted_for_name_9565985947890');
        if (!hasPrompted) {
          // Ask the user for their preferred name for this device
          setTimeout(() => {
            const customName = window.prompt("What would you like to name your device 9565985947890?", "My Field Sensor");
            if (customName) {
              window.localStorage.setItem('custom_name_9565985947890', customName);
              // Refresh the page to show the new name
              window.location.reload();
            }
            window.localStorage.setItem('prompted_for_name_9565985947890', 'true');
          }, 1000);
        }
      }
    }
    return device;
  })
  
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
      
      // Get the device name if provided
      const nameToUse = deviceName.trim() || undefined;
      
      try {
        // First attempt to claim the existing device with the Field Eyes API
        console.log(`Attempting to claim device ${serialNumber} with name "${nameToUse || 'not provided'}"`);
        const result = await claimDevice(serialNumber, nameToUse);
        
        console.log("Device claim result:", result);
        console.log("Device name provided:", nameToUse);
      } catch (claimErr) {
        // If the claim fails with a "device not found" error, try to register it first
        if (claimErr instanceof APIError && claimErr.message.includes("device not found")) {
          console.log("Device not found, attempting to register it first...");
          
          // Register the device first
          const registerResult = await registerDevice({
            device_type: "soil_sensor",
            serial_number: serialNumber
          });
          
          console.log("Device registration result:", registerResult);
          
          // Now try to claim it again
          console.log("Attempting to claim the newly registered device...");
          await claimDevice(serialNumber, nameToUse);
        } else {
          // If it's a different error, rethrow it
          throw claimErr;
        }
      }
      
      toast({
        title: "Device Added",
        description: "The device has been successfully added to your account",
      })
      
      // Reset form and close dialog
      setSerialNumber("")
      setDeviceName("")
      setIsAddDeviceOpen(false)
      
      // Refresh the devices list
      const rawDevices = await getUserDevices()
      console.log("Raw devices after claiming:", rawDevices);
      const transformedDevices = transformDevices(rawDevices)
      console.log("Transformed devices after claiming:", transformedDevices);
      
      // Find the newly added device and ensure it has the name the user provided
      const updatedDevices = transformedDevices.map(device => {
        if (device.serial_number === serialNumber && nameToUse) {
          console.log(`Manually setting name for device ${serialNumber} to "${nameToUse}"`);
          return { ...device, name: nameToUse };
        }
        return device;
      });
      
      setDevices(updatedDevices)
    } catch (err) {
      console.error("Error claiming device:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to claim device. Please ensure the serial number is correct and the device is not already claimed.",
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
              <DialogTitle>Add a Device</DialogTitle>
              <DialogDescription>Add an existing device to your account by entering its serial number.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="device-id">Device Serial Number</Label>
                <Input 
                  id="device-id" 
                  placeholder="Enter the device serial number" 
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the serial number printed on your device.
                </p>
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
                  Give your device a friendly name to easily identify it in your dashboard.
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
            {searchTerm ? "Try adjusting your search terms" : "Click 'Add Device' to add an existing device to your account"}
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
                <TableHead className="w-1/4">Device Name</TableHead>
                <TableHead className="w-1/4">Serial Number</TableHead>
                <TableHead className="w-1/6">Status</TableHead>
                <TableHead className="w-1/6">Last Reading</TableHead>
                <TableHead className="w-1/6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.filter(device => device !== null && device !== undefined).map((device) => (
                <TableRow key={device.serial_number}>
                  <TableCell className="font-medium w-1/4">{device.name}</TableCell>
                  <TableCell className="text-sm text-gray-600 w-1/4">{device.serial_number}</TableCell>
                  <TableCell className="w-1/6">
                    <Badge className={`text-xs ${
                      device.status === "active"
                        ? "bg-green-500"
                        : device.status === "warning"
                          ? "bg-amber-500 text-white"
                          : "bg-red-500 text-white"
                    }`}>
                      {device.status === "active" 
                        ? "Active" 
                        : device.status === "warning" 
                          ? "Warning" 
                          : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 w-1/6">{device.lastReading}</TableCell>
                  <TableCell className="text-right w-1/6">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/devices/${device.serial_number}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteDevice(device.serial_number)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
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
