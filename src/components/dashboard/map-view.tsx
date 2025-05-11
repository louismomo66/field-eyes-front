"use client"
import { useState, useEffect } from "react"
import { Legend } from "@/components/dashboard/map-legend"
import dynamic from "next/dynamic"
import { getDevices, getFieldBoundaries } from "@/lib/api"
import type { Device, FieldBoundary } from "@/types"

// Dynamically import the Map component with no SSR
const LeafletMap = dynamic(() => import("@/components/dashboard/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center bg-gray-100 rounded-md">
      <div className="text-center">
        <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-green-600 mx-auto"></div>
        <p>Loading map...</p>
      </div>
    </div>
  ),
})

interface MapViewProps {
  onSelectDevice: (deviceId: string) => void
  selectedParameter?: string
  isDetailView?: boolean
}

export function MapView({ onSelectDevice, selectedParameter = "moisture", isDetailView = false }: MapViewProps) {
  // State to store data from your API
  const [devices, setDevices] = useState<Device[]>([])
  const [fieldBoundaries, setFieldBoundaries] = useState<FieldBoundary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch data when component mounts
  useEffect(() => {
    fetchDevices()
    fetchFieldBoundaries()
  }, [])

  // Function to fetch devices from your API
  const fetchDevices = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getDevices()
      setDevices(data)
      setIsLoading(false)
    } catch (err) {
      setError("Failed to load devices")
      setIsLoading(false)
      console.error("Error fetching devices:", err)
    }
  }

  // Function to fetch field boundaries from your API
  const fetchFieldBoundaries = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getFieldBoundaries()
      setFieldBoundaries(data)
      setIsLoading(false)
    } catch (err) {
      setError("Failed to load field boundaries")
      setIsLoading(false)
      console.error("Error fetching field boundaries:", err)
    }
  }

  // Get gradient for heatmap based on parameter
  const getHeatmapGradient = () => {
    switch (selectedParameter) {
      case "moisture":
        return {
          0.0: "#f59e0b", // amber-500 (dry)
          0.5: "#10b981", // emerald-500 (optimal)
          1.0: "#3b82f6", // blue-500 (wet)
        }
      case "temperature":
        return {
          0.0: "#3b82f6", // blue-500 (cold)
          0.5: "#10b981", // emerald-500 (optimal)
          1.0: "#ef4444", // red-500 (hot)
        }
      case "ph":
        return {
          0.0: "#f59e0b", // amber-500 (acidic)
          0.5: "#10b981", // emerald-500 (neutral)
          1.0: "#8b5cf6", // violet-500 (alkaline)
        }
      case "nitrogen":
      case "phosphorus":
      case "potassium":
        return {
          0.0: "#f59e0b", // amber-500 (low)
          0.5: "#10b981", // emerald-500 (medium)
          1.0: "#3b82f6", // blue-500 (high)
        }
      case "ec":
        return {
          0.0: "#f59e0b", // amber-500 (low)
          0.5: "#10b981", // emerald-500 (optimal)
          1.0: "#ef4444", // red-500 (high)
        }
      default:
        return {
          0.0: "#f59e0b",
          0.5: "#10b981",
          1.0: "#3b82f6",
        }
    }
  }

  // Get legend items based on parameter
  const getLegendItems = () => {
    switch (selectedParameter) {
      case "moisture":
        return [
          { color: "#f59e0b", label: "Low (<30%)" },
          { color: "#10b981", label: "Optimal (30-60%)" },
          { color: "#3b82f6", label: "High (>60%)" },
        ]
      case "temperature":
        return [
          { color: "#3b82f6", label: "Cold (<15°C)" },
          { color: "#10b981", label: "Optimal (15-30°C)" },
          { color: "#ef4444", label: "Hot (>30°C)" },
        ]
      case "ph":
        return [
          { color: "#f59e0b", label: "Acidic (<6.0)" },
          { color: "#10b981", label: "Neutral (6.0-7.0)" },
          { color: "#8b5cf6", label: "Alkaline (>7.0)" },
        ]
      case "nitrogen":
        return [
          { color: "#f59e0b", label: "Low (<12)" },
          { color: "#10b981", label: "Medium (12-16)" },
          { color: "#3b82f6", label: "High (>16)" },
        ]
      case "phosphorus":
        return [
          { color: "#f59e0b", label: "Low (<8)" },
          { color: "#10b981", label: "Medium (8-12)" },
          { color: "#3b82f6", label: "High (>12)" },
        ]
      case "potassium":
        return [
          { color: "#f59e0b", label: "Low (<10)" },
          { color: "#10b981", label: "Medium (10-14)" },
          { color: "#3b82f6", label: "High (>14)" },
        ]
      case "ec":
        return [
          { color: "#f59e0b", label: "Low (<0.8 mS/cm)" },
          { color: "#10b981", label: "Optimal (0.8-1.5 mS/cm)" },
          { color: "#ef4444", label: "High (>1.5 mS/cm)" },
        ]
      default:
        return [
          { color: "#f59e0b", label: "Low" },
          { color: "#10b981", label: "Medium" },
          { color: "#3b82f6", label: "High" },
        ]
    }
  }

  // Default map center and zoom if no devices are available
  const defaultCenter = { lat: 40.7128, lng: -74.006 }
  const defaultZoom = isDetailView ? 14 : 15

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-md">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-red-500 bg-white p-4 rounded-md shadow-md">
            {error}
            <button
              className="ml-2 text-blue-500 underline"
              onClick={() => {
                fetchDevices()
                fetchFieldBoundaries()
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <LeafletMap
        devices={devices}
        fieldBoundaries={fieldBoundaries}
        selectedParameter={selectedParameter}
        heatmapGradient={getHeatmapGradient()}
        onSelectDevice={onSelectDevice}
        isDetailView={isDetailView}
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
      />

      <div className="absolute bottom-4 right-4 z-[1000]">
        <Legend
          items={getLegendItems()}
          title={`${selectedParameter.charAt(0).toUpperCase() + selectedParameter.slice(1)}`}
        />
      </div>
    </div>
  )
}
