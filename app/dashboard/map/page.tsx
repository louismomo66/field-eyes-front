"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapView } from "@/components/dashboard/map-view"
import { DeviceInfoPanel } from "@/components/dashboard/device-info-panel"

export default function MapPage() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [selectedParameter, setSelectedParameter] = useState("moisture")

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Field Map</h1>
          <p className="text-muted-foreground">View and monitor your devices on the map</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue={selectedParameter} onValueChange={setSelectedParameter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select parameter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="moisture">Soil Moisture</SelectItem>
              <SelectItem value="temperature">Soil Temperature</SelectItem>
              <SelectItem value="ph">Soil pH</SelectItem>
              <SelectItem value="nitrogen">Nitrogen (N)</SelectItem>
              <SelectItem value="phosphorus">Phosphorus (P)</SelectItem>
              <SelectItem value="potassium">Potassium (K)</SelectItem>
              <SelectItem value="ec">Electrical Conductivity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-5">
          <CardContent className="p-0">
            <MapView onSelectDevice={setSelectedDevice} selectedParameter={selectedParameter} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
            <CardDescription>
              {selectedDevice ? "Details for selected device" : "Select a device on the map"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDevice ? (
              <DeviceInfoPanel deviceId={selectedDevice} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Click on a device marker to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Field Overview</CardTitle>
          <CardDescription>Visualize soil parameters across your fields</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedParameter}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="moisture">Moisture</TabsTrigger>
              <TabsTrigger value="temperature">Temperature</TabsTrigger>
              <TabsTrigger value="ph">pH</TabsTrigger>
              <TabsTrigger value="nitrogen">Nitrogen</TabsTrigger>
              <TabsTrigger value="phosphorus">Phosphorus</TabsTrigger>
              <TabsTrigger value="potassium">Potassium</TabsTrigger>
              <TabsTrigger value="ec">EC</TabsTrigger>
            </TabsList>
            <TabsContent value="moisture" className="mt-4">
              <div className="h-[300px] rounded-md border">
                <MapView onSelectDevice={setSelectedDevice} selectedParameter="moisture" isDetailView={true} />
              </div>
            </TabsContent>
            <TabsContent value="temperature" className="mt-4">
              <div className="h-[300px] rounded-md border">
                <MapView onSelectDevice={setSelectedDevice} selectedParameter="temperature" isDetailView={true} />
              </div>
            </TabsContent>
            <TabsContent value="ph" className="mt-4">
              <div className="h-[300px] rounded-md border">
                <MapView onSelectDevice={setSelectedDevice} selectedParameter="ph" isDetailView={true} />
              </div>
            </TabsContent>
            <TabsContent value="nitrogen" className="mt-4">
              <div className="h-[300px] rounded-md border">
                <MapView onSelectDevice={setSelectedDevice} selectedParameter="nitrogen" isDetailView={true} />
              </div>
            </TabsContent>
            <TabsContent value="phosphorus" className="mt-4">
              <div className="h-[300px] rounded-md border">
                <MapView onSelectDevice={setSelectedDevice} selectedParameter="phosphorus" isDetailView={true} />
              </div>
            </TabsContent>
            <TabsContent value="potassium" className="mt-4">
              <div className="h-[300px] rounded-md border">
                <MapView onSelectDevice={setSelectedDevice} selectedParameter="potassium" isDetailView={true} />
              </div>
            </TabsContent>
            <TabsContent value="ec" className="mt-4">
              <div className="h-[300px] rounded-md border">
                <MapView onSelectDevice={setSelectedDevice} selectedParameter="ec" isDetailView={true} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
