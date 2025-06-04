// Device Types
export interface Device {
  id: string
  name: string
  status: string
  lat: number
  lng: number
  readings: Record<string, any>
  serial_number: string
}

// Field Boundary Types
export interface FieldBoundary {
  id: string
  name: string
  coordinates: number[][] // Array of [lat, lng] coordinates
}

// Soil Reading Types
export interface SoilReading {
  id: string
  deviceId: string
  deviceName: string
  timestamp: string
  moisture?: number
  temperature?: number
  ph?: number
  nitrogen?: number
  phosphorus?: number
  potassium?: number
  ec?: number
  status: "optimal" | "warning" | "critical"
  [key: string]: any
}

// Report Types
export interface Report {
  id: string
  name: string
  date: string
  type: "PDF" | "CSV"
  size: string
  url: string
}

// Soil Health Indicator Types
export interface SoilIndicator {
  name: string
  value: string
  rating: string
  ideal: string
  explanation: string
}

// Crop Recommendation Types
export interface CropRecommendation {
  crop: string
  suitability: string
  yieldPotential: string
  estimatedCost: string
  potentialRevenue: string
  roi: string
}

// Treatment Recommendation Types
export interface TreatmentRecommendation {
  treatment: string
  application: string
  timing: string
  cost: string
  expectedBenefit: string
  roi: string
}

// Seasonal Activity Types
export interface SeasonalActivity {
  month: string
  activities: string[]
}

// Report Data Types
export interface Parameter {
  name: string
  unit: string
  ideal_min: number
  ideal_max: number
  average: number
  min: number
  max: number
  rating: string
  cec?: number
}

export interface BasicSoilAnalysisReport {
  device_name: string
  parameters: Parameter[]
  generated_at: string
  start_date: string
  end_date: string
  // Add fields that might be needed for report preview
  date?: string
  farmName?: string
  deviceName?: string
  deviceId?: string
  overallHealth?: string
  keyFindings?: string[]
  soilIndicators?: SoilIndicator[]
}

export interface ComprehensiveReport {
  date: string
  farmName: string
  deviceName: string
  deviceId: string
  overallHealth: string
  keyFindings: string[]
  soilIndicators: SoilIndicator[]
  cropRecommendations: CropRecommendation[]
  treatmentRecommendations: TreatmentRecommendation[]
  seasonalPlan: SeasonalActivity[]
}

export interface CropReport {
  date: string
  farmName: string
  deviceName: string
  deviceId: string
  overallHealth: string
  keyFindings: string[]
  soilIndicators: SoilIndicator[]
  cropRecommendations: CropRecommendation[]
}

export type ReportData = BasicSoilAnalysisReport | ComprehensiveReport | CropReport

// Notification Types
export interface Notification {
  id: string
  type: "info" | "warning" | "error" | "success"
  channel?: "email" | "sms" | "push"
  message: string
  time: string
  read: boolean
  icon?: string
  created_at?: string
  device_id?: string | number
  device_name?: string
}

// User Types
export interface User {
  id: string
  name: string
  email: string
  role: string
}

// Farm Types
export interface Farm {
  id: string
  name: string
  size: number
  location: string
  soilType: string
  primaryCrops: string[]
  description?: string
}
