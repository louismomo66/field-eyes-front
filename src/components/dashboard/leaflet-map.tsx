"use client"

import { useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"
import type { Device, FieldBoundary } from "@/types"
import type { LatLngExpression, LatLngBounds, DivIcon, Map, LatLngTuple } from 'leaflet'
import L from 'leaflet'

interface LeafletMapProps {
  devices: Device[]
  fieldBoundaries: FieldBoundary[]
  selectedParameter: string
  heatmapGradient: string[]
  onSelectDevice: (id: string) => void
  isDetailView?: boolean
  defaultCenter?: LatLngTuple
  defaultZoom?: number
}

interface DeviceReadings {
  [key: string]: number | undefined
}

export default function LeafletMap({
  devices,
  fieldBoundaries,
  selectedParameter,
  heatmapGradient,
  onSelectDevice,
  isDetailView = false,
  defaultCenter = [51.505, -0.09] as LatLngTuple,
  defaultZoom = 13,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<Map | null>(null)
  const heatLayer = useRef<L.LayerGroup | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const boundariesLayer = useRef<L.LayerGroup | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)

  // Generate heatmap data points based on selected parameter and devices
  const generateHeatmapData = () => {
    // If no devices or field boundaries, return empty array
    if (devices.length === 0 || fieldBoundaries.length === 0) {
      return []
    }

    // Create a grid of points within the field boundaries
    const points = []
    const gridSize = 0.0005 // Adjust for density of points

    // Process each field boundary
    fieldBoundaries.forEach((boundary) => {
      // Calculate bounds for this field
      const coordinates = boundary.coordinates
      const minLat = Math.min(...coordinates.map((p) => p[0]))
      const maxLat = Math.max(...coordinates.map((p) => p[0]))
      const minLng = Math.min(...coordinates.map((p) => p[1]))
      const maxLng = Math.max(...coordinates.map((p) => p[1]))

      // Generate grid points for this field
      for (let lat = minLat; lat <= maxLat; lat += gridSize) {
        for (let lng = minLng; lng <= maxLng; lng += gridSize) {
          // Calculate value based on proximity to devices
          let totalValue = 0
          let totalWeight = 0

          devices.forEach((device) => {
            if (device.status !== "offline") {
              // Calculate distance to device
              const distance = Math.sqrt(Math.pow(lat - device.lat, 2) + Math.pow(lng - device.lng, 2))

              // Inverse distance weighting
              const weight = 1 / Math.max(distance, 0.0001)

              // Make sure the parameter exists in the device readings
              if (device.readings && device.readings[selectedParameter] !== undefined) {
                totalValue += device.readings[selectedParameter]! * weight
                totalWeight += weight
              }
            }
          })

          // Calculate weighted average
          const value = totalWeight > 0 ? totalValue / totalWeight : 0

          // Add point to heatmap data
          points.push([lat, lng, value])
        }
      }
    })

    return points
  }

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInitialized) return

    const map = L.map(mapRef.current).setView(defaultCenter, defaultZoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    leafletMap.current = map
    markersLayer.current = L.layerGroup().addTo(map)
    boundariesLayer.current = L.layerGroup().addTo(map)
    heatLayer.current = L.layerGroup().addTo(map)

    setMapInitialized(true)

    return () => {
      map.remove()
    }
  }, [mapInitialized, defaultCenter, defaultZoom])

  // Update field boundaries when they change
  useEffect(() => {
    if (!mapInitialized || !leafletMap.current || !boundariesLayer.current) return

    const updateBoundaries = async () => {
      const L = await import("leaflet")

      // Clear existing boundaries
      boundariesLayer.current.clearLayers()

      // Add field boundaries
      fieldBoundaries.forEach((boundary) => {
        L.polygon(boundary.coordinates, {
          color: "#10b981",
          weight: 2,
          fillOpacity: 0.1,
        }).addTo(boundariesLayer.current)
      })

      // If we have boundaries, fit the map to them
      if (fieldBoundaries.length > 0) {
        const allCoords = fieldBoundaries.flatMap((b) => b.coordinates)
        if (allCoords.length > 0) {
          const bounds = L.latLngBounds(allCoords)
          leafletMap.current.fitBounds(bounds)
        }
      }
    }

    updateBoundaries()
  }, [fieldBoundaries, mapInitialized])

  // Update markers when devices change
  useEffect(() => {
    if (!mapInitialized || !leafletMap.current || !markersLayer.current) return

    let isMounted = true

    const updateMarkers = async () => {
      try {
        if (!isMounted || !markersLayer.current) return

        // Clear existing markers
        markersLayer.current.clearLayers()

        // Add device markers
        devices.forEach((device) => {
          if (!isMounted || !markersLayer.current) return

          // Create custom icon
          const iconHtml = `
            <div class="relative">
              <div class="absolute -top-[24px] -left-[12px]">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${
                  device.status === "active" ? "#10b981" : device.status === "warning" ? "#f59e0b" : "#ef4444"
                }" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-map-pin">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
            </div>
          `

          const icon = L.divIcon({
            html: iconHtml,
            className: "custom-div-icon",
            iconSize: [30, 42],
            iconAnchor: [15, 42],
          })

          const coords: LatLngTuple = [device.lat, device.lng]
          const marker = L.marker(coords, { icon }).addTo(markersLayer.current)

          // Add popup
          const readings = device.readings as DeviceReadings
          const reading = readings && readings[selectedParameter] !== undefined
            ? readings[selectedParameter]
            : "N/A"

          marker.bindPopup(`
            <div class="p-2">
              <div class="font-bold">${device.name}</div>
              <div class="text-sm">${selectedParameter}: ${reading}</div>
              <div class="text-xs mt-1">Click for details</div>
            </div>
          `)

          // Add click handler
          marker.on("click", () => {
            onSelectDevice(device.id)
          })
        })

        // If we have devices but no boundaries, fit the map to the devices
        if (devices.length > 0 && fieldBoundaries.length === 0 && leafletMap.current) {
          const deviceCoords: LatLngTuple[] = devices.map((d): LatLngTuple => [d.lat, d.lng])
          if (deviceCoords.length > 0) {
            const bounds = L.latLngBounds(deviceCoords)
            leafletMap.current.fitBounds(bounds)
          }
        }
      } catch (error) {
        console.error('Error updating markers:', error)
      }
    }

    updateMarkers()

    return () => {
      isMounted = false
      if (markersLayer.current) {
        markersLayer.current.clearLayers()
      }
    }
  }, [devices, selectedParameter, mapInitialized, onSelectDevice])

  // Update heatmap when parameter or devices change
  useEffect(() => {
    if (!mapInitialized || !leafletMap.current) return

    const updateHeatmap = async () => {
      const L = await import("leaflet")

      // Remove existing heatmap layer
      if (heatLayer.current) {
        leafletMap.current.removeLayer(heatLayer.current)
      }

      try {
        // Create a simple heatmap implementation
        const heatmapData = generateHeatmapData()

        // Create a custom heatmap using circles
        const heatmapLayer = L.layerGroup()

        heatmapData.forEach((point) => {
          const [lat, lng, value] = point

          // Normalize value between 0 and 1
          const maxValue = Math.max(...heatmapData.map((p) => p[2]))
          const normalizedValue = maxValue > 0 ? value / maxValue : 0

          // Determine color based on gradient
          let color = "#10b981" // Default color

          // Find the appropriate color from the gradient
          const gradientKeys = Object.keys(heatmapGradient)
            .map(Number)
            .sort((a, b) => a - b)

          for (let i = 0; i < gradientKeys.length - 1; i++) {
            const lowerKey = gradientKeys[i]
            const upperKey = gradientKeys[i + 1]

            if (normalizedValue >= lowerKey && normalizedValue <= upperKey) {
              color = heatmapGradient[lowerKey.toString()]
              break
            }
          }

          // Create circle with opacity based on value
          L.circle([lat, lng], {
            radius: 15,
            color: color,
            fillColor: color,
            fillOpacity: 0.5 * normalizedValue + 0.1, // Minimum opacity of 0.1
            weight: 0,
          }).addTo(heatmapLayer)
        })

        heatmapLayer.addTo(leafletMap.current)
        heatLayer.current = heatmapLayer
      } catch (error) {
        console.error("Error creating heatmap:", error)
      }
    }

    updateHeatmap()
  }, [devices, fieldBoundaries, selectedParameter, mapInitialized])

  return <div ref={mapRef} className="h-full w-full" />
}
