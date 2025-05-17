import type { Notification } from '@/types';

// Define notification preferences interface
export interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  alertTypes: {
    lowMoisture: boolean;
    highMoisture: boolean;
    phChange: boolean;
    nutrientDeficiency: boolean;
    batteryLow: boolean;
    deviceOffline: boolean;
  }
}

// Default notification preferences
export const defaultNotificationPreferences: NotificationPreferences = {
  emailNotifications: false,
  smsNotifications: false,
  pushNotifications: false,
  alertTypes: {
    lowMoisture: false,
    highMoisture: false,
    phChange: false,
    nutrientDeficiency: false,
    batteryLow: false,
    deviceOffline: false
  }
};

/**
 * Check if a notification should be displayed based on user preferences
 */
export function shouldShowNotification(notification: Notification): boolean {
  try {
    // Get user preferences
    const savedPrefsString = localStorage.getItem('notificationPreferences');
    if (!savedPrefsString) {
      // If no preferences are saved, show all notifications
      return true;
    }
    
    const prefs: NotificationPreferences = JSON.parse(savedPrefsString);
    
    // If no channel is specified, check all channel preferences
    if (!notification.channel) {
      // If any notification channel is enabled, show the notification
      if (prefs.emailNotifications || prefs.smsNotifications || prefs.pushNotifications) {
        // Continue to alert type checking
      } else {
        // All notification channels are disabled
        return false;
      }
    } else {
      // First check if notifications are enabled for this channel
      if (notification.channel === 'email' && !prefs.emailNotifications) {
        return false;
      }
      
      if (notification.channel === 'sms' && !prefs.smsNotifications) {
        return false;
      }
      
      if (notification.channel === 'push' && !prefs.pushNotifications) {
        return false;
      }
    }
    
    // Then check if this alert type is enabled
    const message = notification.message?.toLowerCase() || '';
    
    if (message.includes('moisture') && message.includes('low') && !prefs.alertTypes.lowMoisture) {
      return false;
    }
    
    if (message.includes('moisture') && message.includes('high') && !prefs.alertTypes.highMoisture) {
      return false;
    }
    
    if (message.includes('ph') && !prefs.alertTypes.phChange) {
      return false;
    }
    
    if (message.includes('nutrient') && !prefs.alertTypes.nutrientDeficiency) {
      return false;
    }
    
    if (message.includes('battery') && !prefs.alertTypes.batteryLow) {
      return false;
    }
    
    if (message.includes('offline') && !prefs.alertTypes.deviceOffline) {
      return false;
    }
    
    // If we got here, the notification should be shown
    return true;
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    // On error, default to showing the notification
    return true;
  }
}

/**
 * Get filtered notifications based on user preferences
 */
export function filterNotificationsByPreferences(notifications: Notification[]): Notification[] {
  if (!notifications || !Array.isArray(notifications)) {
    return [];
  }
  
  return notifications.filter(shouldShowNotification);
}

/**
 * Save notification preferences to localStorage
 */
export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
}

/**
 * Load notification preferences from localStorage
 */
export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const savedPrefs = localStorage.getItem('notificationPreferences');
    if (savedPrefs) {
      return JSON.parse(savedPrefs);
    }
  } catch (error) {
    console.error('Error loading notification preferences:', error);
  }
  
  return defaultNotificationPreferences;
} 