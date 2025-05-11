import { Progress } from "@/components/ui/progress"
import { Battery, Signal, ThermometerSun, Droplets, FlaskConical, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeviceInfoPanelProps {
  deviceId: string
}

export function DeviceInfoPanel({ deviceId }: DeviceInfoPanelProps) {
  // Mock device data - in a real app, this would be fetched based on deviceId
  const deviceData = {
    id: deviceId,
    name:
      deviceId === "device1"
        ? "North Field Sensor 1"
        : deviceId === "device2"
          ? "South Field Sensor 1"
          : deviceId === "device3"
            ? "East Field Sensor 1"
            : "West Field Sensor 1",
    status:
      deviceId === "device1" || deviceId === "device2" ? "active" : deviceId === "device3" ? "warning" : "offline",
    battery: deviceId === "device1" ? 85 : deviceId === "device2" ? 92 : deviceId === "device3" ? 15 : 0,
    signal: deviceId === "device1" || deviceId === "device2" ? "Strong" : deviceId === "device3" ? "Good" : "No Signal",
    lastReading:
      deviceId === "device1"
        ? "2 minutes ago"
        : deviceId === "device2"
          ? "5 minutes ago"
          : deviceId === "device3"
            ? "10 minutes ago"
            : "2 days ago",
    moisture: deviceId === "device1" ? 42 : deviceId === "device2" ? 38 : deviceId === "device3" ? 28 : null,
    temperature: deviceId === "device1" ? 24 : deviceId === "device2" ? 25 : deviceId === "device3" ? 26 : null,
    ph: deviceId === "device1" ? 6.5 : deviceId === "device2" ? 6.3 : deviceId === "device3" ? 6.2 : null,
    ec: deviceId === "device1" ? 1.2 : deviceId === "device2" ? 1.1 : deviceId === "device3" ? 0.9 : null,
  }

  if (deviceData.status === "offline") {
    return (
      <div className="space-y-4">
        <div className="text-lg font-medium">{deviceData.name}</div>
        <div className="flex items-center text-sm text-red-500 font-medium">
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
          Offline
        </div>
        <div className="text-sm text-muted-foreground">Last seen: {deviceData.lastReading}</div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Signal className="mr-1 h-4 w-4 text-red-500" />
          No Signal
        </div>
        <div className="pt-4">
          <Button variant="outline" size="sm" className="w-full">
            Troubleshoot Device
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-medium">{deviceData.name}</div>
      <div className="flex items-center text-sm">
        <span
          className={`inline-block w-2 h-2 ${deviceData.status === "active" ? "bg-green-500" : "bg-amber-500"} rounded-full mr-2`}
        ></span>
        {deviceData.status === "active" ? "Active" : "Warning"}
      </div>
      <div className="text-sm text-muted-foreground">Last reading: {deviceData.lastReading}</div>
      <div className="flex items-center text-sm text-muted-foreground">
        <Battery className={`mr-1 h-4 w-4 ${deviceData.battery > 20 ? "text-green-500" : "text-amber-500"}`} />
        {deviceData.battery}% Battery
      </div>
      <div className="flex items-center text-sm text-muted-foreground">
        <Signal className="mr-1 h-4 w-4 text-green-500" />
        {deviceData.signal} Signal
      </div>
      <div className="space-y-3 pt-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <Droplets className="mr-1 h-4 w-4" />
              Moisture
            </div>
            <span>{deviceData.moisture}%</span>
          </div>
          <Progress value={deviceData.moisture || 0} className="h-2" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <ThermometerSun className="mr-1 h-4 w-4" />
              Temperature
            </div>
            <span>{deviceData.temperature}°C</span>
          </div>
          <Progress value={(deviceData.temperature || 0) * 2} className="h-2" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <FlaskConical className="mr-1 h-4 w-4" />
              pH Level
            </div>
            <span>{deviceData.ph}</span>
          </div>
          <Progress value={(deviceData.ph || 0) * 10} className="h-2" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <Zap className="mr-1 h-4 w-4" />
              EC
            </div>
            <span>{deviceData.ec} mS/cm</span>
          </div>
          <Progress value={(deviceData.ec || 0) * 50} className="h-2" />
        </div>
      </div>
      <div className="pt-2 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          View History
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          Settings
        </Button>
      </div>
    </div>
  )
}
