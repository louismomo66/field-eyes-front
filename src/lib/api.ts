import type { Device, FieldBoundary, Report, ReportData, Notification, User, Farm } from "@/types"
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
  return fetchAPI<ReportData>("/reports/generate", {
    method: "POST",
    body: JSON.stringify({
      serial_number: deviceId,
      type: reportType,
      time_range: timeRange,
      ...options,
    }),
  })
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
    const rawResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002/api"}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : "",
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
    const token = localStorage.getItem('token');
    const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002/api"}/notifications/delete-all`;
    
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
    
    const rawResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002/api"}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : "",
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
