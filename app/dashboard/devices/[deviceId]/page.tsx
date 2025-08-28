"use client"

import { useParams, useRouter } from "next/navigation"
import { usePathname, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef, memo, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Battery,
  Signal,
  Droplets,
  ThermometerSun,
  FlaskConical,
  Zap,
  Leaf,
  AlertTriangle,
  CheckCircle,
  Loader2,
  CircleDashed,
  ChevronRight,
  Clock,
  Calendar,
  Wifi,
  PieChart,
  LineChart,
  ClipboardList,
  RefreshCw,
} from "lucide-react"
import { getLatestDeviceLog, getDeviceLogs, getUserDevices, updateDeviceName, getAllDevicesForAdmin, getLatestDeviceLogForAdmin, getDeviceLogsForAdmin } from "@/lib/field-eyes-api"
import { transformSoilReading } from "@/lib/transformers"
import { SoilReading } from "@/types/field-eyes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ParameterTrends } from "@/components/dashboard/parameter-trends"
import React from 'react'
import { NotificationCenter } from "@/components/dashboard/notification-center"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Device } from "@/types/field-eyes"
import { cn } from "@/lib/utils"
import { isAdmin } from "@/lib/client-auth"

// Donut chart component for visualizing readings
interface DonutChartProps {
  value: number;
  min: number;
  max: number;
  optimal: { min: number; max: number };
  unit: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  lastUpdated?: string;
}

// Last updated info component to eliminate flickering updates
const LastUpdatedBar = memo(({ lastUpdated }: { lastUpdated?: string }) => (
  <div className="w-full mt-2 pt-1 text-xs text-center text-gray-500 border-t border-gray-200 h-6 flex items-center justify-center transition-opacity duration-300">
    {lastUpdated || "No data"}
  </div>
), (prev, next) => prev.lastUpdated === next.lastUpdated);

LastUpdatedBar.displayName = 'LastUpdatedBar';

// Moisture visualization with container 
const MoistureCard = memo(({ value, min, max, optimal, unit, label, icon: Icon, lastUpdated }: DonutChartProps) => {
  // Determine status based on optimal range
  const getStatus = () => {
    if (value >= optimal.min && value <= optimal.max) return "optimal";
    if (value < optimal.min) return "low";
    return "high";
  };
  
  const status = getStatus();
  
  // Define colors based on status
  const statusColors = {
    optimal: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200",
      water: "bg-blue-500"
    },
    low: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
      water: "bg-blue-400"
    },
    high: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-200",
      water: "bg-blue-600"
    }
  };
  
  const colors = statusColors[status];
  
    return (
    <Card className="border h-[18rem] flex flex-col justify-between shadow-md">
      <CardHeader className="pb-3 pt-2">
        <CardTitle className="text-sm font-medium flex items-center justify-center w-full">
          <Icon className="h-4 w-4 mr-1" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pb-1">
        <div className="flex flex-col items-center flex-grow mt-4">
          {/* Moisture container visualization */}
          <div className="mb-4 h-32 w-32 mt-2">
            <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
              <div
                key={`water-${value}`}
                className={`absolute bottom-0 w-full ${colors.water} transition-all duration-500`}
                style={{ height: `${value}%` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span key={`value-${value}`} className="text-2xl font-bold text-white transition-all duration-300">{value}%</span>
            </div>
          </div>
        </div>

          <div className="text-xs text-center text-gray-600 mt-2">
            Optimal range: {optimal.min} - {optimal.max} {unit}
        </div>
        </div>

        {/* Last updated info at the bottom with uniform height */}
        <LastUpdatedBar lastUpdated={lastUpdated} />
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.lastUpdated === nextProps.lastUpdated
  );
});

MoistureCard.displayName = 'MoistureCard';

// Thermometer visualization for temperature
const ThermometerCard = memo(({ value, min, max, optimal, unit, label, icon: Icon, lastUpdated }: DonutChartProps) => {
  // Determine status based on optimal range
  const getStatus = () => {
    if (value >= optimal.min && value <= optimal.max) return "optimal";
    if (value < optimal.min) return "low";
    return "high";
  };
  
  const status = getStatus();
  
  // Calculate percentage for height display (0-100)
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  
  // Define colors based on status
  const statusColors = {
    optimal: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200",
      mercury: "from-blue-500 to-red-500"
    },
    low: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
      mercury: "from-blue-400 to-blue-600"
    },
    high: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-200",
      mercury: "from-red-400 to-red-600"
    }
  };
  
  const colors = statusColors[status];
  
  // Set mercury gradient based on status
  const mercuryGradient = status === 'optimal' 
    ? 'from-blue-500 to-red-500' 
    : status === 'low' 
      ? 'from-blue-400 to-blue-600' 
      : 'from-red-400 to-red-600';
  
  return (
    <Card className="border h-[18rem] flex flex-col justify-between shadow-md">
      <CardHeader className="pb-3 pt-2">
        <CardTitle className="text-sm font-medium flex items-center justify-center w-full">
          <Icon className="h-4 w-4 mr-1" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pb-1">
        <div className="flex flex-col items-center flex-grow mt-4">
          {/* Thermometer visualization */}
          <div className="mb-2 mt-2 flex items-center justify-center">
            <div className="relative flex h-36 items-center">
              <div className="relative mx-4">
                {/* Thermometer tube */}
                <div className="relative h-28 w-5 overflow-hidden rounded-t-full rounded-b-full border-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                  {/* Mercury */}
                  <div
                    className={`absolute bottom-0 w-full bg-gradient-to-t transition-all duration-500 ${mercuryGradient}`}
                    style={{ height: `${percentage}%` }}
                  ></div>
                </div>
                {/* Thermometer bulb */}
                <div className={`absolute -bottom-3 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-gray-300 ${status === 'optimal' ? 'bg-orange-500' : status === 'low' ? 'bg-blue-500' : 'bg-red-500'} dark:border-gray-600`}></div>
              </div>

              {/* Temperature scale */}
              <div className="flex h-28 flex-col justify-between text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-0.5 w-2 bg-gray-400"></div>
                  <span>{max}°C</span>
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <div className="h-0.5 w-2 bg-green-500"></div>
                  <span>{optimal.max}°C</span>
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <div className="h-0.5 w-2 bg-green-500"></div>
                  <span>{optimal.min}°C</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-0.5 w-2 bg-gray-400"></div>
                  <span>{min}°C</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="mb-1 text-xl font-bold transition-all duration-300">{value}°C</div>
          </div>
        </div>
          
        {/* Last updated info at the bottom with uniform height */}
        <LastUpdatedBar lastUpdated={lastUpdated} />
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.lastUpdated === nextProps.lastUpdated
  );
});

ThermometerCard.displayName = 'ThermometerCard';

// pH semi-circular gauge visualization
const PHCard = memo(({ value, min, max, optimal, unit, label, icon: Icon, lastUpdated }: DonutChartProps) => {
  // Determine status based on optimal range
  const getStatus = () => {
    if (value >= optimal.min && value <= optimal.max) return "optimal";
    if (value < optimal.min) return "low";
    return "high";
  };
  
  const status = getStatus();
  
  // Calculate percentage position (0-100)
  const position = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  
  // Define colors based on status
  const statusColors = {
    optimal: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200"
    },
    low: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200"
    },
    high: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-200"
    }
  };
  
  const colors = statusColors[status];
  
  return (
    <Card className="border h-[18rem] flex flex-col justify-between shadow-md">
      <CardHeader className="pb-3 pt-2">
        <CardTitle className="text-sm font-medium flex items-center justify-center w-full">
          <Icon className="h-4 w-4 mr-1" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pb-1">
        <div className="flex flex-col items-center flex-grow mt-4">
          {/* Semi-circular pH gauge */}
          <div className="relative mb-2 h-32 w-full mt-2">
            <svg viewBox="0 0 200 100" className="h-full w-full">
              {/* Background arc */}
              <path
                d="M 10,100 A 90,90 0 0,1 190,100"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="12"
                className="dark:stroke-gray-700"
              />

              {/* pH scale gradient */}
              <defs>
                <linearGradient id="phGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" /> {/* Red (acidic) */}
                  <stop offset="43%" stopColor="#f59e0b" /> {/* Yellow (slightly acidic) */}
                  <stop offset="50%" stopColor="#22c55e" /> {/* Green (neutral) */}
                  <stop offset="57%" stopColor="#3b82f6" /> {/* Blue (slightly alkaline) */}
                  <stop offset="100%" stopColor="#8b5cf6" /> {/* Purple (alkaline) */}
                </linearGradient>
              </defs>

              {/* Colored pH scale */}
              <path
                d="M 10,100 A 90,90 0 0,1 190,100"
                fill="none"
                stroke="url(#phGradient)"
                strokeWidth="12"
              />

              {/* pH value indicator */}
              <circle
                key={`indicator-${value}`}
                cx={10 + 180 * ((value - min) / (max - min))}
                cy="100"
                r="8"
                fill="white"
                stroke="#000"
                strokeWidth="2"
                className="dark:fill-gray-800 transition-all duration-300"
              />

              {/* pH labels */}
              <text x="10" y="85" fontSize="8" textAnchor="middle" fill="currentColor">
                {min}
              </text>
              <text x="70" y="70" fontSize="8" textAnchor="middle" fill="currentColor">
                {(max - min) * 0.3 + min}
              </text>
              <text x="100" y="65" fontSize="8" textAnchor="middle" fill="currentColor">
                7
              </text>
              <text x="130" y="70" fontSize="8" textAnchor="middle" fill="currentColor">
                {(max - min) * 0.7 + min}
              </text>
              <text x="190" y="85" fontSize="8" textAnchor="middle" fill="currentColor">
                {max}
              </text>

              {/* pH categories */}
              <text x="40" y="55" fontSize="7" textAnchor="middle" fill="#ef4444">
                Acidic
              </text>
              <text x="100" y="45" fontSize="7" textAnchor="middle" fill="#22c55e">
                Neutral
              </text>
              <text x="160" y="55" fontSize="7" textAnchor="middle" fill="#8b5cf6">
                Alkaline
              </text>
            </svg>

            {/* Current pH value */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
              <div key={`value-${value}`} className="text-2xl font-bold transition-all duration-300">{value}</div>
              <div className="text-sm">pH</div>
              </div>
              </div>

          <div className="text-xs text-center text-gray-600 mt-1">
            Optimal range: {optimal.min} - {optimal.max} {unit}
            </div>
        </div>
          
        {/* Last updated info at the bottom with uniform height */}
        <LastUpdatedBar lastUpdated={lastUpdated} />
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.lastUpdated === nextProps.lastUpdated
  );
});

PHCard.displayName = 'PHCard';

// NPK nutrient visualization with animated horizontal bars
const NutrientBarVisual = memo(({ value, min, max, optimal, unit, label, icon: Icon, lastUpdated }: DonutChartProps) => {
  // Determine status based on optimal range
  const getStatus = () => {
    if (value >= optimal.min && value <= optimal.max) return "optimal";
    if (value < optimal.min) return "low";
    return "high";
  };
  
  const status = getStatus();
  
  // Calculate percentage for the progress bar (0-100)
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  
  // Define colors based on status
  const statusColors = {
    optimal: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200"
    },
    low: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200"
    },
    high: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-200"
    }
  };

  // Specialized colors based on nutrient type with a default fallback
  const nutrientColors: Record<string, { bar: string; text: string }> = {
    "Nitrogen (N)": {
      bar: "bg-green-500",
      text: "text-green-600"
    },
    "Phosphorus (P)": {
      bar: "bg-red-500",
      text: "text-red-600"
    },
    "Potassium (K)": {
      bar: "bg-amber-500",
      text: "text-amber-600"
    }
  };
  
  const colors = statusColors[status];
  const defaultNutrientColor = { bar: "bg-blue-500", text: "text-blue-600" };
  const nutrientColor = nutrientColors[label] || defaultNutrientColor;
  
    return (
    <Card className="border h-[18rem] flex flex-col justify-between shadow-md">
      <CardHeader className="pb-3 pt-2">
        <CardTitle className="text-sm font-medium flex items-center justify-center w-full">
          <Icon className="h-4 w-4 mr-1" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pb-1">
        <div className="space-y-4 flex-grow mt-4">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${nutrientColor.bar}`}></span>
              <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-sm font-bold transition-all duration-300">{value} {unit}</span>
          </div>
          
          {/* Bar chart representation */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 mt-1">
            <div 
              className={`h-full ${nutrientColor.bar} rounded-full transition-all duration-500 ease-out`} 
              style={{ width: `${percentage}%` }}
            ></div>
        </div>

          <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{min}</span>
            <span className={nutrientColor.text}>Optimal ({optimal.min}-{optimal.max} {unit})</span>
            <span>{max}</span>
              </div>
        </div>
          
        {/* Last updated info at the bottom with uniform height */}
        <LastUpdatedBar lastUpdated={lastUpdated} />
            </CardContent>
          </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.lastUpdated === nextProps.lastUpdated
  );
});

NutrientBarVisual.displayName = 'NutrientBarVisual';

// Circular EC gauge visualization
const ECGauge = memo(({ value, min, max, optimal, unit, label, icon: Icon, lastUpdated }: DonutChartProps) => {
  // Determine status based on optimal range
  const getStatus = () => {
    if (value >= optimal.min && value <= optimal.max) return "optimal";
    if (value < optimal.min) return "low";
    return "high";
  };
  
  const status = getStatus();
  
  // Calculate percentage for the gauge (0-100)
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (percentage / 100) * circumference;
  
  // Define colors based on status
  const statusColors = {
    optimal: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200",
      gauge: "stroke-emerald-500"
    },
    low: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
      gauge: "stroke-amber-500"
    },
    high: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-200",
      gauge: "stroke-rose-500"
    }
  };
  
  const colors = statusColors[status];
  
  return (
    <Card className="border h-[18rem] flex flex-col justify-between shadow-md">
      <CardHeader className="pb-3 pt-2">
        <CardTitle className="text-sm font-medium flex items-center justify-center w-full">
          <Icon className="h-4 w-4 mr-1" />
          {label}
        </CardTitle>
            </CardHeader>
      <CardContent className="flex-grow flex flex-col pb-1">
        <div className="flex flex-col items-center flex-grow">
          <div className="mb-4 mt-2 flex h-32 w-full items-center justify-center">
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <path
                  d="M 50,50 m 0,-45 a 45,45 0 1 1 0,90 a 45,45 0 1 1 0,-90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="stroke-gray-200 dark:stroke-gray-700"
                ></path>
                <path
                  d="M 50,50 m 0,-45 a 45,45 0 1 1 0,90 a 45,45 0 1 1 0,-90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={dashOffset}
                  className={colors.gauge}
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                ></path>
                <text
                  x="50"
                  y="50"
                  textAnchor="middle"
                  dy="0.3em"
                  className="fill-gray-900 text-2xl font-bold dark:fill-white"
                >
                  {value}
                </text>
              </svg>
                </div>
                </div>
          
          <div className="text-sm text-gray-600 font-medium mb-3">{unit}</div>
        </div>
          
        <div className="text-xs text-center text-gray-600 mt-2">
          Optimal range: {optimal.min} - {optimal.max} {unit}
        </div>
          
        {/* Last updated info at the bottom with uniform height */}
        <LastUpdatedBar lastUpdated={lastUpdated} />
            </CardContent>
          </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.lastUpdated === nextProps.lastUpdated
  );
});

ECGauge.displayName = 'ECGauge';

// Keep the original DonutChart for some metrics
const DonutChart = memo(({ value, min, max, optimal, unit, label, icon: Icon, lastUpdated }: DonutChartProps) => {
  // Determine status based on optimal range
  const getStatus = () => {
    if (value >= optimal.min && value <= optimal.max) return "optimal";
    if (value < optimal.min) return "low";
    return "high";
  };
  
  const status = getStatus();
  
  // Define colors based on status
  const statusColors = {
    optimal: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200"
    },
    low: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200"
    },
    high: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-200"
    }
  };
  
  const colors = statusColors[status];
  
  return (
    <Card className="border h-[18rem] flex flex-col justify-between shadow-md">
      <CardHeader className="pb-3 pt-2">
        <CardTitle className="text-sm font-medium flex items-center justify-center w-full">
          <Icon className="h-4 w-4 mr-1" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pb-1">
        <div className="flex flex-col items-center flex-grow">
          {/* Use transitions instead of keys for smooth updates */}
          <div className="text-4xl font-bold text-gray-900 mb-1 mt-2 transition-all duration-300">{value}</div>
          <div className="text-sm text-gray-600 font-medium mb-3">{unit}</div>
          
          <Badge className={`${status === 'optimal' ? 'bg-emerald-500' : status === 'low' ? 'bg-amber-500' : 'bg-rose-500'} text-white hover:opacity-90 mb-2`}>
            {status === 'optimal' ? 'Optimal' : status === 'low' ? 'Low' : 'High'}
          </Badge>
          
          <div className="text-xs text-center text-gray-600 mt-2">
            Optimal range: {optimal.min} - {optimal.max} {unit}
        </div>
      </div>
          
        {/* Last updated info at the bottom with uniform height */}
        <LastUpdatedBar lastUpdated={lastUpdated} />
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Optimize re-renders - only update if the values actually changed meaningfully
  return (
    prevProps.value === nextProps.value &&
    prevProps.lastUpdated === nextProps.lastUpdated
  );
});

// Give the component a display name to help with debugging
DonutChart.displayName = 'DonutChart';

// Define a type for readings data
type ReadingsData = {
  humidity: { value: number; time: string };
  ambientTemp: { value: number; time: string };
  moisture: { value: number; time: string };
  temperature: { value: number; time: string };
  ph: { value: number; time: string };
  ec: { value: number; time: string };
  nitrogen: { value: number; time: string };
  phosphorus: { value: number; time: string };
  potassium: { value: number; time: string };
  timestamp?: number;
};

// Combined NPK nutrients card
const NutrientsCombinedCard = memo(({ 
  nitrogenValue, 
  phosphorusValue, 
  potassiumValue, 
  lastUpdated 
}: { 
  nitrogenValue: number; 
  phosphorusValue: number; 
  potassiumValue: number; 
  lastUpdated: string;
}) => {
  // Determine overall status based on all nutrients
  const getStatus = () => {
    const nitrogenOptimal = nitrogenValue >= 25 && nitrogenValue <= 50;
    const phosphorusOptimal = phosphorusValue >= 30 && phosphorusValue <= 50;
    const potassiumOptimal = potassiumValue >= 100 && potassiumValue <= 180;
    
    if (nitrogenOptimal && phosphorusOptimal && potassiumOptimal) return "optimal";
    if (nitrogenValue < 25 || phosphorusValue < 30 || potassiumValue < 100) return "low";
    return "high";
  };
  
  const status = getStatus();
  
  // Define colors based on status
  const statusColors = {
    optimal: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200"
    },
    low: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200"
    },
    high: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-200"
    }
  };
  
  const colors = statusColors[status];
  
  // Calculate percentage for the progress bar (0-100)
  const nitrogenPercentage = Math.min(Math.max(((nitrogenValue - 0) / (100 - 0)) * 100, 0), 100);
  const phosphorusPercentage = Math.min(Math.max(((phosphorusValue - 0) / (150 - 0)) * 100, 0), 100);
  const potassiumPercentage = Math.min(Math.max(((potassiumValue - 0) / (300 - 0)) * 100, 0), 100);
  
  // Nutrient colors
  const nutrientColors = {
    nitrogen: {
      bar: "bg-green-500",
      text: "text-green-600"
    },
    phosphorus: {
      bar: "bg-red-500",
      text: "text-red-600"
    },
    potassium: {
      bar: "bg-amber-500",
      text: "text-amber-600"
    }
  };

  return (
    <Card className="border h-[18rem] flex flex-col justify-between shadow-md">
      <CardHeader className="pb-3 pt-2">
        <CardTitle className="text-sm font-medium flex items-center justify-center w-full">
          <Leaf className="h-4 w-4 mr-1" />
          Soil Nutrients (NPK)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pb-1">
        <div className="space-y-3 flex-grow mt-4">
          {/* Nitrogen */}
    <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${nutrientColors.nitrogen.bar}`}></span>
                <span className="text-sm font-medium">Nitrogen (N)</span>
          </div>
              <span className="text-sm font-bold">{nitrogenValue} mg/kg</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div 
                className={`h-full ${nutrientColors.nitrogen.bar} rounded-full transition-all duration-500 ease-out`} 
                style={{ width: `${nitrogenPercentage}%` }}
              ></div>
        </div>
      </div>

          {/* Phosphorus */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${nutrientColors.phosphorus.bar}`}></span>
                <span className="text-sm font-medium">Phosphorus (P)</span>
              </div>
              <span className="text-sm font-bold">{phosphorusValue} mg/kg</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div 
                className={`h-full ${nutrientColors.phosphorus.bar} rounded-full transition-all duration-500 ease-out`} 
                style={{ width: `${phosphorusPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Potassium */}
              <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${nutrientColors.potassium.bar}`}></span>
                <span className="text-sm font-medium">Potassium (K)</span>
              </div>
              <span className="text-sm font-bold">{potassiumValue} mg/kg</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((potassiumValue) / 300) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
          
        {/* Last updated info at the bottom with uniform height */}
        <LastUpdatedBar lastUpdated={lastUpdated} />
          </CardContent>
        </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.nitrogenValue === nextProps.nitrogenValue &&
    prevProps.phosphorusValue === nextProps.phosphorusValue &&
    prevProps.potassiumValue === nextProps.potassiumValue &&
    prevProps.lastUpdated === nextProps.lastUpdated
  );
});

NutrientsCombinedCard.displayName = 'NutrientsCombinedCard';

// Combined ambient conditions card
const AmbientConditionsCard = memo(({ 
  humidityValue, 
  temperatureValue, 
  lastUpdated 
}: { 
  humidityValue: number; 
  temperatureValue: number; 
  lastUpdated: string;
}) => {
  // Determine overall status based on both conditions
  const getHumidityStatus = () => {
    if (humidityValue >= 40 && humidityValue <= 70) return "optimal";
    if (humidityValue < 40) return "low";
    return "high";
  };
  
  const getTemperatureStatus = () => {
    if (temperatureValue >= 18 && temperatureValue <= 27) return "optimal";
    if (temperatureValue < 18) return "low";
    return "high";
  };
  
  const humidityStatus = getHumidityStatus();
  const temperatureStatus = getTemperatureStatus();
  
  // Overall status is optimal only if both are optimal
  const overallStatus = humidityStatus === "optimal" && temperatureStatus === "optimal" 
    ? "optimal" 
    : (humidityStatus === "high" || temperatureStatus === "high") 
      ? "high" 
      : "low";
  
  // Define colors based on status
  const statusColors = {
    optimal: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200"
    },
    low: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200"
    },
    high: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-200"
    }
  };
  
  const colors = statusColors[overallStatus];
  
  // Calculate percentage for the progress bars (0-100)
  const humidityPercentage = humidityValue; // Humidity is already 0-100
  const temperaturePercentage = Math.min(Math.max(((temperatureValue - 0) / (40 - 0)) * 100, 0), 100);
  
  return (
    <Card className="border h-[18rem] flex flex-col justify-between shadow-md">
      <CardHeader className="pb-3 pt-2">
        <CardTitle className="text-sm font-medium flex items-center justify-center w-full">
          <ThermometerSun className="h-4 w-4 mr-1" />
          Ambient Conditions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pb-1">
        <div className="space-y-4 flex-grow mt-4">
          {/* Humidity */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                <span className="text-sm font-medium">Humidity</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold transition-all duration-300">{humidityValue}%</span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div 
                className={`h-full ${humidityStatus === 'optimal' ? 'bg-blue-500' : humidityStatus === 'low' ? 'bg-amber-500' : 'bg-rose-500'} rounded-full transition-all duration-500 ease-out`} 
                style={{ width: `${humidityPercentage}%` }}
              ></div>
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span className="text-blue-600">Optimal (40-70%)</span>
              <span>100%</span>
            </div>
          </div>
          
          {/* Temperature */}
              <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThermometerSun className="h-4 w-4" />
                <span className="text-sm font-medium">Temperature</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold transition-all duration-300">{temperatureValue}°C</span>
            </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div 
                className={`h-full ${temperatureStatus === 'optimal' ? 'bg-orange-500' : temperatureStatus === 'low' ? 'bg-blue-500' : 'bg-red-500'} rounded-full transition-all duration-500 ease-out`} 
                style={{ width: `${temperaturePercentage}%` }}
              ></div>
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>0°C</span>
              <span className="text-orange-600">Optimal (18-27°C)</span>
              <span>40°C</span>
            </div>
          </div>
        </div>
          
        {/* Last updated info at the bottom with uniform height */}
        <LastUpdatedBar lastUpdated={lastUpdated} />
          </CardContent>
        </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.humidityValue === nextProps.humidityValue &&
    prevProps.temperatureValue === nextProps.temperatureValue &&
    prevProps.lastUpdated === nextProps.lastUpdated
  );
});

AmbientConditionsCard.displayName = 'AmbientConditionsCard';

// Update the ReadingsGrid layout to have a balanced arrangement with fewer cards per row
const ReadingsGrid = memo(
  ({ readings }: { readings: ReadingsData }) => {
    if (!readings) return null;
    
    // Helper functions for styling (updated for soil analysis ranges)
    const getNutrientLevel = (value: number, nutrientType: 'N' | 'P' | 'K' = 'N') => {
      switch(nutrientType) {
        case 'N': // Nitrogen
          if (value < 25) return 'Low'
          if (value > 50) return 'High'
          return 'Optimal'
        case 'P': // Phosphorus  
          if (value < 30) return 'Low'
          if (value > 100) return 'High'
          return 'Optimal'
        case 'K': // Potassium
          if (value < 100) return 'Low'
          if (value > 250) return 'High'
          return 'Optimal'
        default:
          if (value < 25) return 'Low'
          if (value > 50) return 'High'
          return 'Optimal'
      }
    }

    const getNutrientColor = (value: number, nutrientType: 'N' | 'P' | 'K' = 'N') => {
      switch(nutrientType) {
        case 'N': // Nitrogen
          if (value < 25) return 'text-red-500'
          if (value > 50) return 'text-amber-500'
          return 'text-green-500'
        case 'P': // Phosphorus
          if (value < 30) return 'text-red-500'
          if (value > 100) return 'text-amber-500'
          return 'text-green-500'
        case 'K': // Potassium
          if (value < 100) return 'text-red-500'
          if (value > 250) return 'text-amber-500'
          return 'text-green-500'
        default:
          if (value < 25) return 'text-red-500'
          if (value > 50) return 'text-amber-500'
          return 'text-green-500'
      }
    }

    const getPhStatus = (ph: number) => {
      if (ph < 6.0) return { text: 'Acidic', color: 'text-amber-500 bg-amber-100' }
      if (ph > 7.5) return { text: 'Alkaline', color: 'text-blue-700 bg-blue-100' }
      return { text: 'Neutral', color: 'text-green-500 bg-green-100' }
    }

    const getECLevel = (value: number) => {
      // EC thresholds in µS/cm: Low < 200, Optimal 200-1200, High > 1200
      if (value < 200) return 'Low'
      if (value > 1200) return 'High'
      return 'Optimal'
    }

    const getECColor = (value: number) => {
      // EC thresholds in µS/cm: Low < 200, Optimal 200-1200, High > 1200
      if (value < 200) return 'text-red-500'
      if (value > 1200) return 'text-amber-500'
      return 'text-green-500'
    }
    
    return (
      <div className="space-y-6">
        {/* Top row: Main environmental metrics in a single card with 4 sections */}
        <Card className="border-0 shadow-lg rounded-xl">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x border-gray-100">
              {/* Temperature */}
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="rounded-full p-2 mr-3 bg-red-100">
                    <ThermometerSun className="h-4 w-4 text-red-600" />
              </div>
                  <h6 className="text-sm font-medium">Temperature</h6>
              </div>
                <div className="flex items-baseline">
                  <div className="text-4xl font-semibold mr-2">{readings.ambientTemp.value}</div>
                  <span className="text-gray-500">°C</span>
            </div>
                <div className="text-xs text-gray-500 mt-1">Air temperature</div>
                <div className="mt-3 text-xs text-gray-400 text-right">
                  {readings.ambientTemp.time}
                </div>
      </div>

              {/* Soil Temperature */}
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="rounded-full p-2 mr-3 bg-amber-100">
                    <ThermometerSun className="h-4 w-4 text-amber-600" />
              </div>
                  <h6 className="text-sm font-medium">Soil Temperature</h6>
                </div>
                <div className="flex items-baseline">
                  <div className="text-4xl font-semibold mr-2">{readings.temperature.value}</div>
                  <span className="text-gray-500">°C</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Soil temperature</div>
                <div className="mt-3 text-xs text-gray-400 text-right">
                  {readings.temperature.time}
                </div>
              </div>
              
              {/* Humidity */}
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="rounded-full p-2 mr-3 bg-gray-100">
                    <Droplets className="h-4 w-4 text-gray-700" />
                  </div>
                  <h6 className="text-sm font-medium">Humidity</h6>
                </div>
                <div className="flex items-baseline">
                  <div className="text-4xl font-semibold mr-2">{readings.humidity.value}</div>
                  <span className="text-gray-500">%</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Air humidity</div>
                <div className="mt-3 text-xs text-gray-400 text-right">
                  {readings.humidity.time}
                </div>
              </div>
              
              {/* Soil Moisture */}
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="rounded-full p-2 mr-3 bg-green-100">
                    <Droplets className="h-4 w-4 text-green-600" />
                  </div>
                  <h6 className="text-sm font-medium">Soil Moisture</h6>
                </div>
                <div className="flex items-baseline">
                  <div className="text-4xl font-semibold mr-2">{readings.moisture.value}</div>
                  <span className="text-gray-500">%</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Moisture in soil</div>
                <div className="mt-3 text-xs text-gray-400 text-right">
                  {readings.moisture.time}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Second row: Soil properties and visualizations */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {/* Soil Properties */}
          <div className="md:col-span-4">
            <Card className="border-0 shadow-lg rounded-xl h-full">
              <CardHeader className="pt-4 pb-2 px-4">
                <CardTitle className="text-base font-medium">Soil Properties</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* pH Level with gauge visualization */}
                  <div className="text-center">
                    <h6 className="text-sm font-medium mb-3">pH Level</h6>
                    <div className="relative inline-block">
                      <div className="relative" style={{ width: '120px', height: '120px' }}>
                        <svg viewBox="0 0 36 36" className="w-full h-full">
                          {/* Background circle */}
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#eee"
                            strokeWidth="3"
                            strokeDasharray="100, 100"
                          />
                          {/* Value arc */}
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={readings.ph.value < 6.0 ? '#ffc107' : readings.ph.value > 7.5 ? '#0f766e' : '#22c55e'}
                            strokeWidth="3"
                            strokeDasharray={`${(readings.ph.value / 14) * 100}, 100`}
                          />
                        </svg>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                          <div className="text-3xl font-semibold">{readings.ph.value}</div>
              </div>
                      </div>
                    </div>
                    <div className={`inline-block px-3 py-1 rounded-lg mt-3 text-xs font-medium ${getPhStatus(readings.ph.value).color}`}>
                      {getPhStatus(readings.ph.value).text}
                    </div>
                    <div className="text-xs text-gray-400 mt-3">
                      {readings.ph.time}
                    </div>
                  </div>
                  
                  {/* NPK Levels */}
              <div>
                    <h6 className="text-sm font-medium mb-3 text-center">NPK Levels</h6>
                    
                    {/* Nitrogen */}
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs flex items-center">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
                          Nitrogen
                        </span>
                        <span className={`text-xs ${getNutrientColor(readings.nitrogen.value, 'N')}`}>
                          {readings.nitrogen.value} mg/kg - {getNutrientLevel(readings.nitrogen.value, 'N')}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(((readings.nitrogen.value) / 100) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Phosphorus */}
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs flex items-center">
                          <span className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></span>
                          Phosphorus
                        </span>
                        <span className={`text-xs ${getNutrientColor(readings.phosphorus.value, 'P')}`}>
                          {readings.phosphorus.value} mg/kg - {getNutrientLevel(readings.phosphorus.value, 'P')}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(((readings.phosphorus.value) / 150) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Potassium */}
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs flex items-center">
                          <span className="h-2 w-2 rounded-full bg-amber-500 mr-1.5"></span>
                          Potassium
                        </span>
                        <span className={`text-xs ${getNutrientColor(readings.potassium.value, 'K')}`}>
                          {readings.potassium.value} mg/kg - {getNutrientLevel(readings.potassium.value, 'K')}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(((readings.potassium.value) / 300) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Electrical Conductivity */}
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs flex items-center">
                          <span className="h-2 w-2 rounded-full bg-blue-500 mr-1.5"></span>
                          Electrical Conductivity
                        </span>
                        <span className={`text-xs ${getECColor(readings.ec.value * 1000)}`}>
                          {(readings.ec.value * 1000).toFixed(0)} µS/cm - {getECLevel(readings.ec.value * 1000)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(((readings.ec.value) / 2) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
          
          {/* Recommendations */}
          <div className="md:col-span-3">
            <Card className="border-0 shadow-lg rounded-xl h-full">
              <CardHeader className="pt-4 pb-2 px-4">
                <CardTitle className="text-base font-medium flex items-center">
                  <ClipboardList className="h-4 w-4 mr-2 text-green-600" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {/* Water needed */}
                  {readings.moisture.value < 40 && (
                    <div className="py-3 px-4">
                      <div className="flex">
                        <div className="mr-3">
                          <div className="rounded-full p-2 bg-amber-100">
                            <Droplets className="h-4 w-4 text-amber-500" />
                          </div>
              </div>
              <div>
                          <h6 className="text-sm font-medium mb-1">Water needed</h6>
                          <p className="text-xs text-gray-500">Soil moisture is low, consider watering your plants.</p>
              </div>
            </div>
                    </div>
                  )}
                  
                  {/* pH too low */}
                  {readings.ph.value < 6.0 && (
                    <div className="py-3 px-4">
                      <div className="flex">
                        <div className="mr-3">
                          <div className="rounded-full p-2 bg-gray-100">
                            <FlaskConical className="h-4 w-4 text-gray-600" />
                          </div>
              </div>
              <div>
                          <h6 className="text-sm font-medium mb-1">pH too low</h6>
                          <p className="text-xs text-gray-500">Soil is acidic. Consider adding lime to raise the pH.</p>
              </div>
            </div>
                    </div>
                  )}
                  
                  {/* pH too high */}
                  {readings.ph.value > 7.5 && (
                    <div className="py-3 px-4">
                      <div className="flex">
                        <div className="mr-3">
                          <div className="rounded-full p-2 bg-gray-100">
                            <FlaskConical className="h-4 w-4 text-gray-600" />
                          </div>
              </div>
              <div>
                          <h6 className="text-sm font-medium mb-1">pH too high</h6>
                          <p className="text-xs text-gray-500">Soil is alkaline. Consider adding sulfur to lower the pH.</p>
              </div>
            </div>
                    </div>
                  )}
                  
                  {/* Low nitrogen */}
                  {readings.nitrogen.value < 15 && (
                    <div className="py-3 px-4">
                      <div className="flex">
                        <div className="mr-3">
                          <div className="rounded-full p-2 bg-green-100">
                            <Leaf className="h-4 w-4 text-green-600" />
                          </div>
              </div>
              <div>
                          <h6 className="text-sm font-medium mb-1">Low nitrogen</h6>
                          <p className="text-xs text-gray-500">Consider adding nitrogen-rich fertilizer.</p>
              </div>
            </div>
                    </div>
                  )}
                  
                  {/* Low phosphorus */}
                  {readings.phosphorus.value < 10 && (
                    <div className="py-3 px-4">
                      <div className="flex">
                        <div className="mr-3">
                          <div className="rounded-full p-2 bg-amber-100">
                            <Leaf className="h-4 w-4 text-amber-500" />
                          </div>
              </div>
              <div>
                          <h6 className="text-sm font-medium mb-1">Low phosphorus</h6>
                          <p className="text-xs text-gray-500">Consider adding phosphorus-rich fertilizer for better flowering/fruiting.</p>
              </div>
            </div>
                    </div>
                  )}
                  
                  {/* Low potassium */}
                  {readings.potassium.value < 10 && (
                    <div className="py-3 px-4">
                      <div className="flex">
                        <div className="mr-3">
                          <div className="rounded-full p-2 bg-purple-100">
                            <Leaf className="h-4 w-4 text-purple-600" />
                          </div>
              </div>
              <div>
                          <h6 className="text-sm font-medium mb-1">Low potassium</h6>
                          <p className="text-xs text-gray-500">Consider adding potassium-rich fertilizer for overall plant health.</p>
              </div>
            </div>
                    </div>
                  )}
                  
                  {/* All good */}
                  {readings.moisture.value >= 40 && 
                   readings.ph.value >= 6.0 && readings.ph.value <= 7.5 && 
                   readings.nitrogen.value >= 15 && 
                   readings.phosphorus.value >= 10 && 
                   readings.potassium.value >= 10 && (
                    <div className="py-3 px-4">
                      <div className="flex">
                        <div className="mr-3">
                          <div className="rounded-full p-2 bg-green-100">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
              </div>
              <div>
                          <h6 className="text-sm font-medium mb-1">All good!</h6>
                          <p className="text-xs text-gray-500">Your soil conditions are optimal for most plants.</p>
              </div>
                      </div>
                    </div>
                  )}
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
      </div>
    );
  },
  // Custom comparison function that only triggers re-renders when values change
  (prevProps, nextProps) => {
    // Only re-render if the timestamp changes (or any readings change significantly)
    if (prevProps.readings.timestamp !== nextProps.readings.timestamp) {
      return false; // Not equal, should update
    }
    return true; // Equal, no update needed
  }
);

ReadingsGrid.displayName = 'ReadingsGrid';

// Define required types
interface DeviceInfo extends Omit<Device, 'name' | 'status'> {
  status: "active" | "warning" | "offline";
  name: string;
  serial_number: string;
}

type DeviceAlertItem = {
  type: string;
  message: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Main page component
export default function DeviceDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const deviceId = params.deviceId as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false) // New state for refresh indicator
  const [error, setError] = useState<string | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [readings, setReadings] = useState<ReadingsData | null>(null)
  const [deviceAlerts, setDeviceAlerts] = useState<DeviceAlertItem[]>([])
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState("")
  const [isAdminUser, setIsAdminUser] = useState(false)
  const { toast } = useToast()
  
  // Use refs to minimize re-renders
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevReadingsRef = useRef<ReadingsData | null>(null)
  const lastUpdatedRef = useRef<Date>(new Date())

  // Function to format date and time
  const formatDateTime = (timestamp: string) => {
    if (!timestamp) return "No data";
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (err) {
      return "Invalid date";
    }
  }

  // Function to check if readings have changed significantly
  const haveReadingsChanged = (current: ReadingsData, previous: ReadingsData) => {
    if (!previous) return true;
    
    // Use a more precise comparison with configurable threshold
    const CHANGE_THRESHOLD = 0.1; // Only consider changes greater than this
              return (
      Math.abs(current.humidity.value - previous.humidity.value) > CHANGE_THRESHOLD ||
      Math.abs(current.ambientTemp.value - previous.ambientTemp.value) > CHANGE_THRESHOLD ||
      Math.abs(current.moisture.value - previous.moisture.value) > CHANGE_THRESHOLD ||
      Math.abs(current.temperature.value - previous.temperature.value) > CHANGE_THRESHOLD ||
      Math.abs(current.ph.value - previous.ph.value) > CHANGE_THRESHOLD ||
      Math.abs(current.ec.value - previous.ec.value) > CHANGE_THRESHOLD ||
      Math.abs(current.nitrogen.value - previous.nitrogen.value) > CHANGE_THRESHOLD ||
      Math.abs(current.phosphorus.value - previous.phosphorus.value) > CHANGE_THRESHOLD ||
      Math.abs(current.potassium.value - previous.potassium.value) > CHANGE_THRESHOLD ||
      current.humidity.time !== previous.humidity.time
    );
  }

  // Function to fetch device data
  const fetchDeviceData = async (silentRefresh = false) => {
    if (!deviceId) return
    
    try {
      // Only show loading on first load, not during auto-refresh
      if (!deviceInfo && !silentRefresh) {
        setIsLoading(true)
      }
      
      // Set refreshing state for visual indicator
      if (silentRefresh) {
        setIsRefreshing(true);
      }
      
      setError(null)
      
      // Check if user is admin and get device details
      let deviceDetails = null;
      if (!deviceInfo) {
        try {
          // Check if user is admin
          let userIsAdmin = false;
          if (typeof window !== 'undefined') {
            try {
              userIsAdmin = isAdmin();
              setIsAdminUser(userIsAdmin);
              console.log("Admin check result:", userIsAdmin);
              
              // Temporary debug: Check token content
              const token = localStorage.getItem('token');
              if (token) {
                try {
                  const decoded = JSON.parse(atob(token.split('.')[1]));
                  console.log("Token payload:", decoded);
                  console.log("User role in token:", decoded.role);
                } catch (e) {
                  console.log("Could not decode token for debugging");
                }
              }
              
              // Temporary admin bypass for testing (remove this in production)
              if (window.location.search.includes('admin=true')) {
                console.log("Admin mode forced via URL parameter");
                userIsAdmin = true;
                setIsAdminUser(true);
              }
            } catch (error) {
              console.error("Error checking admin status:", error);
            }
          }
          
          // Fetch devices based on user role
          let devices;
          if (userIsAdmin) {
            console.log("Admin user - fetching all devices");
            try {
              devices = await getAllDevicesForAdmin();
              console.log("Successfully fetched all devices for admin:", devices);
            } catch (adminError) {
              console.error("Admin endpoint failed, falling back to regular endpoint:", adminError);
              // Fallback to regular endpoint if admin endpoint fails
              devices = await getUserDevices();
            }
          } else {
            console.log("Regular user - fetching user devices");
            devices = await getUserDevices();
          }
          
          console.log("Device list for detail page:", devices);
          deviceDetails = devices.find(d => d.serial_number === deviceId);
          console.log(`Found device details for ${deviceId}:`, deviceDetails);
        } catch (err) {
          console.error("Error fetching device details:", err);
        }
      }
      
      // Update device info with proper typing
      if (deviceDetails) {
        setDeviceInfo({
          ...deviceDetails,
          status: "active", // or determine based on your logic
          name: deviceDetails.name || `Device ${deviceId}`,
          serial_number: deviceId
        });
      }
      
      // Fetch the latest reading for this device
      let latestReading;
      let transformedReading;
      let readingTime = new Date(0);
      let diffMins = Infinity;
      
      try {
        // Use admin endpoint if user is admin, otherwise use regular endpoint
        if (isAdminUser) {
          console.log("Admin user - using admin endpoint for latest device log");
          try {
            latestReading = await getLatestDeviceLogForAdmin(deviceId);
            console.log("Successfully fetched latest reading for admin:", latestReading);
          } catch (adminError) {
            console.error("Admin endpoint failed, falling back to regular endpoint:", adminError);
            // Fallback to regular endpoint if admin endpoint fails
            latestReading = await getLatestDeviceLog(deviceId);
          }
        } else {
          console.log("Regular user - using regular endpoint for latest device log");
          latestReading = await getLatestDeviceLog(deviceId);
        }
        transformedReading = transformSoilReading(latestReading)
        
        // Determine device status based on latest reading timestamp
        const now = new Date()
        // Use the correct timestamp field from the API response
        // The API response may have different field names than our interface
        const apiResponse = latestReading as any
        const timestampToUse = apiResponse.created_at || apiResponse.CreatedAt || transformedReading.created_at || transformedReading.timestamp || ''
        readingTime = new Date(timestampToUse)
        diffMins = Math.floor((now.getTime() - readingTime.getTime()) / 60000)
        
        console.log("Device status debug:", {
          deviceId,
          timestampToUse,
          readingTime: readingTime.toISOString(),
          now: now.toISOString(),
          diffMins,
          latestReading_created_at: apiResponse.created_at,
          latestReading_CreatedAt: apiResponse.CreatedAt
        })
      } catch (err) {
        console.log("No readings found for this device or device is inactive")
        // Create an empty reading object for inactive devices
        transformedReading = {
          device_id: parseInt(deviceId),
          created_at: new Date(0).toISOString(),
          timestamp: new Date(0).toISOString()
        }
      }
      
      // If reading is older than 30 minutes, mark as offline
      let status = "active"
      if (diffMins > 30) {
        status = "offline"
      }
      
      // Calculate alerts based on soil parameters (only if we have readings)
      const calculatedAlerts = latestReading && 
        (transformedReading.moisture !== undefined || 
         transformedReading.ph !== undefined || 
         transformedReading.ec !== undefined || 
         transformedReading.electrical_conductivity !== undefined) 
        ? calculateAlerts(transformedReading as SoilReading) 
        : [];
        
      // Only update alerts if they've changed - use deep comparison
      const alertsChanged = JSON.stringify(calculatedAlerts) !== JSON.stringify(deviceAlerts);
      if (alertsChanged) {
        // Use functional update to ensure we're working with the latest state
        setDeviceAlerts(prev => calculatedAlerts);
      }
      
      // Create readings object with default values of 0 for readings if not available
      const newReadings: ReadingsData = {
        humidity: { 
          value: transformedReading.humidity || transformedReading.soil_humidity || 0,
          time: latestReading ? formatDateTime(transformedReading.created_at || transformedReading.timestamp || '') : "No data"
        },
        ambientTemp: { 
          value: transformedReading.temperature || 0,
          time: latestReading ? formatDateTime(transformedReading.created_at || transformedReading.timestamp || '') : "No data"
        },
        moisture: { 
          value: transformedReading.moisture || transformedReading.soil_moisture || 0,
          time: latestReading ? formatDateTime(transformedReading.created_at || transformedReading.timestamp || '') : "No data"
        },
        temperature: { 
          value: transformedReading.soil_temperature || 0,
          time: latestReading ? formatDateTime(transformedReading.created_at || transformedReading.timestamp || '') : "No data"
        },
        ph: { 
          value: transformedReading.ph || 0,
          time: latestReading ? formatDateTime(transformedReading.created_at || transformedReading.timestamp || '') : "No data"
        },
        ec: { 
          value: transformedReading.ec || transformedReading.electrical_conductivity || 0,
          time: latestReading ? formatDateTime(transformedReading.created_at || transformedReading.timestamp || '') : "No data"
        },
        nitrogen: { 
          value: transformedReading.nitrogen || 0,
          time: latestReading ? formatDateTime(transformedReading.created_at || transformedReading.timestamp || '') : "No data"
        },
        phosphorus: { 
          value: transformedReading.phosphorus || transformedReading.phosphorous || 0,
          time: latestReading ? formatDateTime(transformedReading.created_at || transformedReading.timestamp || '') : "No data"
        },
        potassium: { 
          value: transformedReading.potassium || 0,
          time: latestReading ? formatDateTime(transformedReading.created_at || transformedReading.timestamp || '') : "No data"
        },
        // Use a more stable ID than timestamp for memo comparison to reduce unnecessary re-renders
        timestamp: readingTime.getTime()
      }
      
      // Get previous readings from the ref to avoid using state (which would cause re-renders)
      const prevReadings = prevReadingsRef.current;
      
      // Only update readings state if values have changed meaningfully
      // This prevents unnecessary re-renders
      if (!prevReadings || haveReadingsChanged(newReadings, prevReadings)) {
        // Use functional update to ensure atomic updates
        setReadings(current => {
          // If we have current readings, preserve the structure but update values
          if (current) {
            return {
              ...current,
              humidity: newReadings.humidity,
              ambientTemp: newReadings.ambientTemp,
              moisture: newReadings.moisture,
              temperature: newReadings.temperature,
              ph: newReadings.ph,
              ec: newReadings.ec,
              nitrogen: newReadings.nitrogen,
              phosphorus: newReadings.phosphorus,
              potassium: newReadings.potassium,
              timestamp: newReadings.timestamp
            };
          }
          // Otherwise use the new readings object
          return newReadings;
        });
        
        // Update the ref with the new value to use for the next comparison
        prevReadingsRef.current = newReadings;
      }
      
      // Update the last updated timestamp in ref (doesn't trigger re-render)
      lastUpdatedRef.current = new Date()
      
      if (isLoading) {
        setIsLoading(false)
      }
      
      // Reset refreshing state
      if (silentRefresh) {
        // Short delay to allow user to see refresh indicator
        setTimeout(() => setIsRefreshing(false), 300);
      }
    } catch (err) {
      console.error("Error fetching device data:", err)
      // Only set error if we don't have any existing data
      if (!readings) {
        setError("Failed to load device data. Please try again.")
      }
      if (isLoading) {
        setIsLoading(false)
      }
      if (silentRefresh) {
        setIsRefreshing(false);
      }
    }
  }
  
  // Initial data fetch on mount
  useEffect(() => {
    fetchDeviceData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])
  
  // Set up auto-refresh interval (every 30 seconds)
  useEffect(() => {
    // Track whether a fetch is in progress to prevent overlapping calls
    let isFetchingRef = false;
    
    // Use a separate function for auto-refresh
    const setupAutoRefresh = () => {
      // Clear any existing timer
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
      
      // Start a new timer with staggered fetching to avoid simultaneous updates
      const startAutoRefresh = () => {
        refreshTimerRef.current = setInterval(() => {
          // Skip if a fetch is already in progress
          if (isFetchingRef) return;
          
          // Use requestAnimationFrame to ensure smooth updates
          // This also helps prevent layout thrashing
          requestAnimationFrame(() => {
            isFetchingRef = true;
            
            // Use the silent refresh option to avoid showing loading state
            fetchDeviceData(true).finally(() => {
              isFetchingRef = false;
            });
          })
        }, 30000) // 30 seconds in milliseconds
      }
      
      // Slight delay before starting to ensure initial render is complete
      const timeoutId = setTimeout(() => {
        startAutoRefresh()
      }, 100)
      
      // Clean up function handles both the interval and the timeout
      return () => {
        clearTimeout(timeoutId)
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current)
          refreshTimerRef.current = null
        }
      }
    }
    
    // Call the setup function and store its cleanup
    const cleanup = setupAutoRefresh()
    
    // Return the cleanup function
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  // Calculate alerts based on soil parameters
  const calculateAlerts = (reading: SoilReading): DeviceAlertItem[] => {
    const alerts: DeviceAlertItem[] = []
    
    // Check soil moisture
    if (reading.moisture !== undefined && reading.moisture < 30) {
      alerts.push({
        type: "warning",
        message: `Low Soil Moisture (${reading.moisture}%)`,
        time: formatDateTime(reading.created_at || reading.timestamp || ''),
        icon: Droplets,
      })
    }
    
    // Check soil pH
    if (reading.ph !== undefined && (reading.ph < 5.5 || reading.ph > 7.5)) {
      alerts.push({
        type: "warning",
        message: `Soil pH Out of Range (${reading.ph})`,
        time: formatDateTime(reading.created_at || reading.timestamp || ''),
        icon: FlaskConical,
      })
    }
    
    // Check electrical conductivity (convert to µS/cm for thresholds)
    if ((reading.ec !== undefined || reading.electrical_conductivity !== undefined) && 
        ((reading.ec !== undefined && reading.ec * 1000 > 1200) || 
         (reading.electrical_conductivity !== undefined && reading.electrical_conductivity * 1000 > 1200))) {
      alerts.push({
        type: "warning",
        message: `High Electrical Conductivity (${((reading.ec || reading.electrical_conductivity) * 1000).toFixed(0)} µS/cm)`,
        time: formatDateTime(reading.created_at || reading.timestamp || ''),
        icon: Zap,
      })
    }
    
    // If no alerts and conditions are good, add a positive alert
    if (alerts.length === 0 && 
        reading.moisture !== undefined && reading.moisture >= 40 && reading.moisture <= 60 &&
        reading.ph !== undefined && reading.ph >= 6.0 && reading.ph <= 7.0) {
      alerts.push({
        type: "info",
        message: "Optimal Soil Conditions",
        time: formatDateTime(reading.created_at || reading.timestamp || ''),
        icon: CheckCircle,
      })
    }
    
    return alerts
  }

  // Memoize the ReadingsSection to only update when readings change
  // Using React.memo with explicit comparison to prevent unnecessary re-renders
  const MemoizedReadingsSection = useMemo(() => {
    if (!readings) return null;
    
    return <ReadingsGrid readings={readings} />;
  }, [readings?.timestamp]); // Only depend on the timestamp to re-render

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-4" />
        <p>Loading device data...</p>
                      </div>
    )
  }

  // Show error state
  if (error || !deviceInfo || !readings) {
    return (
                      <div>
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Device Details</h1>
                      </div>

        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Could not load device data. Device may not exist."}</AlertDescription>
        </Alert>
        
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => router.push('/dashboard/devices')}>
          Return to Devices
        </Button>
                    </div>
    )
  }

  // Add name editing functionality
  const handleEditName = () => {
    setNewName(deviceInfo?.name || "")
    setIsEditingName(true)
  }

  const handleSaveName = async () => {
    if (!deviceInfo?.serial_number) return

    try {
      const result = await updateDeviceName(deviceInfo.serial_number, newName)
      setDeviceInfo(prev => prev ? { ...prev, name: result.name } : null)
      setIsEditingName(false)
      
      toast({
        title: "Success",
        description: "Device name updated successfully",
      })
    } catch (err) {
      console.error("Error updating device name:", err)
      toast({
        title: "Error",
        description: "Failed to update device name",
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setIsEditingName(false)
    setNewName("")
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 bg-white min-h-screen">
      {/* Enhanced header with device info and status */}
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter device name"
                className="max-w-[200px]"
              />
              <Button onClick={handleSaveName} className="bg-green-600 hover:bg-green-700">
                Save
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{deviceInfo.name}</h1>
              {isAdminUser && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Admin Mode
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleEditName} className="h-8 w-8 p-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </Button>
            </div>
          )}
          <div className="flex items-center text-sm text-gray-500">
            <Badge 
              variant="status"
              className={cn(
                deviceInfo.status === "active" 
                  ? "bg-green-500" 
                  : "bg-red-500"
              )}
            >
              {deviceInfo.status === "active" ? "Active" : "Offline"}
            </Badge>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="bg-white hover:bg-gray-50 border-green-600 text-green-600 hover:text-green-700 flex items-center"
          onClick={() => router.push(`/dashboard/devices/${deviceId}/trends`)}
        >
          <LineChart className="h-4 w-4 mr-2" />
          Parameter Trends
        </Button>
      </div>

      {/* Readings section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Readings & Measurements</h2>
          {/* Refresh button and indicator */}
          <div className="flex items-center">
            {isRefreshing && (
              <span className="text-xs text-gray-500 mr-2 flex items-center">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Refreshing...
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchDeviceData(true)}
              disabled={isRefreshing}
              className="h-8 px-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>
        {MemoizedReadingsSection}
      </div>

      {/* Device Notifications section - moved to bottom */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Device Notifications</h2>
        <div className="bg-white shadow rounded-lg p-4">
          <NotificationCenter 
            deviceId={parseInt(deviceId) || 0} // Use numeric ID if possible 
            deviceName={deviceInfo?.name}
            serialNumber={deviceId} // Use deviceId as serial number since that's what we're using in the URL
            onNotificationUpdate={() => {
              // Optionally handle updates
            }}
          />
        </div>
      </div>
    </div>
  );
}
