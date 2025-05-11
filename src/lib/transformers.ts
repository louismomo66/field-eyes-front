import { Device, SoilReading, Notification } from '../types/field-eyes';

/**
 * Transforms a backend Device into the frontend UI friendly format
 */
export function transformDevice(device: Device): Device {
  // Create a copy of the device
  const uiDevice = { ...device };
  
  // Set some UI friendly values
  uiDevice.name = device.name || `Device ${device.serial_number}`;
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
  
  // Add UI friendly aliases
  uiReading.ec = reading.electrical_conductivity;
  uiReading.moisture = reading.soil_moisture;
  uiReading.phosphorus = reading.phosphorous;
  uiReading.timestamp = new Date(reading.created_at).toLocaleString();
  
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