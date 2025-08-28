import { 
    Device, 
    SoilReading, 
    Notification, 
    User, 
    LoginResponse, 
    Credentials,
    RegisterRequest,
    MessageResponse,
    AnalysisResult
  } from "../types/field-eyes"
  import { getToken, setToken, removeToken, handleTokenExpiration } from "@/lib/auth"
  
  // Base API URL from environment variable
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002/api"
  
  // Authentication headers helper
  const getAuthHeaders = () => {
    const token = getToken()
    return {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    }
  }
  
  // Custom API error class with additional properties
  export class APIError extends Error {
    status: number;
    statusText: string;
    data: any;
  
    constructor(message: string, status: number, statusText: string, data?: any) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.statusText = statusText;
      this.data = data;
    }
  }
  
  // Helper function for API requests
  async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          ...getAuthHeaders(),
        },
        ...options,
      })
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle unauthorized errors specifically (401)
        if (response.status === 401) {
          // Handle token expiration
          handleTokenExpiration()
          throw new APIError(
            'Session expired. Please log in again.',
            response.status,
            response.statusText,
            errorData
          )
        }
        
        // Create a proper error object with all relevant information
        throw new APIError(
          errorData.message || `API error: ${response.status} ${response.statusText}`,
          response.status,
          response.statusText,
          errorData
        )
      }
  
      return await response.json()
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error)
      // If it's already an APIError, just rethrow it
      if (error instanceof APIError) {
        throw error
      }
      // Otherwise wrap it in our custom error
      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        500,
        'Internal Error',
        {}
      )
    }
  }
  
  // Authentication
  export async function login(credentials: Credentials): Promise<LoginResponse> {
    const response = await fetchAPI<LoginResponse>("/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
    
    // Store the token using our auth utility
    if (response.token) {
      setToken(response.token)
    }
    
    return response
  }
  
  export async function signup(userData: RegisterRequest): Promise<LoginResponse> {
  // Map name to username as expected by the backend
  const formattedData = {
    username: userData.name,
    email: userData.email,
    password: userData.password,
    ...(userData.admin_code && { admin_code: userData.admin_code })
  }
  
  const response = await fetchAPI<LoginResponse>("/signup", {
    method: "POST",
    body: JSON.stringify(formattedData),
  })
  
  // Store the token using our auth utility
  if (response.token) {
    setToken(response.token)
    console.log("Token stored after signup, user role:", response.user?.role || "unknown")
  }
  
  return response
}
  
  export async function forgotPassword(email: string): Promise<MessageResponse> {
    return fetchAPI<MessageResponse>("/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  }
  
  export async function resetPassword(email: string, otp: string, newPassword: string): Promise<MessageResponse> {
    return fetchAPI<MessageResponse>("/reset-password", {
      method: "POST",
      body: JSON.stringify({ 
        email, 
        otp, 
        new_password: newPassword 
      }),
    })
  }
  
  // Device operations
  export async function getUserDevices(): Promise<Device[]> {
    return fetchAPI<Device[]>("/user-devices")
  }
  
  export async function registerDevice(deviceData: { device_type: string; serial_number: string }): Promise<MessageResponse> {
    return fetchAPI<MessageResponse>("/register-device", {
      method: "POST",
      body: JSON.stringify(deviceData),
    })
  }
  
  export async function getDeviceLogs(serialNumber: string): Promise<SoilReading[]> {
    const logs = await fetchAPI<SoilReading[]>(`/get-device-logs?serial_number=${serialNumber}`);
    return logs;
  }
  
  export async function getLatestDeviceLog(serialNumber: string): Promise<SoilReading> {
    return fetchAPI<SoilReading>(`/latest-device-log?serial_number=${serialNumber}`)
  }
  
  export async function deleteDevice(serialNumber: string): Promise<MessageResponse> {
    return fetchAPI<MessageResponse>(`/delete-device?serial_number=${serialNumber}`, {
      method: "DELETE",
    })
  }
  
  export async function getUnclaimedDevices(): Promise<Device[]> {
    return fetchAPI<Device[]>("/unclaimed-devices")
  }
  
  export async function claimDevice(serialNumber: string, deviceName?: string): Promise<{ message: string; device_id: string; serial_number: string }> {
    console.log(`Claiming device ${serialNumber} with name "${deviceName || 'not provided'}"`);
    
    const requestBody = { 
      serial_number: serialNumber,
      name: deviceName 
    };
    
    console.log("Request body for claim-device:", requestBody);
    
    return fetchAPI<{ message: string; device_id: string; serial_number: string }>("/claim-device", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })
  }
  
  // Analysis
  export async function analyzeDeviceData(serialNumber: string, type: string = "soil"): Promise<AnalysisResult> {
    return fetchAPI<AnalysisResult>(`/analyze-device?serial_number=${serialNumber}&type=${type}`)
  }
  
  // Notifications
  export async function getNotifications(): Promise<Notification[]> {
    return fetchAPI<Notification[]>("/notifications")
  }
  
  export async function markNotificationAsRead(id: number): Promise<MessageResponse> {
    return fetchAPI<MessageResponse>("/notifications/read", {
      method: "PUT",
      body: JSON.stringify({ id }),
    })
  }
  
  export async function markAllNotificationsAsRead(): Promise<MessageResponse> {
    return fetchAPI<MessageResponse>("/notifications/read-all", {
      method: "PUT"
    })
  }
  
  export async function deleteNotification(id: number): Promise<MessageResponse> {
    return fetchAPI<MessageResponse>("/notifications", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    })
  }
  
  export async function updateDeviceName(serialNumber: string, name: string): Promise<{ message: string; device_id: string; serial_number: string; name: string }> {
  console.log(`Updating name for device ${serialNumber} to "${name}"`);
  
  return fetchAPI<{ message: string; device_id: string; serial_number: string; name: string }>("/update-device-name", {
    method: "PUT",
    body: JSON.stringify({
      serial_number: serialNumber,
      name: name
    }),
  })
}

// Admin API functions
export async function getAllDevicesForAdmin(): Promise<Device[]> {
  return fetchAPI<Device[]>("/admin/devices")
}

export async function getDeviceLogsForAdmin(
  serialNumber: string, 
  startDate?: string, 
  endDate?: string,
  latestOnly?: boolean
): Promise<SoilReading[]> {
  let url = `/admin/device-logs?serial_number=${encodeURIComponent(serialNumber)}`
  if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`
  if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`
  if (latestOnly) url += `&latest_only=true`
  return fetchAPI<SoilReading[]>(url)
}

export async function getLatestDeviceLogForAdmin(serialNumber: string): Promise<SoilReading> {
  console.log(`Admin requesting latest log for device ${serialNumber}`)
  try {
    // Use the dedicated admin endpoint for latest device log
    const result = await fetchAPI<SoilReading>(`/admin/latest-device-log?serial_number=${serialNumber}`)
    console.log(`Admin latest log result for ${serialNumber}:`, result ? {
      id: result.id,
      created_at: result.created_at,
      serial_number: result.serial_number,
      hasData: !!result
    } : 'No data')
    
    // Verify the log belongs to the requested device
    if (result && result.serial_number && result.serial_number !== serialNumber) {
      console.error(`Mismatch in getLatestDeviceLogForAdmin: Log serial ${result.serial_number} doesn't match requested ${serialNumber}`)
      throw new Error(`Log serial number mismatch: ${result.serial_number} vs ${serialNumber}`)
    }
    
    return result
  } catch (error) {
    console.error(`Error in getLatestDeviceLogForAdmin for ${serialNumber}:`, error)
    throw error
  }
}

// Download device data as CSV
export async function downloadDeviceData(
  deviceId: number, 
  startDate?: string, 
  endDate?: string
): Promise<void> {
  const token = getToken()
  if (!token) {
    throw new Error('No authentication token found')
  }

  let url = `${API_URL}/admin/download-device-data?device_id=${deviceId}`
  if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`
  if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new APIError(
        errorData.message || `Download failed: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText,
        errorData
      )
    }

    // Get the filename from the Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'device_data.csv'
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    // Create a blob and download it
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('Error downloading device data:', error)
    throw error
  }
} 