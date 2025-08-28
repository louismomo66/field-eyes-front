import { Device, SoilReading, Notification } from '../types/field-eyes';

/**
 * Transforms a backend Device into the frontend UI friendly format
 */
export function transformDevice(device: Device): Device {
  // Create a copy of the device
  const uiDevice = { ...device };
  
  // Set some UI friendly values
  // Use device.name if it exists, otherwise create a default name
  uiDevice.name = device.name || `Field Sensor ${device.serial_number}`;
  
  // Set other UI values
  uiDevice.status = "active"; // Default to active
  uiDevice.lastReading = new Date(device.updated_at).toLocaleString();
  uiDevice.battery = 85; // Mocked value
  uiDevice.signal = "Strong"; // Mocked value
  
  return uiDevice;
}

/**
 * Transforms a backend SoilReading into the frontend UI friendly format
 */
export function transformSoilReading(reading: SoilReading): SoilReading {
  // Create a copy of the reading
  const uiReading = { ...reading };
  
  // Debug the electrical conductivity values in the input
  console.log("Processing soil reading:", {
    id: reading.id,
    ec_input: reading.ec,
    ec_type: typeof reading.ec,
    ec_full_input: reading.electrical_conductivity,
    ec_full_type: typeof reading.electrical_conductivity,
    raw_reading: reading
  });
  
  // Add UI friendly aliases and ensure proper type conversion
  // Handle EC specially to ensure we always have a valid number
  
  // Get the EC value from any available source
  let ecValue: number | null = null;
  
  // Try electrical_conductivity first (the primary field from the API)
  if (reading.electrical_conductivity !== undefined && reading.electrical_conductivity !== null) {
    ecValue = Number(reading.electrical_conductivity);
    if (isNaN(ecValue)) ecValue = 0; // Force to 0 if NaN
  }
  // Then try ec (the UI field)
  else if (reading.ec !== undefined && reading.ec !== null) {
    ecValue = Number(reading.ec);
    if (isNaN(ecValue)) ecValue = 0; // Force to 0 if NaN
  }
  
  // Handle case where the values might be strings
  if (typeof reading.electrical_conductivity === 'string') {
    const parsedValue = Number(reading.electrical_conductivity);
    if (!isNaN(parsedValue)) {
      ecValue = parsedValue;
    }
  }
  else if (typeof reading.ec === 'string') {
    const parsedValue = Number(reading.ec);
    if (!isNaN(parsedValue)) {
      ecValue = parsedValue;
    }
  }
  
  // Set both ec and electrical_conductivity to the same value
  if (ecValue !== null) {
    uiReading.ec = ecValue;
    uiReading.electrical_conductivity = ecValue;
  } else {
    // Default both to 0 if no valid value was found
    uiReading.ec = 0;
    uiReading.electrical_conductivity = 0;
  }
  
  // Process other fields
  uiReading.moisture = reading.soil_moisture;
  uiReading.phosphorus = reading.phosphorous;
  uiReading.timestamp = new Date(reading.created_at).toLocaleString();
  
  // Log the output EC values to verify
  console.log("Transformed EC values:", {
    id: uiReading.id,
    ec_output: uiReading.ec,
    electrical_conductivity_output: uiReading.electrical_conductivity
  });
  
  return uiReading;
}

/**
 * Transforms a backend Notification into the frontend UI friendly format
 */
export function transformNotification(notification: Notification): Notification {
  // Create a copy of the notification
  const uiNotification = { ...notification };
  
  // Add UI friendly values
  uiNotification.time = new Date(notification.created_at).toLocaleString();
  
  // Assign an icon based on notification type
  switch(notification.type) {
    case 'success':
      uiNotification.icon = 'check-circle';
      break;
    case 'warning':
      uiNotification.icon = 'alert-triangle';
      break;
    case 'error':
      uiNotification.icon = 'alert-octagon';
      break;
    case 'info':
    default:
      uiNotification.icon = 'info';
      break;
  }
  
  return uiNotification;
}

/**
 * Transforms an array of backend Devices into UI friendly format
 */
export function transformDevices(devices: Device[]): Device[] {
  return devices.map(transformDevice);
}

/**
 * Transforms an array of backend SoilReadings into UI friendly format
 */
export function transformSoilReadings(readings: SoilReading[]): SoilReading[] {
  return readings.map(transformSoilReading);
}

/**
 * Transforms an array of backend Notifications into UI friendly format
 */
export function transformNotifications(notifications: Notification[]): Notification[] {
  return notifications.map(transformNotification);
} 