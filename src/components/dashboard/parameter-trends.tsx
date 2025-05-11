"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const moistureData = [
  { name: "Week 1", value: 42 },
  { name: "Week 2", value: 45 },
  { name: "Week 3", value: 40 },
  { name: "Week 4", value: 38 },
  { name: "Week 5", value: 35 },
  { name: "Week 6", value: 42 },
  { name: "Week 7", value: 45 },
  { name: "Week 8", value: 48 },
]

const temperatureData = [
  { name: "Week 1", value: 22 },
  { name: "Week 2", value: 23 },
  { name: "Week 3", value: 25 },
  { name: "Week 4", value: 24 },
  { name: "Week 5", value: 26 },
  { name: "Week 6", value: 28 },
  { name: "Week 7", value: 27 },
  { name: "Week 8", value: 25 },
]

const phData = [
  { name: "Week 1", value: 6.5 },
  { name: "Week 2", value: 6.4 },
  { name: "Week 3", value: 6.3 },
  { name: "Week 4", value: 6.2 },
  { name: "Week 5", value: 6.3 },
  { name: "Week 6", value: 6.4 },
  { name: "Week 7", value: 6.5 },
  { name: "Week 8", value: 6.6 },
]

export function ParameterTrends() {
  return (
    <Tabs defaultValue="line">
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="line">Line Chart</TabsTrigger>
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="line">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={moistureData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" activeDot={{ r: 8 }} name="Soil Moisture (%)" />
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>
      <TabsContent value="bar">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={moistureData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#3b82f6" name="Soil Moisture (%)" />
          </BarChart>
        </ResponsiveContainer>
      </TabsContent>
    </Tabs>
  )
}
