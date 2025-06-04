import type { Device, FieldBoundary, Report, ReportData, Notification, User, Farm, BasicSoilAnalysisReport } from "@/types"
import type { SoilReading } from "@/types/field-eyes"
import { getToken } from "@/lib/auth"

// Base API URL - use the same URL as field-eyes-api
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002/api"

// Helper function for API requests
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const token = getToken()
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
        ...(options?.headers || {})
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error)
    throw error
  }
}

// Device API functions
export async function getDevices(): Promise<Device[]> {
  return fetchAPI<Device[]>("/user-devices")
}

export async function getDevice(id: string): Promise<Device> {
  // Get all devices
  const devices = await getDevices();
  
  // Try to find a matching device
  const device = devices.find(d => 
    // Match by serial number
    d.serial_number === id || 
    // Match by ID (string comparison)
    String(d.id) === id
  );
  
  if (!device) {
    throw new Error(`Device with ID or serial number ${id} not found`);
  }
  
  return device;
}

export async function createDevice(device: Omit<Device, "id">): Promise<Device> {
  return fetchAPI<Device>("/devices", {
    method: "POST",
    body: JSON.stringify(device),
  })
}

export async function updateDevice(id: string, device: Partial<Device>): Promise<Device> {
  return fetchAPI<Device>(`/devices/${id}`, {
    method: "PUT",
    body: JSON.stringify(device),
  })
}

export async function deleteDevice(id: string): Promise<void> {
  return fetchAPI<void>(`/devices/${id}`, {
    method: "DELETE",
  })
}

// Field Boundary API functions
export async function getFieldBoundaries(): Promise<FieldBoundary[]> {
  return fetchAPI<FieldBoundary[]>("/field-boundaries")
}

// Soil Readings API functions
export async function getSoilReadings(deviceId?: string): Promise<SoilReading[]> {
  const endpoint = deviceId ? `/get-device-logs?serial_number=${deviceId}` : "/get-device-logs"
  return fetchAPI<SoilReading[]>(endpoint)
}

// Reports API functions
export async function getReports(): Promise<Report[]> {
  return fetchAPI<Report[]>("/reports")
}

export async function generateReport(
  deviceId: string,
  reportType: string,
  timeRange: string,
  options: any,
): Promise<ReportData> {
  try {
    // Get device logs for CSV format
    if (options.format === "csv") {
      console.log("Fetching device logs for CSV export:", deviceId, options.startDate, options.endDate);
      const queryParams = new URLSearchParams({
        serial_number: deviceId,
        start_date: options.startDate,
        end_date: options.endDate
      }).toString();
      
      const logs = await fetchAPI<any[]>(`/get-device-logs?${queryParams}`);
      
      console.log("Received logs for CSV:", logs);
      return {
        device_name: deviceId,
        parameters: logs,
        generated_at: new Date().toISOString(),
        start_date: options.startDate,
        end_date: options.endDate,
        // Add required fields from BasicSoilAnalysisReport
        date: new Date().toLocaleDateString(),
        deviceName: deviceId,
        deviceId: deviceId,
        farmName: "Your Farm"
      } as BasicSoilAnalysisReport;
    }

    // Get basic soil analysis data for PDF reports
    const basicAnalysisData = await fetchAPI<ReportData>("/reports/basic-soil-analysis", {
      method: "POST",
      body: JSON.stringify({
        serial_number: deviceId,
        start_date: options.startDate,
        end_date: options.endDate,
      }),
    });

    // For basic report, return the data as is
    if (reportType === "basic") {
      return basicAnalysisData;
    }

    // For comprehensive report, transform the basic data
    if (reportType === "comprehensive") {
      return transformToComprehensiveReport(basicAnalysisData);
    }
    
    // For other report types, use the existing API
    return fetchAPI<ReportData>("/reports/generate", {
      method: "POST",
      body: JSON.stringify({
        serial_number: deviceId,
        type: reportType,
        time_range: timeRange,
        ...options,
      }),
    });
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
}

// Helper function to transform basic soil analysis and crop data into a comprehensive report
function transformToComprehensiveReport(basicData: any): ReportData {
  // Get current date in readable format
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Transform basic soil parameters to soil indicators format
  const soilIndicators = basicData.parameters.map((param: any) => ({
    name: param.name,
    value: `${param.average.toFixed(2)} ${param.unit}`,
    rating: param.rating,
    ideal: `${param.ideal_min} - ${param.ideal_max} ${param.unit}`,
    explanation: getParameterExplanation(param.name, param.rating)
  }));
  
  // Generate key findings based on parameters
  const keyFindings = basicData.parameters
    .filter((param: any) => 
      param.rating !== "Optimum" && 
      ["pH", "Nitrogen", "Phosphorous", "Potassium", "Electrical Conductivity"].includes(param.name))
    .map((param: any) => getKeyFinding(param.name, param.rating, param.average));
  
  // Add a general soil health finding if we have pH and NPK data
  const hasSoilHealthData = basicData.parameters.some((p: any) => p.name === "pH") && 
                          basicData.parameters.some((p: any) => p.name === "Nitrogen");
                          
  if (hasSoilHealthData) {
    keyFindings.unshift(`Overall soil health assessment indicates ${getOverallRating(basicData.parameters)} conditions.`);
  }
  
  // Generate crop recommendations based on soil parameters
  const cropRecommendations = generateDefaultCropRecommendations(basicData.parameters);
  
  // Generate treatment recommendations based on soil parameters
  const treatmentRecommendations = generateTreatmentRecommendations(basicData.parameters);
  
  // Compile the comprehensive report
  return {
    date: currentDate,
    farmName: "Your Farm",
    deviceName: basicData.device_name,
    deviceId: basicData.serial_number || "",
    overallHealth: getOverallRating(basicData.parameters),
    keyFindings,
    soilIndicators,
    cropRecommendations,
    treatmentRecommendations,
    seasonalPlan: [] // Return empty array instead of generating seasonal plan
  };
}

// Helper functions for generating report components

function getParameterExplanation(name: string, rating: string): string {
  const explanations: Record<string, Record<string, string>> = {
    "pH": {
      "Very Low": "Soil is highly acidic, which can severely limit nutrient availability and inhibit plant growth.",
      "Low": "Acidic soil conditions may restrict the availability of important nutrients like phosphorus and calcium.",
      "Optimum": "Ideal pH range for most crops, supporting good nutrient availability and microbial activity.",
      "High": "Alkaline conditions may reduce the availability of micronutrients such as iron and zinc.",
      "Very High": "Highly alkaline soil can cause severe micronutrient deficiencies and impact overall soil health."
    },
    "Nitrogen": {
      "Very Low": "Severe nitrogen deficiency will result in stunted growth and yellowing of leaves.",
      "Low": "Insufficient nitrogen for optimal growth; plants may show slower growth and lighter green foliage.",
      "Optimum": "Adequate nitrogen levels to support healthy plant growth and development.",
      "High": "Excessive nitrogen that may cause overgrowth of foliage at the expense of flowering and fruiting.",
      "Very High": "Potentially harmful levels that may burn plants and leach into groundwater."
    },
    "Phosphorous": {
      "Very Low": "Severe phosphorus deficiency will inhibit root development and overall plant growth.",
      "Low": "Limited phosphorus availability may result in poor flowering and fruiting.",
      "Optimum": "Ideal phosphorus levels for supporting energy transfer, root development, and fruiting.",
      "High": "Elevated phosphorus levels that may interfere with the uptake of other nutrients.",
      "Very High": "Excessive phosphorus that may contaminate water sources and disrupt soil ecology."
    },
    "Potassium": {
      "Very Low": "Severe potassium deficiency will result in weak stems and increased susceptibility to disease.",
      "Low": "Insufficient potassium may lead to reduced stress tolerance and poor fruit quality.",
      "Optimum": "Adequate potassium to support water regulation, disease resistance, and fruit development.",
      "High": "Elevated potassium levels that may compete with magnesium and calcium uptake.",
      "Very High": "Excessive potassium that may create imbalances with other nutrients."
    },
    "Soil Moisture": {
      "Very Low": "Drought conditions that will severely stress plants and reduce growth.",
      "Low": "Insufficient moisture that may limit nutrient uptake and plant growth.",
      "Optimum": "Ideal moisture levels for plant growth and nutrient availability.",
      "High": "Elevated moisture levels that may restrict oxygen availability to roots.",
      "Very High": "Saturated conditions that can cause root rot and anaerobic soil conditions."
    },
    "Electrical Conductivity": {
      "Very Low": "Very low salt concentration, potentially indicating nutrient deficiencies.",
      "Low": "Low salt levels that may indicate limited nutrient availability.",
      "Optimum": "Ideal salt concentration for plant growth and nutrient uptake.",
      "High": "Elevated salt levels that may stress sensitive plants and impact water uptake.",
      "Very High": "Potentially harmful salt concentrations that can severely impact plant growth."
    }
  };

  // Return the specific explanation or a default one
  return explanations[name]?.[rating] || 
    `${name} is ${rating.toLowerCase()}, which may affect plant growth and soil health.`;
}

function getKeyFinding(name: string, rating: string, value: number): string {
  switch(name) {
    case "pH":
      if (rating === "Very Low") 
        return `Soil pH is extremely acidic at ${value.toFixed(1)}, requiring significant liming to correct.`;
      if (rating === "Low") 
        return `Acidic soil (pH ${value.toFixed(1)}) may limit nutrient availability for many crops.`;
      if (rating === "High") 
        return `Alkaline soil (pH ${value.toFixed(1)}) may reduce micronutrient availability.`;
      if (rating === "Very High") 
        return `Extremely alkaline soil (pH ${value.toFixed(1)}) requires acidification for most crops.`;
      break;
    case "Nitrogen":
      if (rating === "Very Low" || rating === "Low") 
        return `Nitrogen deficiency detected, supplemental fertilization recommended.`;
      if (rating === "High" || rating === "Very High") 
        return `Elevated nitrogen levels may cause excessive vegetative growth.`;
      break;
    case "Phosphorous":
      if (rating === "Very Low" || rating === "Low") 
        return `Low phosphorus may limit root development and flowering.`;
      if (rating === "High" || rating === "Very High") 
        return `High phosphorus levels may impact water quality and create nutrient imbalances.`;
      break;
    case "Potassium":
      if (rating === "Very Low" || rating === "Low") 
        return `Potassium deficiency may reduce crop resistance to drought and disease.`;
      if (rating === "High" || rating === "Very High") 
        return `Excessive potassium may interfere with calcium and magnesium uptake.`;
      break;
    case "Electrical Conductivity":
      if (rating === "Very Low") 
        return `Very low salt content may indicate nutrient leaching or poor fertility.`;
      if (rating === "High" || rating === "Very High") 
        return `Elevated salt content may stress plants and affect water uptake.`;
      break;
  }
  return `${name} levels are ${rating.toLowerCase()} (${value.toFixed(2)}).`;
}

function getOverallRating(parameters: any[]): string {
  // Count the number of parameters in each rating category
  const ratings = parameters.map(p => p.rating);
  const counts = {
    "Very Low": ratings.filter(r => r === "Very Low").length,
    "Low": ratings.filter(r => r === "Low").length,
    "Optimum": ratings.filter(r => r === "Optimum").length,
    "High": ratings.filter(r => r === "High").length,
    "Very High": ratings.filter(r => r === "Very High").length
  };
  
  // Weight by importance (pH, NPK more important than others)
  const importantParams = ["pH", "Nitrogen", "Phosphorous", "Potassium"];
  const importantRatings = parameters
    .filter(p => importantParams.includes(p.name))
    .map(p => p.rating);
  
  if (importantRatings.includes("Very Low") || counts["Very Low"] > 2) 
    return "Poor";
  if (importantRatings.includes("Low") || counts["Low"] > 1)
    return "Fair";
  if (counts["Optimum"] >= parameters.length / 2)
    return "Good";
  if (counts["Optimum"] >= parameters.length * 0.75)
    return "Excellent";
  
  return "Fair";
}

function generateDefaultCropRecommendations(parameters: any[]): any[] {
  // Get soil pH to determine crop suitability
  const pHParam = parameters.find(p => p.name === "pH");
  const pH = pHParam ? pHParam.average : 7.0; // Default to neutral if not found
  
  // Get NPK levels for crop selection
  const nitrogen = parameters.find(p => p.name === "Nitrogen")?.average || 20;
  const phosphorus = parameters.find(p => p.name === "Phosphorous")?.average || 20;
  const potassium = parameters.find(p => p.name === "Potassium")?.average || 150;
  
  // Example set of crops with different requirements
  const crops = [
    {
      crop: "Corn",
      suitability: pH > 5.8 && pH < 7.0 ? "Highly Suitable" : "Moderately Suitable",
      yieldPotential: nitrogen > 30 ? "High (10-12 tons/ha)" : "Medium (8-10 tons/ha)",
      estimatedCost: "$600-750 per hectare",
      potentialRevenue: "$1,400-1,800 per hectare",
      roi: nitrogen > 30 && phosphorus > 25 ? "130-140%" : "100-120%"
    },
    {
      crop: "Soybeans",
      suitability: pH > 6.0 && pH < 7.5 ? "Highly Suitable" : "Moderately Suitable",
      yieldPotential: potassium > 180 ? "High (3.5-4 tons/ha)" : "Medium (2.5-3 tons/ha)",
      estimatedCost: "$450-550 per hectare",
      potentialRevenue: "$1,100-1,400 per hectare",
      roi: potassium > 180 ? "140-150%" : "110-130%"
    },
    {
      crop: "Wheat",
      suitability: pH > 6.0 && pH < 7.5 ? "Highly Suitable" : "Moderately Suitable",
      yieldPotential: nitrogen > 25 ? "High (4-5 tons/ha)" : "Medium (3-4 tons/ha)",
      estimatedCost: "$400-500 per hectare",
      potentialRevenue: "$800-1,000 per hectare",
      roi: "90-110%"
    }
  ];
  
  // Add a vegetable crop option if the soil is suitable
  if (pH > 6.0 && pH < 7.0 && nitrogen > 20) {
    crops.push({
      crop: "Mixed Vegetables",
      suitability: "Highly Suitable",
      yieldPotential: "Variable by crop",
      estimatedCost: "$2,000-3,000 per hectare",
      potentialRevenue: "$6,000-10,000 per hectare",
      roi: "200-300%"
    });
  }
  
  return crops;
}

function generateTreatmentRecommendations(parameters: any[]): any[] {
  const treatments = [];
  
  // Get soil parameters for treatment decisions
  const pH = parameters.find(p => p.name === "pH")?.average || 7.0;
  const nitrogen = parameters.find(p => p.name === "Nitrogen")?.average || 20;
  const phosphorus = parameters.find(p => p.name === "Phosphorous")?.average || 20;
  const potassium = parameters.find(p => p.name === "Potassium")?.average || 150;
  
  // Add pH correction if needed
  if (pH < 6.0) {
    treatments.push({
      treatment: "Lime Application",
      application: `${Math.round((6.5 - pH) * 2 * 1000)} kg/ha of agricultural lime`,
      timing: "Apply before planting season",
      cost: `$${Math.round((6.5 - pH) * 2 * 100)}-${Math.round((6.5 - pH) * 2 * 150)} per hectare`,
      expectedBenefit: "Increased nutrient availability and improved soil structure",
      roi: "120-150% through improved yield"
    });
  } else if (pH > 7.5) {
    treatments.push({
      treatment: "Sulfur Application",
      application: `${Math.round((pH - 6.5) * 1.5 * 1000)} kg/ha of elemental sulfur`,
      timing: "Apply 3-6 months before planting",
      cost: `$${Math.round((pH - 6.5) * 1.5 * 150)}-${Math.round((pH - 6.5) * 1.5 * 200)} per hectare`,
      expectedBenefit: "Improved micronutrient availability",
      roi: "100-130% through improved yield"
    });
  }
  
  // Add nitrogen fertilization if needed
  if (nitrogen < 20) {
    treatments.push({
      treatment: "Nitrogen Fertilization",
      application: `${Math.round((20 - nitrogen) * 2)} kg/ha of N`,
      timing: "Split application: 50% pre-planting, 50% during growth",
      cost: `$${Math.round((20 - nitrogen) * 2 * 1.5)}-${Math.round((20 - nitrogen) * 2 * 2)} per hectare`,
      expectedBenefit: "Improved vegetative growth and yield",
      roi: "150-200% through increased yield"
    });
  }
  
  // Add phosphorus fertilization if needed
  if (phosphorus < 20) {
    treatments.push({
      treatment: "Phosphorus Fertilization",
      application: `${Math.round((20 - phosphorus) * 2.5)} kg/ha of P2O5`,
      timing: "Apply before or during planting",
      cost: `$${Math.round((20 - phosphorus) * 2.5 * 2)}-${Math.round((20 - phosphorus) * 2.5 * 2.5)} per hectare`,
      expectedBenefit: "Enhanced root development and early growth",
      roi: "130-180% through improved yield"
    });
  }
  
  // Add potassium fertilization if needed
  if (potassium < 150) {
    treatments.push({
      treatment: "Potassium Fertilization",
      application: `${Math.round((150 - potassium) * 1.2)} kg/ha of K2O`,
      timing: "Apply before planting",
      cost: `$${Math.round((150 - potassium) * 1.2 * 1.2)}-${Math.round((150 - potassium) * 1.2 * 1.5)} per hectare`,
      expectedBenefit: "Improved drought and disease resistance",
      roi: "120-160% through reduced crop loss"
    });
  }
  
  // If no specific treatments needed, add a general recommendation
  if (treatments.length === 0) {
    treatments.push({
      treatment: "Organic Matter Enhancement",
      application: "5-10 tons/ha of quality compost",
      timing: "Apply annually after harvest or before planting",
      cost: "$200-400 per hectare",
      expectedBenefit: "Improved soil structure, water retention, and microbial activity",
      roi: "120-150% through long-term soil health improvement"
    });
  }
  
  return treatments;
}

// Notifications API functions
export async function getNotifications(deviceId?: string | number): Promise<Notification[]> {
  // If deviceId is provided, ensure it's sent as is (whether number or string)
  // This allows filtering by both ID and serial number on the backend
  const endpoint = deviceId 
    ? `/notifications?device_id=${deviceId}`
    : "/notifications"
    
  try {
    console.log(`Fetching notifications from: ${endpoint}`);
    const token = getToken();
    const rawResponse = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      }
    });
    
    if (!rawResponse.ok) {
      throw new Error(`API error: ${rawResponse.status} ${rawResponse.statusText}`);
    }
    
    const response = await rawResponse.json();
    console.log('Raw notifications API response:', response);
    
    // Field Eyes backend returns a specific format: { notifications: [...], count: number }
    if (response && response.notifications && Array.isArray(response.notifications)) {
      console.log(`Found ${response.notifications.length} notifications in response`);
      return response.notifications;
    } else if (Array.isArray(response)) {
      console.log(`Found ${response.length} notifications in array response`);
      return response;
    } else {
      console.error('Unexpected notifications response format:', response);
      return [];
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function generateDeviceNotifications(serialNumber: string): Promise<{ message: string; status: string }> {
  if (!serialNumber) {
    throw new Error('Serial number is required to generate notifications');
  }

  try {
    console.log(`Generating notifications for device with serial number: ${serialNumber}`);
    
    // Call the endpoint to generate notifications for this specific device
    const endpoint = `/devices/notifications?serial_number=${serialNumber}`;
    const response = await fetchAPI<{ message: string; status: string }>(endpoint, {
      method: "GET",
    });
    
    console.log('Generate notifications response:', response);
    return response;
  } catch (error) {
    console.error(`Error generating notifications for device ${serialNumber}:`, error);
    throw error;
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  return fetchAPI<void>(`/notifications/${id}/read`, {
    method: "PUT",
  })
}

export async function clearAllNotifications(): Promise<void> {
  try {
    console.log('Clearing all notifications');
    
    // Use the dedicated endpoint to delete all notifications
    const token = getToken();
    const url = `${API_URL}/notifications/delete-all`;
    
    console.log(`Deleting all notifications via: ${url}`);
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Delete all notifications response:', data);
    
    if (data && data.message) {
      console.log(data.message);
    }
  } catch (error) {
    console.error('Error clearing notifications:', error);
    throw error;
  }
}

export async function getNotificationsBySerialNumber(serialNumber: string): Promise<Notification[]> {
  if (!serialNumber) {
    console.error('No serial number provided');
    return [];
  }
  
  try {
    // Use device_name instead of device_id to explicitly query by serial number
    const endpoint = `/notifications?device_name=${serialNumber}`;
    console.log(`Fetching notifications using device name endpoint: ${endpoint}`);
    
    const token = getToken();
    const rawResponse = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      }
    });
    
    if (!rawResponse.ok) {
      throw new Error(`API error: ${rawResponse.status} ${rawResponse.statusText}`);
    }
    
    const response = await rawResponse.json();
    console.log('Raw serial number notifications response:', response);
    
    // Field Eyes backend returns a specific format: { notifications: [...], count: number }
    if (response && response.notifications && Array.isArray(response.notifications)) {
      console.log(`Found ${response.notifications.length} notifications in response for serial ${serialNumber}`);
      return response.notifications;
    } else if (Array.isArray(response)) {
      console.log(`Found ${response.length} notifications in array response for serial ${serialNumber}`);
      return response;
    } else {
      console.error('Unexpected serial number notifications response format:', response);
      return [];
    }
  } catch (error) {
    console.error("Error fetching notifications by serial number:", error);
    return [];
  }
}

// User API functions
export async function getUserProfile(): Promise<User> {
  return fetchAPI<User>("/user")
}

export async function updateUserProfile(user: Partial<User>): Promise<User> {
  return fetchAPI<User>("/user", {
    method: "PUT",
    body: JSON.stringify(user),
  })
}

// Farm API functions
export async function getFarmInfo(): Promise<Farm> {
  return fetchAPI<Farm>("/farm")
}

export async function updateFarmInfo(farm: Partial<Farm>): Promise<Farm> {
  return fetchAPI<Farm>("/farm", {
    method: "PUT",
    body: JSON.stringify(farm),
  })
}
