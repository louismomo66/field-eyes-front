"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { getDeviceLogs, getLatestDeviceLog } from "@/lib/field-eyes-api"
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
  temperature: ["soil_temperature"],  // Soil temperature comes from soil_temperature field
  ambientTemp: ["temperature"],  // Air temperature comes from temperature field
  humidity: ["humidity", "soil_humidity"],
  ph: ["ph"],
  nitrogen: ["nitrogen"],
  phosphorus: ["phosphorus", "phosphorous"],
  potassium: ["potassium"],
  ec: ["ec", "electrical_conductivity", "EC"], // Add uppercase EC as possible field name
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
  
  // Log data for this parameter
  useEffect(() => {
    if (paramKey === 'ec') {
      console.log(`EC chart data (${data.length} points):`, 
        data.length > 0 ? data.slice(0, 5) : 'No data');
    }
  }, [paramKey, data]);
  
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
  
  // Prepare data formatting function based on parameter type
  const formatTooltipValue = (value: any) => {
    // For EC, show more decimal places since values can be very small
    if (paramKey === 'ec') {
      return `${Number(value).toFixed(4)} ${paramMeta.unit}`;
    }
    // For other parameters, use standard formatting
    return `${Number(value).toFixed(2)} ${paramMeta.unit}`;
  };
  
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
                margin={{ top: 5, right: 30, left: 20, bottom: 65 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 9 }} 
                  angle={-45} 
                  textAnchor="end"
                  height={65}
                  interval={data.length <= 50 ? 0 : Math.floor(data.length / 25)}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  domain={paramKey === 'ec' ? [0, 'auto'] : [paramMeta.min, paramMeta.max]}
                  allowDecimals={true}
                  tickCount={10}
                />
                <Tooltip 
                  formatter={(value) => [formatTooltipValue(value), paramMeta.name]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={paramMeta.color}
                  activeDot={{ r: 4 }}
                  name={`${paramMeta.name} ${paramMeta.unit}`}
                  strokeWidth={1.5}
                  dot={data.length < 30}
                  isAnimationActive={false}
                />
                {/* Add data point count indicator */}
                <text x="50%" y="15" textAnchor="middle" fill="#666" fontSize="10">
                  {data.length} data points
                </text>
              </RechartsLineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 65 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 9 }} 
                  angle={-45} 
                  textAnchor="end"
                  height={65}
                  interval={data.length <= 50 ? 0 : Math.floor(data.length / 25)}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  domain={paramKey === 'ec' ? [0, 'auto'] : [paramMeta.min, paramMeta.max]}
                  allowDecimals={true}
                  tickCount={10}
                />
                <Tooltip 
                  formatter={(value) => [formatTooltipValue(value), paramMeta.name]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend />
                <Bar
                  dataKey="value"
                  fill={paramMeta.color}
                  name={`${paramMeta.name} ${paramMeta.unit}`}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={20}
                  isAnimationActive={false}
                />
                {/* Add data point count indicator */}
                <text x="50%" y="15" textAnchor="middle" fill="#666" fontSize="10">
                  {data.length} data points
                </text>
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
  "all": "All Data",
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
  const [selectedPreset, setSelectedPreset] = useState<string>("all")
  const [allLogs, setAllLogs] = useState<any[]>([])

  // Debug function to help track EC data issues
  const debugEcData = () => {
    console.log("====== EC DATA DEBUG ======");
    
    // Check if EC is in available parameters
    console.log("EC in available parameters:", availableParams.includes('ec'));
    
    // Check EC data in deviceData
    const ecData = deviceData.ec || [];
    console.log("EC data in deviceData:", {
      count: ecData.length,
      hasZeros: ecData.some(item => item.value === 0),
      min: ecData.length ? Math.min(...ecData.map(item => item.value)) : 'N/A',
      max: ecData.length ? Math.max(...ecData.map(item => item.value)) : 'N/A',
      sample: ecData.slice(0, 3)
    });
    
    // Check EC data in filteredData
    const filteredEcData = filteredData.ec || [];
    console.log("EC data in filteredData:", {
      count: filteredEcData.length,
      hasZeros: filteredEcData.some(item => item.value === 0),
      min: filteredEcData.length ? Math.min(...filteredEcData.map(item => item.value)) : 'N/A', 
      max: filteredEcData.length ? Math.max(...filteredEcData.map(item => item.value)) : 'N/A',
      sample: filteredEcData.slice(0, 3)
    });
    
    console.log("========================");
  };

  // Run the debug function when data changes
  useEffect(() => {
    if (!isLoading && deviceData.ec) {
      debugEcData();
    }
  }, [deviceData, filteredData, isLoading]);

  // Handle date range preset changes
  const handleRangePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    
    if (preset === "custom") {
      // Don't change dates for custom preset
      return;
    }
    
    if (preset === "all") {
      // Set to null to remove date filtering
      setStartDate(undefined);
      setEndDate(undefined);
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

  // Format date for display in the chart - use compact format with seconds for maximum granularity
  const formatDate = (timestamp: string): string => {
    if (!timestamp) return "";
    
    try {
      const date = new Date(timestamp);
      const formatted = format(date, "MM/dd HH:mm:ss"); // Ultra compact format with seconds for maximum granularity
      
      // Log a few of the date conversions (randomly ~5% to avoid flooding console)
      if (Math.random() < 0.05) {
        console.log(`Date formatting - Raw: "${timestamp}", Parsed: ${date.toISOString()}, Formatted for display: "${formatted}"`);
      }
      
      return formatted;
    } catch (e) {
      console.error(`Error formatting date: ${timestamp}`, e);
      return "";
    }
  }

  // Set initial date range on first load
  useEffect(() => {
    if (selectedPreset && selectedPreset !== "custom") {
      handleRangePresetChange("all"); // Show all data by default
    }
  }, []);

  // Filter data based on selected date range
  useEffect(() => {
    if (!deviceData || Object.keys(deviceData).length === 0) return;
    
    const newFilteredData: Record<string, Array<{name: string; value: number}>> = {};
    
    // Apply date filters to each parameter dataset
    Object.keys(deviceData).forEach(param => {
      // Get a copy of the data and ensure it's sorted by date (oldest to newest)
      let paramData = [...deviceData[param]].sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return a.timestamp.getTime() - b.timestamp.getTime();
        }
        return 0;
      });
      
      // Filter the data based on the date range
      newFilteredData[param] = paramData
        .filter(item => {
          if (!startDate && !endDate) return true; // No filter
          
          const itemDate = item.timestamp;
          if (!itemDate) return true;
          
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
        console.log(`Fetching device logs for device ID: ${deviceId}`);
        const logs = await getDeviceLogs(deviceId);
        
        if (!logs || logs.length === 0) {
          console.error("No logs returned from API");
          setError("No data available for this device");
          setIsLoading(false);
          return;
        }

        console.log(`Successfully fetched ${logs.length} logs for device ${deviceId}`);
        
        // Debug EC values in raw API response
        const ecSummary = logs.reduce((acc: any, log, idx) => {
          // Only log details for the first 5 and last 5 logs
          const shouldLogDetails = idx < 5 || idx >= logs.length - 5;
          
          // Extract EC values from log
          const ecValue = log.ec !== undefined ? log.ec : null;
          const elecCondValue = log.electrical_conductivity !== undefined ? log.electrical_conductivity : null;
          
          // Track non-null values
          if (ecValue !== null) acc.ecCount++;
          if (elecCondValue !== null) acc.elecCondCount++;
          
          // Track non-zero values
          if (ecValue !== null && ecValue !== 0) acc.nonZeroEcCount++;
          if (elecCondValue !== null && elecCondValue !== 0) acc.nonZeroElecCondCount++;
          
          // Log details for selected logs
          if (shouldLogDetails) {
            acc.samples.push({
              index: idx,
              id: log.id,
              timestamp: log.created_at || log.timestamp,
              ec: ecValue,
              electrical_conductivity: elecCondValue,
              raw: JSON.stringify(log).substring(0, 100) + "..." // Truncate to avoid huge logs
            });
          }
          
          return acc;
        }, { 
          ecCount: 0, 
          elecCondCount: 0,
          nonZeroEcCount: 0,
          nonZeroElecCondCount: 0,
          samples: [] as any[]
        });
        
        console.log("EC DATA IN RAW API RESPONSE:", ecSummary);
        console.log(`EC values found: ${ecSummary.ecCount} logs with 'ec' (${ecSummary.nonZeroEcCount} non-zero), ${ecSummary.elecCondCount} logs with 'electrical_conductivity' (${ecSummary.nonZeroElecCondCount} non-zero)`);
        
        // If we're missing EC data, try to fetch recent logs directly
        if (ecSummary.ecCount === 0 && ecSummary.elecCondCount === 0) {
          console.warn("No EC data found in device logs, attempting to fetch latest log directly");
          
          try {
            const latestLog = await getLatestDeviceLog(deviceId);
            console.log("Latest log retrieved directly:", latestLog);
            
            // Check if it has EC data
            const hasEcData = latestLog && (
              latestLog.ec !== undefined || 
              latestLog.electrical_conductivity !== undefined
            );
            
            if (hasEcData) {
              console.log("Latest log contains EC data, adding to logs array");
              logs.unshift(latestLog); // Add to beginning of array
            }
          } catch (latestErr) {
            console.error("Failed to fetch latest device log:", latestErr);
          }
        }

        // Store all logs for filtering later
        setAllLogs(logs);
        
        // Debug: Log the actual timestamps from the database
        console.log("RAW TIMESTAMP DATA FROM DATABASE:");
        console.log("Total logs:", logs.length);
        console.log("First 10 timestamps:");
        logs.slice(0, 10).forEach((log, idx) => {
          console.log(`Log #${idx+1} - Raw timestamp: "${log.created_at || log.timestamp}", Type: ${typeof (log.created_at || log.timestamp)}`);
        });
        
        // Check for time intervals between readings
        if (logs.length >= 2) {
          console.log("ANALYZING TIME INTERVALS BETWEEN READINGS:");
          const sortedLogs = [...logs].sort((a, b) => {
            const dateA = new Date(a.created_at || a.timestamp || '');
            const dateB = new Date(b.created_at || b.timestamp || '');
            return dateA.getTime() - dateB.getTime();
          });
          
          const intervals = [];
          for (let i = 1; i < Math.min(sortedLogs.length, 10); i++) {
            const prevTime = new Date(sortedLogs[i-1].created_at || sortedLogs[i-1].timestamp || '');
            const currTime = new Date(sortedLogs[i].created_at || sortedLogs[i].timestamp || '');
            const diffMs = currTime.getTime() - prevTime.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            intervals.push({
              from: prevTime.toISOString(),
              to: currTime.toISOString(),
              diffMinutes: diffMinutes.toFixed(2)
            });
          }
          console.log("Time intervals between consecutive readings (minutes):", intervals);
        }
        
        // Debug: Directly examine the raw logs for EC values
        console.log("RAW LOGS DATA STRUCTURE:", logs.length > 0 ? logs[0] : "No logs");
        const ecValuesInRawLogs = logs.map(log => ({
          id: log.id,
          ec: log.ec,
          electrical_conductivity: log.electrical_conductivity
        }));
        console.log("FIRST 5 RAW EC VALUES:", ecValuesInRawLogs.slice(0, 5));
        
        // Transform logs for analysis
        console.log(`Found ${logs.length} device logs for device ${deviceId}`);
        
        // Check for EC data in raw logs
        const hasEcInRawData = logs.some(log => 
          log.electrical_conductivity !== undefined || log.ec !== undefined
        );
        console.log("Raw logs include EC data:", hasEcInRawData);
        
        const transformedLogs = logs.map(log => transformSoilReading(log));
        
        // Check for EC data in transformed logs
        const hasEcInTransformedData = transformedLogs.some(log => 
          log.electrical_conductivity !== undefined || log.ec !== undefined
        );
        console.log("Transformed logs include EC data:", hasEcInTransformedData);
        
        // Sort logs by date (oldest to newest) to ensure consistent date ordering on charts
        transformedLogs.sort((a, b) => {
          const dateA = new Date(a.created_at || a.timestamp || '');
          const dateB = new Date(b.created_at || b.timestamp || '');
          return dateA.getTime() - dateB.getTime();
        });
        
        // Log the parameters we're looking for
        console.log("Checking for parameters:", Object.keys(parameterMeta));
        
        // Process the logs to identify available parameters and generate chart data
        const transformedData: Record<string, Array<{name: string; value: number; timestamp: Date}>> = {};
        const availableParamsList: string[] = [];
        
        // Check all parameters for availability
        Object.keys(parameterMeta).forEach(param => {
          // Check if any log has this parameter
          const hasParam = transformedLogs.some(log => hasParameterValue(log, param));
          
          if (hasParam) {
            // Add to available parameters list
            if (!availableParamsList.includes(param)) {
              availableParamsList.push(param);
            }
            
            // Create dataset for this parameter
            transformedData[param] = transformedLogs.map((log) => {
              const timestamp = log.created_at || log.timestamp || '';
              const dateObj = new Date(timestamp);
              const value = getParameterValue(log, param);
              
              // Debug log EC values only (but not every single one)
              if (param === 'ec' && Math.random() < 0.1) { // log ~10% of entries to avoid console spam
                console.log("EC value sample:", {
                  timestamp: formatDate(timestamp),
                  ec: log.ec,
                  electrical_conductivity: log.electrical_conductivity,
                  calculatedValue: value,
                  rawLog: log
                });
              }
              
              return {
                name: formatDate(timestamp),
                value: value,
                timestamp: dateObj
              };
            });
          }
        });
        
        console.log("Available parameters after processing:", availableParamsList);
        console.log("EC data points:", transformedData['ec']?.length || 0);
        
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

  // Log changes to date range for debugging
  useEffect(() => {
    console.log("Date range changed:", {
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : "none",
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : "none",
      selectedPreset
    });
  }, [startDate, endDate, selectedPreset]);

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
      {startDate && endDate ? (
        <div className="mb-6 text-sm text-right text-muted-foreground">
          Showing data from {format(startDate, "MMMM d, yyyy")} to {format(endDate, "MMMM d, yyyy")}
        </div>
      ) : (
        <div className="mb-6 text-sm text-right font-medium text-green-600">
          Showing all historical data ({allLogs.length} readings)
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
          {/* Parameter charts including EC */}
          {Object.keys(parameterMeta).map((paramKey) => {
            // Only show parameters that have data
            const hasData = availableParams.includes(paramKey);
            
            // Check if there's filtered data for this parameter
            let paramData: Array<{name: string; value: number}> = [];
            if (hasData && filteredData[paramKey]) {
              paramData = filteredData[paramKey].filter(item => item.value !== undefined);
            }
            
            // Check if we have data after filtering
            const hasFilteredData = paramData.length > 0;
            
            return (
              <ParameterChart 
                key={paramKey} 
                paramKey={paramKey} 
                paramMeta={parameterMeta[paramKey]} 
                data={paramData}
                noData={!hasData || !hasFilteredData}
              />
            );
          })}
        </div>
      )}
    </div>
  )
}
