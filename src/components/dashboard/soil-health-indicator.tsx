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
    if (readings.length > 0) {
      console.log('First reading sample:', JSON.stringify(readings[0], null, 2));
    }
    
    // Reset health data if device changes to ensure clean re-render
    setHealthData({
      overall: 0,
      moisture: 0,
      temperature: 0,
      ph: 0,
      nitrogen: 0,
      phosphorus: 0,
      potassium: 0,
      ec: 0,
      organicMatter: 0,
    });
    
    // Calculate health indicators after a small delay
    const timer = setTimeout(() => {
      try {
        const calculatedHealth = calculateSoilHealth(readings);
        console.log('Health data updated with scores:', JSON.stringify(calculatedHealth, null, 2));
        setHealthData(calculatedHealth);
      } catch (error) {
        console.error('Error calculating soil health:', error);
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [readings, device?.id])

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

    // Log readings for debug
    console.log(`Processing ${readings.length} readings for soil health calculation`);
    
    // Calculate averages from the most recent readings
    const recentReadings = readings.slice(0, 10) // Use last 10 readings

    // Use default values if data is not present
    const defaultValues = {
      moisture: 50,
      temperature: 20,
      ph: 6.5,
      nitrogen: 15,
      phosphorus: 10,
      potassium: 10,
      ec: 1.0,
    };

    // Calculate averages with fallbacks to ensure we always have some values
    const avgMoisture = calculateAverage(recentReadings, "moisture") || defaultValues.moisture;
    const avgTemperature = calculateAverage(recentReadings, "temperature") || defaultValues.temperature;
    const avgPh = calculateAverage(recentReadings, "ph") || defaultValues.ph;
    const avgNitrogen = calculateAverage(recentReadings, "nitrogen") || defaultValues.nitrogen;
    const avgPhosphorus = calculateAverage(recentReadings, "phosphorus") || defaultValues.phosphorus;
    const avgPotassium = calculateAverage(recentReadings, "potassium") || defaultValues.potassium;
    const avgEc = calculateAverage(recentReadings, "ec") || defaultValues.ec;

    console.log('Calculated averages:', {
      moisture: avgMoisture,
      temperature: avgTemperature,
      ph: avgPh,
      nitrogen: avgNitrogen,
      phosphorus: avgPhosphorus,
      potassium: avgPotassium,
      ec: avgEc
    });

    // Convert averages to health scores (0-100)
    const moistureScore = convertToScore(avgMoisture, 30, 60, 100);
    const temperatureScore = convertToScore(avgTemperature, 15, 25, 100);
    const phScore = convertToScore(avgPh, 6.0, 7.0, 100);
    
    // NPK scores using proper soil analysis ranges
    // Nitrogen: Optimal 25-50 mg/kg
    const nitrogenScore = convertToScore(avgNitrogen, 25, 50, 100);
    // Phosphorus: Optimal 30-50 mg/kg
    const phosphorusScore = convertToScore(avgPhosphorus, 30, 50, 100);
    // Potassium: Optimal 100-180 mg/kg
    const potassiumScore = convertToScore(avgPotassium, 100, 180, 100);
    const ecScore = convertToScore(avgEc, 200, 800, 100);

    // Organic matter - use a value based on the other indicators as a rough estimate
    // This is a simplified approach since organic matter is not directly measured
    const organicMatterScore = Math.min(
      70,
      Math.round((moistureScore + nitrogenScore + phosphorusScore + potassiumScore) / 4)
    );

    // Calculate overall score (weighted average)
    const overall = Math.round(
      moistureScore * 0.15 +
        temperatureScore * 0.1 +
        phScore * 0.2 +
        nitrogenScore * 0.15 +
        phosphorusScore * 0.15 +
        potassiumScore * 0.15 +
        ecScore * 0.1
    );

    // Ensure all values are between 10-100 for progress bars to be visible
    const ensureValidScore = (score: number) => Math.max(10, Math.min(100, score || 50));

    return {
      overall: ensureValidScore(overall),
      moisture: ensureValidScore(moistureScore),
      temperature: ensureValidScore(temperatureScore),
      ph: ensureValidScore(phScore),
      nitrogen: ensureValidScore(nitrogenScore),
      phosphorus: ensureValidScore(phosphorusScore),
      potassium: ensureValidScore(potassiumScore),
      ec: ensureValidScore(ecScore),
      organicMatter: ensureValidScore(organicMatterScore),
    }
  }

  // Helper function to calculate average of a parameter
  const calculateAverage = (readings: SoilReading[], parameter: keyof SoilReading) => {
    const validReadings = readings.filter((r) => {
      const value = r[parameter];
      return value !== undefined && value !== null && !isNaN(Number(value));
    });
    
    if (validReadings.length === 0) {
      console.log(`No valid readings found for ${parameter}`);
      return 0;
    }

    const sum = validReadings.reduce((acc, reading) => {
      const value = Number(reading[parameter]);
      return acc + value;
    }, 0);
    
    const average = sum / validReadings.length;
    console.log(`Average ${parameter}: ${average} (from ${validReadings.length} readings)`);
    return average;
  }

  // Helper function to convert a value to a score (0-100)
  const convertToScore = (value: number, min: number, max: number, optimalScore: number) => {
    if (!value && value !== 0) {
        return Math.round(optimalScore * 0.7); // Default score for missing data
    }

    // Special handling for EC which is now in µS/cm
    if (min === 200 && max === 800) { // EC thresholds
        if (value < min) {
            return Math.round(Math.max(10, (value / min) * (optimalScore * 0.7)));
        } else if (value > max) {
            const excess = value - max;
            const range = max - min;
            return Math.round(Math.max(10, optimalScore - (excess / range) * (optimalScore * 0.5)));
        } else {
            const position = (value - min) / (max - min);
            return Math.round(optimalScore * (0.8 + 0.2 * (1 - Math.abs(position - 0.5) * 2)));
        }
    }
    
    // Regular handling for other parameters
    if (value < min) {
        return Math.round(Math.max(10, (value / min) * (optimalScore * 0.7)));
    } else if (value > max) {
        const excess = value - max;
        const range = max - min;
        return Math.round(Math.max(10, optimalScore - (excess / range) * (optimalScore * 0.5)));
    } else {
        const position = (value - min) / (max - min);
        return Math.round(optimalScore * (0.8 + 0.2 * (1 - Math.abs(position - 0.5) * 2)));
    }
  }

  // Helper function to get rating text based on score
  const getRating = (score: number) => {
    if (score >= 85) return "Optimal";
    if (score >= 70) return "Good";
    if (score >= 50) return "Moderate";
    if (score >= 1) return "Low";
    return "No Data";
  }

  // Helper to get color based on score for better visual feedback
  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-green-400";
    if (score >= 50) return "bg-yellow-400";
    if (score >= 25) return "bg-orange-400";
    if (score >= 1) return "bg-red-400";
    return "bg-gray-300";
  };

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
        <Progress value={healthData.overall} className={`h-2 ${getScoreColor(healthData.overall)}`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Moisture</span>
            <span className="text-sm font-medium">{getRating(healthData.moisture)}</span>
          </div>
          <Progress value={healthData.moisture} className={`h-2 ${getScoreColor(healthData.moisture)}`} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Temperature</span>
            <span className="text-sm font-medium">{getRating(healthData.temperature)}</span>
          </div>
          <Progress value={healthData.temperature} className={`h-2 ${getScoreColor(healthData.temperature)}`} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">pH Level</span>
            <span className="text-sm font-medium">{getRating(healthData.ph)}</span>
          </div>
          <Progress value={healthData.ph} className={`h-2 ${getScoreColor(healthData.ph)}`} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Nitrogen (N)</span>
            <span className="text-sm font-medium">{getRating(healthData.nitrogen)}</span>
          </div>
          <Progress value={healthData.nitrogen} className={`h-2 ${getScoreColor(healthData.nitrogen)}`} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Phosphorus (P)</span>
            <span className="text-sm font-medium">{getRating(healthData.phosphorus)}</span>
          </div>
          <Progress value={healthData.phosphorus} className={`h-2 ${getScoreColor(healthData.phosphorus)}`} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Potassium (K)</span>
            <span className="text-sm font-medium">{getRating(healthData.potassium)}</span>
          </div>
          <Progress value={healthData.potassium} className={`h-2 ${getScoreColor(healthData.potassium)}`} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Electrical Conductivity</span>
            <span className="text-sm font-medium">{getRating(healthData.ec)}</span>
          </div>
          <Progress value={healthData.ec} className={`h-2 ${getScoreColor(healthData.ec)}`} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Organic Matter</span>
            <span className="text-sm font-medium">{getRating(healthData.organicMatter)}</span>
          </div>
          <Progress value={healthData.organicMatter} className={`h-2 ${getScoreColor(healthData.organicMatter)}`} />
        </div>
      </div>
    </div>
  )
}
