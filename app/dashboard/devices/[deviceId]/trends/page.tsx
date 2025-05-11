"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, BarChart3, LineChart, AlertCircle, Loader2, CalendarIcon } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import { getDeviceLogs } from "@/lib/field-eyes-api"
import { transformSoilReading } from "@/lib/transformers"
import { SoilReading } from "@/types/field-eyes"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, addDays } from "date-fns"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Interface for parameter metadata
interface ParamMeta {
  name: string;
  color: string;
  unit: string;
  min: number;
  max: number;
}

// Define parameter metadata with typing
const parameterMeta: Record<string, ParamMeta> = {
  moisture: { name: "Soil Moisture", color: "#3b82f6", unit: "%", min: 0, max: 100 },
  temperature: { name: "Soil Temperature", color: "#ef4444", unit: "°C", min: 0, max: 40 },
  ambientTemp: { name: "Air Temperature", color: "#f97316", unit: "°C", min: 0, max: 40 },
  humidity: { name: "Air Humidity", color: "#0ea5e9", unit: "%", min: 0, max: 100 },
  ph: { name: "Soil pH", color: "#8b5cf6", unit: "", min: 0, max: 14 },
  nitrogen: { name: "Nitrogen (N)", color: "#22c55e", unit: "mg/kg", min: 0, max: 50 },
  phosphorus: { name: "Phosphorus (P)", color: "#f97316", unit: "mg/kg", min: 0, max: 30 },
  potassium: { name: "Potassium (K)", color: "#eab308", unit: "mg/kg", min: 0, max: 30 },
  ec: { name: "Electrical Conductivity", color: "#06b6d4", unit: "mS/cm", min: 0, max: 4 },
}

// Parameter data mapping - handles different property names in the API
const parameterMapping: Record<string, string[]> = {
  moisture: ["moisture", "soil_moisture"],
  temperature: ["soil_temperature"],
  ambientTemp: ["temperature"],  // API uses 'temperature' for ambient
  humidity: ["humidity", "soil_humidity"],
  ph: ["ph"],
  nitrogen: ["nitrogen"],
  phosphorus: ["phosphorus", "phosphorous"],
  potassium: ["potassium"],
  ec: ["ec", "electrical_conductivity"],
}

// Individual parameter chart component
interface ParameterChartProps {
  paramKey: string;
  paramMeta: ParamMeta;
  data: Array<{name: string; value: number}>;
  noData: boolean;
}

function ParameterChart({ paramKey, paramMeta, data, noData = false }: ParameterChartProps) {
  const [chartType, setChartType] = useState("line")
  
  if (noData) {
  return (
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{paramMeta.name}</CardTitle>
          </div>
      </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
            <div className="flex flex-col items-center">
              <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
              <p>No data available for this parameter</p>
                </div>
              </div>
      </CardContent>
    </Card>
    )
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{paramMeta.name}</CardTitle>
          <Tabs value={chartType} onValueChange={setChartType} className="ml-auto">
            <TabsList className="grid w-[180px] grid-cols-2 h-8">
              <TabsTrigger value="line" className="flex items-center">
                <LineChart className="h-3.5 w-3.5 mr-2" />
                Line
              </TabsTrigger>
              <TabsTrigger value="bar" className="flex items-center">
                <BarChart3 className="h-3.5 w-3.5 mr-2" />
                Bar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          {chartType === "line" ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[paramMeta.min, paramMeta.max]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={paramMeta.color}
                  activeDot={{ r: 6 }}
                  name={`${paramMeta.name} ${paramMeta.unit}`}
                  strokeWidth={2}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[paramMeta.min, paramMeta.max]} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="value"
                  fill={paramMeta.color}
                  name={`${paramMeta.name} ${paramMeta.unit}`}
                  radius={[4, 4, 0, 0]}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          )}
              </div>
      </CardContent>
    </Card>
  )
}

// Date range presets
const dateRangePresets = {
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "custom": "Custom range"
};

// Simplified Date Picker component
interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onRangePresetChange: (preset: string) => void;
  selectedPreset: string;
}

function CompactDateRangePicker({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  onRangePresetChange,
  selectedPreset
}: DateRangePickerProps) {
    return (
    <div className="flex items-center space-x-2">
      <Select 
        value={selectedPreset} 
        onValueChange={onRangePresetChange}
      >
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(dateRangePresets).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedPreset === "custom" && (
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-[130px] h-9 justify-start text-left font-normal"
                size="sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "MMM d") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={onStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-sm text-gray-500">to</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-[130px] h-9 justify-start text-left font-normal"
                size="sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "MMM d") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={onEndDateChange}
                initialFocus
                disabled={(date) => startDate ? date < startDate : false}
              />
            </PopoverContent>
          </Popover>
                </div>
      )}
      
      {selectedPreset !== "custom" && (
        <Button
          onClick={() => onRangePresetChange("custom")}
          variant="ghost"
          size="sm"
          className="h-9"
        >
          Customize
        </Button>
      )}
        </div>
  );
}

export default function DeviceTrendsPage() {
  const params = useParams()
  const router = useRouter()
  const deviceId = params.deviceId as string
  const [deviceData, setDeviceData] = useState<Record<string, Array<{name: string; value: number; timestamp: Date}>>>({})
  const [filteredData, setFilteredData] = useState<Record<string, Array<{name: string; value: number}>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableParams, setAvailableParams] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [selectedPreset, setSelectedPreset] = useState<string>("30d")
  const [allLogs, setAllLogs] = useState<any[]>([])

  // Handle date range preset changes
  const handleRangePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    
    if (preset === "custom") {
      // Don't change dates for custom preset
      return;
    }
    
    const today = new Date();
    let start: Date | undefined = undefined;
    
    switch (preset) {
      case "7d":
        start = addDays(today, -7);
        break;
      case "14d":
        start = addDays(today, -14);
        break;
      case "30d":
        start = addDays(today, -30);
        break;
      case "90d":
        start = addDays(today, -90);
        break;
    }
    
    setStartDate(start);
    setEndDate(today);
  };

  // Helper function to check if a parameter exists in device data
  const hasParameterValue = (reading: SoilReading, paramKey: string): boolean => {
    if (!reading) return false;
    
    // Check all possible field names for this parameter
    const possibleFields = parameterMapping[paramKey] || [paramKey];
    
    for (const field of possibleFields) {
      // Need to use type assertion since we're dynamically accessing properties
      const value = reading[field as keyof SoilReading];
      if (value !== undefined && value !== null) {
        return true;
      }
    }
    
    return false;
  }
  
  // Helper function to get parameter value from reading
  const getParameterValue = (reading: SoilReading, paramKey: string): number => {
    if (!reading) return 0;
    
    // Check all possible field names for this parameter
    const possibleFields = parameterMapping[paramKey] || [paramKey];
    
    for (const field of possibleFields) {
      // Need to use type assertion since we're dynamically accessing properties
      const value = reading[field as keyof SoilReading];
      if (value !== undefined && value !== null) {
        return Number(value);
      }
    }
    
    return 0;
  }

  // Format date for display in the chart
  const formatDate = (timestamp: string): string => {
    if (!timestamp) return "";
    
    try {
      const date = new Date(timestamp);
      return format(date, "MMM d");
    } catch (e) {
      return "";
    }
  }

  // Set initial date range on first load
  useEffect(() => {
    if (selectedPreset && selectedPreset !== "custom") {
      handleRangePresetChange(selectedPreset);
    }
  }, []);

  // Filter data based on selected date range
  useEffect(() => {
    if (!deviceData || Object.keys(deviceData).length === 0) return;
    
    const newFilteredData: Record<string, Array<{name: string; value: number}>> = {};
    
    // Apply date filters to each parameter dataset
    Object.keys(deviceData).forEach(param => {
      // Filter the data based on the date range
      newFilteredData[param] = deviceData[param]
        .filter(item => {
          if (!startDate && !endDate) return true; // No filter
          
          const itemDate = new Date(item.timestamp);
          
          // Check start date
          if (startDate && itemDate < startDate) return false;
          
          // Check end date
          if (endDate) {
            // Set time to end of day for end date comparison
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (itemDate > endOfDay) return false;
          }
          
          return true;
        })
        .map(({ name, value }) => ({ name, value }));
    });
    
    setFilteredData(newFilteredData);
  }, [deviceData, startDate, endDate]);

  // Fetch actual device data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch device logs
        const logs = await getDeviceLogs(deviceId);
        if (!logs || logs.length === 0) {
          setError("No data available for this device");
          setIsLoading(false);
          return;
        }

        // Store all logs for filtering later
        setAllLogs(logs);
        
        // Process the logs to identify available parameters and generate chart data
        const transformedData: Record<string, Array<{name: string; value: number; timestamp: Date}>> = {};
        const availableParamsList: string[] = [];
        
        // Transform logs for analysis
        const transformedLogs = logs.map(log => transformSoilReading(log));
        
        // Sort logs by date (oldest to newest)
        transformedLogs.sort((a, b) => {
          const dateA = new Date(a.created_at || a.timestamp || '');
          const dateB = new Date(b.created_at || b.timestamp || '');
          return dateA.getTime() - dateB.getTime();
        });
        
        // Check all parameters for availability
        Object.keys(parameterMeta).forEach(param => {
          // Check if any log has this parameter
          const hasParam = transformedLogs.some(log => hasParameterValue(log, param));
          
          if (hasParam) {
            // Add to available parameters list
            availableParamsList.push(param);
            
            // Create dataset for this parameter
            transformedData[param] = transformedLogs.map((log) => {
              const timestamp = log.created_at || log.timestamp || '';
              const dateObj = new Date(timestamp);
              return {
                name: formatDate(timestamp),
                value: getParameterValue(log, param),
                timestamp: dateObj
              };
            });
          }
        });
        
        // Handle the case where temperature is used for both ambient and soil
        // If there's only one temperature reading, determine if it's ambient or soil
        if (availableParamsList.includes('temperature') && 
            !availableParamsList.includes('ambientTemp')) {
          // Clone temperature data for ambient temperature
          transformedData['ambientTemp'] = [...transformedData['temperature']];
          availableParamsList.push('ambientTemp');
        }
        
        setDeviceData(transformedData);
        setFilteredData(transformedData);  // Initialize filtered data with all data
        setAvailableParams(availableParamsList);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching device data:", err);
        setError(typeof err === 'object' && err !== null && 'message' in err 
          ? String(err.message) 
          : "Failed to load device data");
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [deviceId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 bg-white min-h-screen">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Device
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Parameter Trends</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
          <p>Loading trend data...</p>
        </div>
                      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 bg-white min-h-screen">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Device
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Parameter Trends</h1>
          </div>
                      </div>

        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button onClick={() => router.back()}>Return to Device Dashboard</Button>
                    </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 bg-white min-h-screen">
      {/* Header with back button and date range picker */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div className="flex items-center">
        <Button variant="outline" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Device
        </Button>
          <h1 className="text-2xl font-bold">Parameter Trends</h1>
          </div>
        
        {/* Compact date range picker in top right */}
        <div className="mt-4 md:mt-0">
          <CompactDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onRangePresetChange={handleRangePresetChange}
            selectedPreset={selectedPreset}
          />
    </div>
      </div>

      {/* Small indicator of current date range */}
      {startDate && endDate && (
        <div className="mb-6 text-sm text-right text-muted-foreground">
          Showing data from {format(startDate, "MMMM d, yyyy")} to {format(endDate, "MMMM d, yyyy")}
      </div>
      )}

      {/* Check if any parameters are available */}
      {availableParams.length === 0 ? (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No parameter data available for this device</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {Object.keys(parameterMeta).map((paramKey) => {
            // Only show parameters that have data
            const hasData = availableParams.includes(paramKey);
            const paramData = hasData && filteredData[paramKey] && filteredData[paramKey].length > 0
              ? filteredData[paramKey]
              : [];
            
            // If we're filtering and there's no data in the range, show "no data" message
            const noDataInRange = hasData && paramData.length === 0;
            
            return (
              <ParameterChart 
                key={paramKey} 
                paramKey={paramKey} 
                paramMeta={parameterMeta[paramKey]} 
                data={paramData}
                noData={!hasData || noDataInRange}
              />
            );
          })}
        </div>
      )}
    </div>
  )
}
