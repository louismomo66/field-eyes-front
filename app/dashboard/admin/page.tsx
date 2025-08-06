"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getAllDevicesForAdmin, getDeviceLogsForAdmin, getLatestDeviceLogForAdmin } from "@/lib/field-eyes-api"
import { isAdmin } from "@/lib/client-auth"
import { Device, SoilReading } from "@/types/field-eyes"
import { Search, Eye, Users, Cpu, Database, Calendar, Info, RefreshCw } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [deviceLogs, setDeviceLogs] = useState<SoilReading[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)
  const [deviceLastActivity, setDeviceLastActivity] = useState<Record<number, Date>>({})
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const router = useRouter()

  const [isAdminUser, setIsAdminUser] = useState(false)

  useEffect(() => {
    // Use a simple approach to avoid issues
    const checkAdminStatus = () => {
      if (typeof window !== 'undefined') {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            // Simple check for admin role in token
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            const isAdmin = payload.role === 'admin';
            
            setIsAdminUser(isAdmin);
            
            if (!isAdmin) {
              router.push("/dashboard");
              return;
            }
            
            fetchDevices();
          } else {
            router.push("/dashboard");
          }
        } catch (err) {
          console.error("Error checking admin status:", err);
          router.push("/dashboard");
        }
      }
    };
    
    checkAdminStatus();
  }, [router])
  
  // Set up periodic refresh of device status
  useEffect(() => {
    // Only set up refresh if we're on the admin page
    if (!isAdminUser) return;
    
    // Initial refresh when component mounts
    if (devices.length > 0 && !refreshing) {
      console.log("Initial device activity refresh...");
      setRefreshing(true);
      fetchDeviceActivity(devices)
        .then(() => {
          setLastRefresh(new Date());
          setRefreshing(false);
        })
        .catch(err => {
          console.error("Error during initial refresh:", err);
          setRefreshing(false);
        });
    }
    
    // Refresh device activity every 30 seconds (more frequent than before)
    const refreshInterval = setInterval(() => {
      if (!refreshing && devices.length > 0) {
        console.log("Auto-refreshing device activity status...");
        setRefreshing(true);
        fetchDeviceActivity(devices)
          .then(() => {
            setLastRefresh(new Date());
            setRefreshing(false);
          })
          .catch(err => {
            console.error("Error during auto-refresh:", err);
            setRefreshing(false);
          });
      }
    }, 30000); // 30 seconds (more frequent updates)
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, [isAdminUser, devices, refreshing]);

  useEffect(() => {
        // Filter devices based on search term
    const filtered = devices.filter(device =>
      device.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.name && device.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredDevices(filtered)
  }, [devices, searchTerm])

  const fetchDevices = async () => {
    try {
      setLoading(true)
      const devicesData = await getAllDevicesForAdmin()
      setDevices(devicesData)
      setError(null)
      
      // After fetching devices, get the latest activity for each
      await fetchDeviceActivity(devicesData)
    } catch (err: any) {
      setError(err.message || "Failed to fetch devices")
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch the latest log for each device to determine activity status
  const fetchDeviceActivity = async (devicesList: Device[]) => {
    // Create a new activity map to avoid any potential issues with shared references
    const activityMap: Record<number, Date> = {}
    
    try {
      console.log(`Fetching activity for ${devicesList.length} devices...`)
      
      // Process each device STRICTLY ONE AT A TIME to avoid any race conditions
      for (let i = 0; i < devicesList.length; i++) {
        const device = devicesList[i]
        
        try {
          // Clear log to make it easier to track each device individually
          console.log('----------------------------------------------')
          console.log(`Processing device ${i+1}/${devicesList.length}: ${device.serial_number} (ID: ${device.id})`)
          
          // Use the admin-specific endpoint to get the latest log
          // Wait for each request to complete before moving to the next device
          const latestLog = await getLatestDeviceLogForAdmin(device.serial_number)
          
          // Log the result with the device ID to ensure we're tracking the right device
          console.log(`Latest log for device ${device.serial_number} (ID: ${device.id}):`, latestLog ? {
            id: latestLog.id,
            created_at: latestLog.created_at,
            serial_number: latestLog.serial_number,
            hasTimestamp: !!latestLog.created_at
          } : 'No log data')
          
          // Verify that the log is for the correct device
          if (latestLog && latestLog.serial_number && latestLog.serial_number !== device.serial_number) {
            console.error(`CRITICAL ERROR: Mismatch! Log serial ${latestLog.serial_number} doesn't match device ${device.serial_number}`)
            continue // Skip this device if there's a mismatch
          }
          
          // Only add to activity map if we have a valid timestamp
          if (latestLog && latestLog.created_at) {
            const timestamp = new Date(latestLog.created_at)
            activityMap[device.id] = timestamp
            console.log(`SUCCESS: Added activity for device ${device.id} (${device.serial_number}): ${timestamp.toISOString()}`)
          } else {
            console.log(`No valid timestamp for device ${device.id} (${device.serial_number})`)
          }
        } catch (error) {
          // Handle "no logs found" error gracefully - this is expected for new devices
          if (error instanceof Error && error.message.includes("no logs found")) {
            console.log(`No logs found for device ${device.serial_number} (ID: ${device.id}) - this is normal for new devices`)
          } else {
            console.error(`Error fetching latest log for device ${device.serial_number} (ID: ${device.id}):`, error)
          }
          
          // Even with error, we don't need to do anything special - device will be shown as offline
          // which is correct since it has no logs
        }
      }
      
      // Debug the activity map before setting state
      console.log('----------------------------------------------')
      console.log('FINAL ACTIVITY MAP:');
      console.log(`Total devices with activity: ${Object.keys(activityMap).length}/${devicesList.length}`);
      for (const [deviceId, timestamp] of Object.entries(activityMap)) {
        console.log(`Device ID: ${deviceId}, Timestamp: ${timestamp.toISOString()}`);
      }
      
      // Set the state with the new activity map - do this AFTER all processing is complete
      setDeviceLastActivity({...activityMap}) // Use a new object to ensure state update
    } catch (err) {
      console.error("Error fetching device activity:", err)
    }
  }

  const fetchDeviceLogs = async (device: Device) => {
    try {
      setLogsLoading(true)
      setSelectedDevice(device)
      const logs = await getDeviceLogsForAdmin(device.serial_number)
      setDeviceLogs(logs)
      setLogsDialogOpen(true)
    } catch (err: any) {
      setError(err.message || "Failed to fetch device logs")
    } finally {
      setLogsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }
  
  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    
    if (diffDay > 0) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
    } else if (diffHour > 0) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
    } else if (diffMin > 0) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  const getDeviceStatus = (device: Device) => {
    // Get the last activity timestamp for this device
    const lastActivity = deviceLastActivity[device.id]
    
    // Debug information
    console.log(`getDeviceStatus for device ${device.id} (${device.serial_number}):`, {
      hasLastActivity: !!lastActivity,
      lastActivityTime: lastActivity ? lastActivity.toISOString() : 'none'
    })
    
    if (!lastActivity) {
      return "offline" // No activity data available
    }
    
    // Calculate time difference in minutes
    const now = new Date()
    const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60)
    
    // Debug time difference
    console.log(`Time difference for device ${device.id}: ${diffMinutes.toFixed(2)} minutes`)
    
    // Match devices page logic: only active or offline
    // If reading is older than 30 minutes, mark as offline
    if (diffMinutes <= 30) {
      return "active"
    } else {
      return "offline" // Over 30 minutes = offline (matching devices page)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success' // Green for active devices
      case 'warning':
        return 'warning' // Yellow/orange for warning state
      case 'offline':
        return 'destructive' // Red for offline devices
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading devices...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage all devices and view system-wide data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setRefreshing(true);
              fetchDeviceActivity(devices)
                .then(() => {
                  setLastRefresh(new Date());
                  setRefreshing(false);
                })
                .catch(err => {
                  console.error("Error refreshing device status:", err);
                  setRefreshing(false);
                });
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Status'}
          </Button>
          <TooltipProvider key="last-refresh-tooltip">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground cursor-help">
                  Last updated: {formatTimeAgo(lastRefresh)}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {formatDate(lastRefresh.toISOString())}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {devices.filter(d => getDeviceStatus(d) === 'Active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(devices.map(d => d.user_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Device Types</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(devices.map(d => d.device_type)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Device Management</CardTitle>
          <CardDescription>
            View and manage all devices in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search devices by serial number or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          {/* Devices Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Logged</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.length === 0 ? (
                  <TableRow key="no-devices-row">
                    <TableCell colSpan={6} className="text-center py-8">
                      {devices.length === 0 ? "No devices found" : "No devices match your search"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-mono">{device.serial_number}</TableCell>
                      <TableCell>{device.name || "—"}</TableCell>
                      <TableCell>
                        <TooltipProvider key={`status-tooltip-${device.id}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <Badge className={`text-xs ${
                                  getDeviceStatus(device) === "active"
                                    ? "bg-green-500"
                                    : "bg-red-500 text-white"
                                }`}>
                                  {getDeviceStatus(device) === "active" ? "Active" : "Offline"}
                                </Badge>
                                <Info className="h-3 w-3 text-gray-400" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {deviceLastActivity[device.id] 
                                  ? `Last active: ${formatDate(deviceLastActivity[device.id].toISOString())}` 
                                  : 'No logs found for this device. This is normal for newly added devices that haven\'t sent data yet.'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {deviceLastActivity[device.id] ? (
                          <TooltipProvider key={`last-logged-tooltip-${device.id}`}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <span className={`${getDeviceStatus(device) === 'active' ? 'text-green-600 font-medium' : ''}`}>
                                    {formatTimeAgo(deviceLastActivity[device.id])}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {formatDate(deviceLastActivity[device.id].toISOString())}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider key={`no-activity-tooltip-${device.id}`}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help text-gray-500">
                                  <span>Never</span>
                                  <Info className="h-3 w-3 text-gray-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  No logs found for this device.<br/>
                                  This is normal for newly added devices that haven't sent data yet.<br/>
                                  Device ID: {device.id}<br/>
                                  Serial: {device.serial_number}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(device.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchDeviceLogs(device)}
                          disabled={logsLoading}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Logs
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Device Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Device Logs: {selectedDevice?.serial_number}
            </DialogTitle>
            <DialogDescription>
              Viewing data logs for device {selectedDevice?.name || selectedDevice?.serial_number}
            </DialogDescription>
          </DialogHeader>
          
          {logsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Temperature (°C)</TableHead>
                    <TableHead>Humidity (%)</TableHead>
                    <TableHead>Soil Moisture (%)</TableHead>
                    <TableHead>pH</TableHead>
                    <TableHead>N (%)</TableHead>
                    <TableHead>P (%)</TableHead>
                    <TableHead>K (%)</TableHead>
                    <TableHead>EC (mS/cm)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceLogs.length === 0 ? (
                    <TableRow key="no-logs-row">
                      <TableCell colSpan={9} className="text-center py-8">
                        No logs found for this device
                      </TableCell>
                    </TableRow>
                  ) : (
                    deviceLogs.slice(0, 100).map((log, index) => (
                      <TableRow key={log.id || `log-${index}`}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>{log.temperature?.toFixed(1) || "—"}</TableCell>
                        <TableCell>{log.humidity?.toFixed(1) || "—"}</TableCell>
                        <TableCell>{log.soil_moisture?.toFixed(1) || "—"}</TableCell>
                        <TableCell>{log.ph?.toFixed(2) || "—"}</TableCell>
                        <TableCell>{log.nitrogen?.toFixed(2) || "—"}</TableCell>
                        <TableCell>{log.phosphorous?.toFixed(2) || "—"}</TableCell>
                        <TableCell>{log.potassium?.toFixed(2) || "—"}</TableCell>
                        <TableCell>{log.electrical_conductivity?.toFixed(2) || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {deviceLogs.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                  Showing first 100 logs out of {deviceLogs.length} total logs
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}