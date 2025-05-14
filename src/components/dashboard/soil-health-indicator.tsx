"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import type { SoilReading, Device } from "@/types"

interface SoilHealthIndicatorProps {
  device?: Device | null;
  readings?: SoilReading[];
}

export function SoilHealthIndicator({ device, readings = [] }: SoilHealthIndicatorProps) {
  const [healthData, setHealthData] = useState<{
    overall: number
    moisture: number
    temperature: number
    ph: number
    nitrogen: number
    phosphorus: number
    potassium: number
    ec: number
    organicMatter: number
  }>({
    overall: 0,
    moisture: 0,
    temperature: 0,
    ph: 0,
    nitrogen: 0,
    phosphorus: 0,
    potassium: 0,
    ec: 0,
    organicMatter: 0,
  })

  useEffect(() => {
        // Log when the component receives new readings
        console.log('SoilHealthIndicator received readings for device:', device?.id || 'none', 'with', readings.length, 'readings');
        
        // Calculate health indicators from readings
        const calculatedHealth = calculateSoilHealth(readings)
        setHealthData(calculatedHealth)
  }, [readings, device])

  // Calculate soil health from readings
  const calculateSoilHealth = (readings: SoilReading[]) => {
    // If no readings, return zeros
    if (readings.length === 0) {
      return {
        overall: 0,
        moisture: 0,
        temperature: 0,
        ph: 0,
        nitrogen: 0,
        phosphorus: 0,
        potassium: 0,
        ec: 0,
        organicMatter: 0,
      }
    }

    // Calculate averages from the most recent readings
    const recentReadings = readings.slice(0, 10) // Use last 10 readings

    // Example calculation - replace with your actual logic
    const avgMoisture = calculateAverage(recentReadings, "soil_moisture")
    const avgTemperature = calculateAverage(recentReadings, "soil_temperature")
    const avgPh = calculateAverage(recentReadings, "ph")
    const avgNitrogen = calculateAverage(recentReadings, "nitrogen")
    const avgPhosphorus = calculateAverage(recentReadings, "phosphorous")
    const avgPotassium = calculateAverage(recentReadings, "potassium")
    const avgEc = calculateAverage(recentReadings, "electrical_conductivity")

    // Convert averages to health scores (0-100)
    const moistureScore = convertToScore(avgMoisture, 30, 60, 100)
    const temperatureScore = convertToScore(avgTemperature, 15, 25, 100)
    const phScore = convertToScore(avgPh, 6.0, 7.0, 100)
    const nitrogenScore = convertToScore(avgNitrogen, 10, 20, 100)
    const phosphorusScore = convertToScore(avgPhosphorus, 5, 15, 100)
    const potassiumScore = convertToScore(avgPotassium, 5, 15, 100)
    const ecScore = convertToScore(avgEc, 0.8, 1.5, 100)

    // Organic matter is often not directly measured by sensors
    const organicMatterScore = 70 // Placeholder

    // Calculate overall score (weighted average)
    const overall = Math.round(
      moistureScore * 0.15 +
        temperatureScore * 0.1 +
        phScore * 0.2 +
        nitrogenScore * 0.15 +
        phosphorusScore * 0.15 +
        potassiumScore * 0.15 +
        ecScore * 0.1,
    )

    return {
      overall,
      moisture: moistureScore,
      temperature: temperatureScore,
      ph: phScore,
      nitrogen: nitrogenScore,
      phosphorus: phosphorusScore,
      potassium: potassiumScore,
      ec: ecScore,
      organicMatter: organicMatterScore,
    }
  }

  // Helper function to calculate average of a parameter
  const calculateAverage = (readings: SoilReading[], parameter: keyof SoilReading) => {
    const validReadings = readings.filter((r) => r[parameter] !== undefined)
    if (validReadings.length === 0) return 0

    const sum = validReadings.reduce((acc, reading) => acc + (reading[parameter] as number || 0), 0)
    return sum / validReadings.length
  }

  // Helper function to convert a value to a score (0-100)
  const convertToScore = (value: number, min: number, max: number, optimalScore: number) => {
    if (value < min) {
      // Below optimal range - score decreases as value decreases
      return Math.round((value / min) * (optimalScore * 0.7))
    } else if (value > max) {
      // Above optimal range - score decreases as value increases
      const excess = value - max
      const range = max - min
      return Math.round(Math.max(0, optimalScore - (excess / range) * (optimalScore * 0.5)))
    } else {
      // Within optimal range - score is highest
      const position = (value - min) / (max - min)
      // Score peaks in the middle of the range
      return Math.round(optimalScore * (0.8 + 0.2 * (1 - Math.abs(position - 0.5) * 2)))
    }
  }

  // Helper function to get rating text based on score
  const getRating = (score: number) => {
    if (score >= 85) return "Optimal"
    if (score >= 70) return "Good"
    if (score >= 50) return "Moderate"
    return "Low"
  }

  if (!healthData.overall) {
    return (
      <div className="flex flex-col justify-center items-center h-[200px] space-y-4 text-center">
        <div className="text-lg font-medium text-gray-600">No Soil Health Data Available</div>
        <div className="text-sm text-gray-500 max-w-md">
          {device 
            ? "No recent readings available for this device."
            : "Connect a soil monitoring device to start tracking your soil health metrics."
          }
        </div>
        {!device && (
          <a 
            href="/dashboard/devices" 
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Add Device
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Soil Health</span>
          <span className="text-sm font-medium">{healthData.overall}/100</span>
        </div>
        <Progress value={healthData.overall} className="h-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Moisture</span>
            <span className="text-sm font-medium">{getRating(healthData.moisture)}</span>
          </div>
          <Progress value={healthData.moisture} className="h-2" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Temperature</span>
            <span className="text-sm font-medium">{getRating(healthData.temperature)}</span>
          </div>
          <Progress value={healthData.temperature} className="h-2" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">pH Level</span>
            <span className="text-sm font-medium">{getRating(healthData.ph)}</span>
          </div>
          <Progress value={healthData.ph} className="h-2" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Nitrogen (N)</span>
            <span className="text-sm font-medium">{getRating(healthData.nitrogen)}</span>
          </div>
          <Progress value={healthData.nitrogen} className="h-2" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Phosphorus (P)</span>
            <span className="text-sm font-medium">{getRating(healthData.phosphorus)}</span>
          </div>
          <Progress value={healthData.phosphorus} className="h-2" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Potassium (K)</span>
            <span className="text-sm font-medium">{getRating(healthData.potassium)}</span>
          </div>
          <Progress value={healthData.potassium} className="h-2" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Electrical Conductivity</span>
            <span className="text-sm font-medium">{getRating(healthData.ec)}</span>
          </div>
          <Progress value={healthData.ec} className="h-2" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Organic Matter</span>
            <span className="text-sm font-medium">{getRating(healthData.organicMatter)}</span>
          </div>
          <Progress value={healthData.organicMatter} className="h-2" />
        </div>
      </div>
    </div>
  )
}
