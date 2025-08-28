"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, Download, FileText, Printer, FileSpreadsheet, CalendarIcon, Search, ChevronDown, X } from "lucide-react"
import { ReportPreview } from "@/src/components/reports/report-preview"
import { BasicReportPreview } from "@/components/reports/basic-report-preview"
import { CsvPreview } from "@/components/reports/csv-preview"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format as formatDate, subDays, subMonths } from "date-fns"
import { getUserDevices, registerDevice, claimDevice } from "@/lib/field-eyes-api"
import { generateReport, getDevice } from "@/lib/api"
import { transformDevices } from "@/lib/transformers"
import type { Device, ReportData, BasicSoilAnalysisReport } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export default function GenerateReportPage() {
  const router = useRouter()
  const [reportType, setReportType] = useState<"comprehensive" | "basic" | "crop">("comprehensive")
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 1))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [dateRange, setDateRange] = useState("30days")
  const [reportFormat, setReportFormat] = useState("pdf")
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [deviceSearch, setDeviceSearch] = useState("")

  // Fetch devices when component mounts
  useEffect(() => {
    const fetchDevicesData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        console.log("Fetching devices...")
        const data = await getUserDevices()
        console.log("Devices received:", data)
        
        // Transform devices using the helper function
        const transformedDevices = transformDevices(data)
        console.log("Transformed devices:", transformedDevices)
        
        // Convert to the expected Device type from @/types and ensure IDs are strings
        const typedDevices = transformedDevices
          .filter((device: any) => device && (device.id || device.serial_number))
          .map((device: any) => ({
            id: String(device.id || device.serial_number),
            name: device.name || `Field Sensor ${device.id || device.serial_number}`,
            status: device.status || "active",
            lat: device.lat || 0,
            lng: device.lng || 0,
            readings: device.readings || {}
          } as Device))
        
        setDevices(typedDevices)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching devices:", err)
        setError("Failed to load devices")
        setIsLoading(false)
      }
    }

    fetchDevicesData()
  }, [])

  // Update date range when preset is selected
  useEffect(() => {
    const now = new Date()

    switch (dateRange) {
      case "7days":
        setStartDate(subDays(now, 7))
        setEndDate(now)
        break
      case "30days":
        setStartDate(subDays(now, 30))
        setEndDate(now)
        break
      case "90days":
        setStartDate(subDays(now, 90))
        setEndDate(now)
        break
      case "6months":
        setStartDate(subMonths(now, 6))
        setEndDate(now)
        break
      case "1year":
        setStartDate(subMonths(now, 12))
        setEndDate(now)
        break
      case "custom":
        // Don't change dates for custom range
        break
    }
  }, [dateRange])

  const handleDeviceChange = (deviceId: string | number) => {
    // Convert to string for consistent comparison
    const idToToggle = String(deviceId);
    console.log("Selecting device:", idToToggle);
    
    setSelectedDevices(prev => {
      const isSelected = prev.includes(idToToggle);
      if (isSelected) {
        return prev.filter(id => id !== idToToggle);
      } else {
        return [...prev, idToToggle];
      }
    });
  };

  const handleGenerateReport = async () => {
    if (selectedDevices.length === 0) {
      setError("Please select at least one device")
      return
    }

    if (!startDate || !endDate) {
      setError("Please select a valid date range")
      return
    }

    // Validate date range
    const now = new Date()
    if (startDate > now || endDate > now) {
      setError("Date range cannot be in the future")
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Not authenticated. Please log in again.");
      }

      // Prepare options for report generation
      const options = {
        devices: selectedDevices,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeTreatment: true,
        includeSeasonalPlan: true,
        format: reportFormat,
      }

      let data;
      if (reportFormat === "csv") {
        // Generate CSV data
        console.log("Generating CSV report for device:", selectedDevices[0]);
        data = await generateReport(
          selectedDevices[0],
          "basic", // Use basic type for CSV
          dateRange,
          options
        );
        console.log("CSV data received:", data);
        
        // Convert the data to CSV format
        const csvData = convertDeviceLogsToCsv((data as BasicSoilAnalysisReport).parameters, (data as BasicSoilAnalysisReport).device_name);
        setCsvData(csvData);
      } else if (reportType === "basic") {
        console.log("Generating basic soil analysis report with params:", {
          serial_number: selectedDevices[0],
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });

        try {
          // Use the field-eyes-api utility function
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002/api'}/reports/basic-soil-analysis`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              serial_number: selectedDevices[0],
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
            }),
          });

          let errorData;
          if (!response.ok) {
            const errorText = await response.text();
            try {
              errorData = JSON.parse(errorText);
            } catch (e) {
              errorData = { message: errorText };
            }

            console.error("Report generation failed:", {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            });

            // Handle specific error cases
            if (errorData.message?.includes("no data available")) {
              throw new Error("No data available for the selected period. Please try a different date range.");
            } else if (errorData.message?.includes("device not found")) {
              throw new Error("Device not found. Please verify the device is properly registered.");
            } else {
              throw new Error(errorData.message || "Failed to generate report");
            }
          }
          
          data = await response.json();
          if (!data) {
            throw new Error("No report data received");
          }
          setReportData(data);
        } catch (error) {
          console.error("Error in basic report generation:", error);
          throw error; // Re-throw to be caught by outer catch block
        }
      } else {
        // Generate report using existing API for other report types
        data = await generateReport(
          selectedDevices[0],
          reportType,
          dateRange,
          options,
        );
        setReportData(data);
      }

      setShowPreview(true)
      setIsGenerating(false)
    } catch (err) {
      console.error("Error generating report:", err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to generate report. Please try again.")
      }
      setIsGenerating(false)
    }
  }

  const convertBasicReportToCsv = (data: any) => {
    // If data contains parameters array, it's a basic soil analysis report
    if (data.parameters && Array.isArray(data.parameters) && data.parameters[0]?.name) {
      // Header row for basic soil analysis
      const csvData = [
        ["Parameter", "Unit", "Ideal Min", "Ideal Max", "Average", "Min", "Max", "Rating", "CEC (if applicable)"]
      ];
      
      // Data rows for basic soil analysis
      data.parameters.forEach((param: any) => {
        csvData.push([
          param.name,
          param.unit,
          param.ideal_min,
          param.ideal_max,
          param.average,
          param.min,
          param.max,
          param.rating,
          param.cec || ""
        ]);
      });
      
      return csvData;
    }
    
    // If data contains parameters array with raw logs, it's a device logs export
    if (data.parameters && Array.isArray(data.parameters)) {
      const logs = data.parameters;
      if (logs.length === 0) {
        return [["No data available for the selected period"]];
      }
      
      // Get all possible fields from the logs
      const fields = new Set<string>();
      logs.forEach((log: any) => {
        Object.keys(log).forEach(key => {
          if (!key.startsWith('_') && typeof log[key] !== 'function') {
            fields.add(key);
          }
        });
      });
      
      // Create headers
      const headers = Array.from(fields).map(field => 
        field.split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      );
      
      // Create CSV data with headers
      const csvData = [headers];
      
      // Add data rows
      logs.forEach((log: any) => {
        const row = Array.from(fields).map(field => {
          const value = log[field];
          
          // Format dates
          if ((field === 'created_at' || field === 'timestamp') && value) {
            try {
              return new Date(value).toLocaleString();
            } catch (e) {
              return value;
            }
          }
          
          // Format numbers
          if (typeof value === 'number') {
            return value.toFixed(field === 'electrical_conductivity' ? 4 : 2);
          }
          
          return value !== undefined && value !== null ? value : '';
        });
        
        csvData.push(row);
      });
      
      return csvData;
    }
    
    return [["No data available"]];
  }

  const handleDownload = () => {
    if (!reportData && csvData.length === 0) return

    if (reportFormat === "pdf") {
      // In a real implementation, this would generate and download the PDF
      alert("PDF download would start here in a real implementation")
    } else {
      // Generate and download CSV
      const csvContent = generateCsv(csvData)
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)

      // Create filename based on device and date range
      const deviceName = devices.find((d) => String(d.id) === selectedDevices[0])?.name || "device"

      link.setAttribute(
        "download",
        `soil_data_${deviceName}_${startDate ? formatDate(startDate, "yyyy-MM-dd") : ""}_to_${
          endDate ? formatDate(endDate, "yyyy-MM-dd") : ""
        }.csv`,
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const generateCsv = (data: any[]) => {
    // Get headers from the first data object
    if (data.length === 0) return ""

    const headers = Object.keys(data[0])

    // Create CSV header row
    let csvContent = headers.join(",") + "\n"

    // Add data rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header]
        // Wrap values with commas in quotes
        return value && value.toString().includes(",") ? `"${value}"` : value
      })
      csvContent += values.join(",") + "\n"
    })

    return csvContent
  }

  // Filter devices based on search term
  const filteredDevices = devices.filter(device => 
    !deviceSearch || 
    (device.name && device.name.toLowerCase().includes(deviceSearch.toLowerCase())) ||
    String(device.id).includes(deviceSearch)
  )

  // New function to convert device logs to CSV format with all data fields
  const convertDeviceLogsToCsv = (logs: any[], deviceName: string) => {
    if (!logs || logs.length === 0) {
      return [["No data available for the selected device and date range"]];
    }
    
    console.log(`Converting ${logs.length} logs to CSV for device ${deviceName}`);
    
    // Fields to exclude from the CSV export
    const excludedFields = [
      'updated_at', 
      'deleted_at', 
      'device_id',
      'UpdatedAt',
      'DeletedAt',
      'DeviceId',
      'id',
      'ID',
      '_id'
    ];
    
    // Create a comprehensive set of all fields present in any log
    const allFields = new Set<string>();
    logs.forEach(log => {
      Object.keys(log).forEach(key => {
        // Skip internal fields, function fields, and excluded fields
        if (!key.startsWith('_') && 
            typeof log[key] !== 'function' && 
            !excludedFields.includes(key) &&
            !excludedFields.includes(key.toLowerCase())) {
          allFields.add(key);
        }
      });
    });
    
    // Prioritize important fields in a specific order
    const priorityFields = [
      'timestamp',               // Timestamp field
      'created_at',              // Created timestamp
      'CreatedAt',               // Created timestamp (alternative)
      'serial_number',           // Device ID
      'electrical_conductivity', // EC (primary field)
      'ElectricalConductivity',  // EC (uppercase field)
      'ec',                      // EC (alias)
      'soil_moisture',           // Soil moisture
      'moisture',                // Moisture alias
      'soil_temperature',        // Soil temperature
      'temperature',             // Air temperature
      'ph',                      // pH level
      'nitrogen',                // NPK - Nitrogen
      'phosphorous',             // NPK - Phosphorus
      'phosphorus',              // Phosphorus alias
      'potassium',               // NPK - Potassium
      'longitude',               // GPS coordinates
      'latitude',                // GPS coordinates
    ];
    
    // Filter out excluded fields and create ordered field list
    const filteredFields = Array.from(allFields).filter(field => 
      !excludedFields.includes(field) && 
      !excludedFields.includes(field.toLowerCase())
    );
    
    // Find timestamp field - prioritize 'timestamp', then 'created_at', then 'CreatedAt'
    let timestampField = null;
    if (filteredFields.includes('timestamp')) {
      timestampField = 'timestamp';
    } else if (filteredFields.includes('created_at')) {
      timestampField = 'created_at';
    } else if (filteredFields.includes('CreatedAt')) {
      timestampField = 'CreatedAt';
    }
    
    // Create ordered field list with timestamp first if available
    let orderedFields = [];
    
    // Add timestamp first if available
    if (timestampField) {
      orderedFields.push(timestampField);
    }
    
    // Add remaining fields in priority order
    orderedFields = [
      ...orderedFields,
      ...priorityFields.filter(field => 
        filteredFields.includes(field) && field !== timestampField
      ),
      ...filteredFields.filter(field => 
        !priorityFields.includes(field) && field !== timestampField
      )
    ];
    
    // Create header row with nicely formatted field names
    const headers = orderedFields.map(field => {
      // Format field names for readability (capitalize, replace underscores with spaces)
      return field
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    });
    
    // Create CSV data with header row first
    const csvData = [headers];
    
    // Add all log entries as rows
    logs.forEach(log => {
      const row = orderedFields.map(field => {
        const value = log[field];
        
        // Format dates
        if ((field === 'timestamp' || field === 'created_at' || field === 'CreatedAt') && value) {
          try {
            return new Date(value).toLocaleString();
          } catch (e) {
            return value;
          }
        }
        
        // Format numbers (except EC which should remain raw)
        if (typeof value === 'number') {
          // Keep EC values as raw numbers without formatting
          if (field === 'ec' || field === 'electrical_conductivity' || field === 'ElectricalConductivity') {
            return value.toString();
          }
          // Use 2 decimal places for other numerical values
          return value.toFixed(2);
        }
        
        // Return value or empty string if null/undefined
        return value !== undefined && value !== null ? value : '';
      });
      
      csvData.push(row);
    });
    
    console.log(`CSV report prepared with ${csvData.length} rows (including header)`);
    return csvData;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading devices...</div>
  }

  return (
    <div>
      {!showPreview ? (
        <>
          <div className="flex items-center mb-6">
            {/* <Button variant="ghost" onClick={() => router.back()} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button> */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Generate Report</h1>
              <p className="text-muted-foreground">Create a report based on your soil monitoring data</p>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>Customize the contents and scope of your report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">Select Device</Label>
                
                {isLoading ? (
                  <div className="flex items-center space-x-2 py-2">
                    <div className="animate-spin h-4 w-4 border-2 border-green-600 rounded-full border-t-transparent"></div>
                    <span className="text-sm">Loading devices...</span>
                  </div>
                ) : devices.length === 0 ? (
                  <div className="text-muted-foreground p-4 border rounded-md">No devices available</div>
                ) : (
                  <div className="space-y-4">
                    {/* Device selection dropdown */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between border-input"
                          disabled={devices.length === 0}
                        >
                          <span className="truncate">
                            {selectedDevices.length > 0 ? (
                              <span className="flex items-center gap-2">
                                {selectedDevices.length === 1 
                                  ? devices.find(d => String(d.id) === selectedDevices[0])?.name || `Device ${selectedDevices[0]}`
                                  : `${selectedDevices.length} devices selected`}
                              </span>
                            ) : (
                              "Click to select devices"
                            )}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <div className="p-2 border-b">
                          <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 opacity-50" />
                            <Input 
                              placeholder="Search devices..." 
                              className="h-8 border-0 focus-visible:ring-0"
                              value={deviceSearch}
                              onChange={(e) => setDeviceSearch(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="max-h-[300px] overflow-auto p-1">
                          {filteredDevices.length === 0 ? (
                            <div className="p-3 text-center text-sm text-muted-foreground">
                              No devices match your search. Try a different term.
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {filteredDevices
                                .filter(device => device && device.id) // Additional safety check
                                .map((device) => {
                                  const deviceId = String(device.id);
                                  const isSelected = selectedDevices.includes(deviceId);
                                  
                                  return (
                                    <div 
                                      key={deviceId} // Ensure key is always a string and defined
                                      className={`w-full text-left flex items-center p-2 rounded cursor-pointer hover:bg-muted ${
                                        isSelected ? 'bg-green-50 text-green-700 dark:bg-green-900/20' : ''
                                      }`}
                                      onClick={() => handleDeviceChange(deviceId)}
                                    >
                                      <div className="mr-2 flex-shrink-0 w-5 h-5 border rounded flex items-center justify-center
                                        border-green-600 text-green-700">
                                        {isSelected && (
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </div>
                                      <span className="truncate">{device.name || `Device ${deviceId}`}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground mt-2">
                  {isLoading ? "Retrieving your devices..." :
                   selectedDevices.length === 0
                    ? "Select a device to generate a report"
                    : `Report will focus on data from the selected devices`}
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Time Period</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="date-range">Preset Ranges</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger id="date-range">
                        <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7days">Last 7 days</SelectItem>
                        <SelectItem value="30days">Last 30 days</SelectItem>
                        <SelectItem value="90days">Last 90 days</SelectItem>
                        <SelectItem value="6months">Last 6 months</SelectItem>
                        <SelectItem value="1year">Last 12 months</SelectItem>
                        <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>

                  {dateRange === "custom" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !startDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? formatDate(startDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !endDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? formatDate(endDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {startDate && endDate
                    ? `Report will include data from ${formatDate(startDate, "MMMM d, yyyy")} to ${formatDate(
                        endDate,
                        "MMMM d, yyyy",
                      )}`
                    : "Select a date range for your report"}
                  </p>
                </div>

                <div className="space-y-2">
                <Label htmlFor="report-format" className="text-base font-medium">
                    Report Format
                  </Label>
                <RadioGroup value={reportFormat} onValueChange={setReportFormat} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pdf" id="pdf" />
                      <Label htmlFor="pdf" className="cursor-pointer">
                        PDF Report
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="csv" id="csv" />
                      <Label htmlFor="csv" className="cursor-pointer">
                        CSV Export
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                  {reportFormat === "pdf"
                    ? "PDF includes analysis and recommendations based on selected time period"
                    : "CSV includes all raw data for the selected devices and time period"}
                </p>
              </div>

              {reportFormat === "pdf" && (
                <>
                    <div className="space-y-2">
                      <Label htmlFor="report-type">Report Type</Label>
                      <RadioGroup
                        value={reportType}
                        onValueChange={(value: string) => {
                          if (value === "comprehensive" || value === "basic" || value === "crop") {
                            setReportType(value);
                          }
                        }}
                        className="flex flex-col space-y-4"
                      >
                        <div className="space-y-2 border rounded-md p-3 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="comprehensive" id="comprehensive" />
                            <Label htmlFor="comprehensive" className="cursor-pointer font-medium">Comprehensive Report</Label>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">
                            Complete soil health analysis with detailed soil parameters, crop recommendations, 
                            treatment suggestions, and a seasonal management plan based on your device data.
                          </p>
                        </div>
                        
                        <div className="space-y-2 border rounded-md p-3 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="basic" id="basic" />
                            <Label htmlFor="basic" className="cursor-pointer font-medium">Basic Soil Analysis</Label>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">
                            Essential soil parameters and ratings with visual indicators
                            of soil health status for the selected time period.
                          </p>
                        </div>
                        
                        <div className="space-y-2 border rounded-md p-3 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="crop" id="crop" />
                            <Label htmlFor="crop" className="cursor-pointer font-medium">Crop-Specific Report</Label>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">
                            Tailored analysis for specific crops with customized recommendations
                            based on the crop's unique requirements.
                          </p>
                        </div>
                      </RadioGroup>
                  </div>
                </>
              )}

              {reportFormat === "csv" && (
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium mb-2 flex items-center">
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    CSV Export Information
                  </h3>
                  <p className="text-sm mb-2">
                    The CSV export will include all data for the selected devices and time period:
                  </p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li>Timestamp for each reading</li>
                    <li>Device IDs and names</li>
                    <li>Soil moisture, temperature, and pH</li>
                    <li>NPK (Nitrogen, Phosphorus, Potassium) levels</li>
                    <li>Electrical conductivity</li>
                    <li>Ambient temperature and humidity</li>
                    <li>All other sensor readings</li>
                  </ul>
                  <p className="text-sm mt-2">
                    This raw data can be imported into spreadsheet software or data analysis tools for further
                    processing.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleGenerateReport}
                disabled={isGenerating || selectedDevices.length === 0}
              >
                {isGenerating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Generating...
                  </>
                ) : reportFormat === "pdf" ? (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate PDF Report
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Generate CSV Export
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6 print:hidden">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => setShowPreview(false)} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Configuration
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">
                {reportFormat === "pdf" ? "Report Preview" : "CSV Export Preview"}
              </h1>
            </div>
            <div className="flex gap-2">
              {reportFormat === "pdf" && (
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              )}
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download {reportFormat.toUpperCase()}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none print-content">
            {showPreview && (
              reportFormat === "pdf" ? (
                reportType === "basic" ? (
                  <BasicReportPreview reportData={reportData} type="basic" />
                ) : (
                  <ReportPreview 
                    reportData={reportData as any} 
                    includeTreatment={true}
                    includeSeasonalPlan={true}
                  />
                )
              ) : (
                <CsvPreview data={csvData} deviceName={devices.find(d => String(d.id) === selectedDevices[0])?.name || selectedDevices[0]} />
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}