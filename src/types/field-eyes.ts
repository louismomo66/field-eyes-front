// Types that match the Field Eyes backend data structures

// Device represents a sensor device
export interface Device {
    id: number
    device_type: string
    serial_number: string
    user_id: number
    created_at: string
    updated_at: string
    // UI fields (these will need to be derived/transformed)
    name?: string
    status?: "active" | "warning" | "offline"
    battery?: number
    signal?: string
    lastReading?: string
  }
  
  // SoilReading represents the device data logged from sensors
  export interface SoilReading {
    id: number
    device_id: number
    serial_number: string
    temperature: number
    humidity: number
    nitrogen: number
    phosphorous: number
    potassium: number
    ph: number
    soil_moisture: number
    soil_temperature: number
    soil_humidity: number
    electrical_conductivity: number
    longitude: number
    latitude: number
    created_at: string
    // UI friendly accessors
    ec?: number
    moisture?: number
    phosphorus?: number
    timestamp?: string
  }
  
  // User represents the authenticated user
  export interface User {
    id: number
    name: string
    email: string
    role: string
    created_at: string
    updated_at: string
  }
  
  // Notification represents alerts from the system
  export interface Notification {
    id: number
    type: string
    message: string
    device_id: number
    device_name: string
    read: boolean
    user_id: number
    created_at: string
    updated_at: string
    // UI fields
    time?: string
    icon?: string
  }
  
  // Analysis result from the ML analysis endpoint
  export interface AnalysisResult {
    device_id: number
    serial_number: string
    analysis_type: string
    recommendations: string[]
    predictions: Record<string, number>
    trends: Record<string, string>
    last_updated: string
  }
  
  // Login response
  export interface LoginResponse {
    token: string
    user: User
  }
  
  // Auth credentials
  export interface Credentials {
    email: string
    password: string
  }
  
  // Register user request
  export interface RegisterRequest {
    name: string
    email: string
    password: string
  }
  
  // API response with message
  export interface MessageResponse {
    message: string
  } 