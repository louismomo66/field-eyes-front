"use client"

import { useState, useEffect } from "react"
import { Info, AlertTriangle, CheckCircle, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getNotifications, markNotificationAsRead, generateDeviceNotifications, getNotificationsBySerialNumber, clearAllNotifications } from "@/lib/api"
import type { Notification } from "@/types"
import { toast } from "@/components/ui/use-toast"
import React from "react"
import { getToken } from "@/lib/auth"

interface NotificationCenterProps {
  onNotificationUpdate?: (notifications: Notification[]) => void;
  deviceId?: string | number;
  deviceName?: string;
  serialNumber?: string;
}

export function NotificationCenter({ 
  onNotificationUpdate, 
  deviceId, 
  deviceName,
  serialNumber
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [deviceId]) // Refetch when deviceId changes

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Log what we're using to fetch notifications
      console.log(`Fetching notifications using: ${serialNumber || deviceId || 'all notifications'}`)
      
      // Decide which API function to use based on available identifiers
      let data;
      if (serialNumber) {
        // If we have a serial number, use the dedicated endpoint
        console.log(`Using serial number endpoint with: ${serialNumber}`)
        data = await getNotificationsBySerialNumber(serialNumber)
      } else if (deviceId) {
        // Fallback to device ID if no serial number
        console.log(`Using device ID: ${deviceId}`)
        data = await getNotifications(deviceId)
      } else {
        // Get all notifications if no identifiers provided
        console.log('Getting all notifications')
        data = await getNotifications()
      }
      
      console.log('Notifications data received:', data)
      
      // Safety check for data structure
      if (data && Array.isArray(data)) {
      setNotifications(data)
        
        // Notify parent component
        if (onNotificationUpdate) {
          onNotificationUpdate(data)
        }
        
        if (data.length === 0) {
          console.log(`No notifications found for ${serialNumber || deviceId || 'user'}`)
        } else {
          console.log(`Found ${data.length} notifications for ${serialNumber || deviceId || 'user'}`)
        }
      } else {
        console.error('Notifications data is not an array:', data)
        setNotifications([])
      }
      
      setIsLoading(false)
    } catch (err) {
      console.error("Error fetching notifications:", err)
      setError("Failed to load notifications")
      setIsLoading(false)
    }
  }

  const handleGenerateNotifications = async () => {
    // Only proceed if we have a serial number
    if (!serialNumber) {
      toast({
        title: "Error",
        description: "No device serial number provided",
        variant: "destructive"
      })
      return
    }

    try {
      setIsGenerating(true)

      // Call the API to generate notifications for this device
      const response = await generateDeviceNotifications(serialNumber)
      
      toast({
        title: "Success",
        description: response.message || "Notification generation started for this device"
      })

      // After a short delay, refresh notifications to show new ones
      setTimeout(() => {
        fetchNotifications()
      }, 1500)
    } catch (error) {
      console.error("Error generating notifications:", error)
      toast({
        title: "Error",
        description: "Failed to generate notifications",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      // Mark all notifications as read
      const unreadNotifications = Array.isArray(notifications) ? notifications.filter((n) => !n.read) : []

      for (const notification of unreadNotifications) {
        await markNotificationAsRead(notification.id)
      }

      // Update local state
      const updatedNotifications = Array.isArray(notifications) 
        ? notifications.map((n) => ({ ...n, read: true })) 
        : []
      
      setNotifications(updatedNotifications)
      
      // Notify parent component
      if (onNotificationUpdate) {
        onNotificationUpdate(updatedNotifications)
      }
    } catch (err) {
      console.error("Error marking notifications as read:", err)
    }
  }

  const handleClearAll = async () => {
    try {
      setIsClearing(true);
      
      await clearAllNotifications();
      
      // Update local state to show empty notifications
      setNotifications([]);
      
      // Notify parent component
      if (onNotificationUpdate) {
        onNotificationUpdate([]);
      }
      
      toast({
        title: "Success",
        description: "All notifications have been cleared",
      });
    } catch (err) {
      console.error("Error clearing notifications:", err);
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Helper function to get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info key={`icon-info`} className="h-5 w-5 text-blue-500" />
      case "warning":
        return <AlertTriangle key={`icon-warning`} className="h-5 w-5 text-amber-500" />
      case "error":
        return <AlertTriangle key={`icon-error`} className="h-5 w-5 text-red-500" />
      case "success":
        return <CheckCircle key={`icon-success`} className="h-5 w-5 text-green-500" />
      default:
        return <Info key={`icon-default`} className="h-5 w-5 text-blue-500" />
    }
  }

  // Update the debugFetchNotifications function
  const debugFetchNotifications = async () => {
    try {
      setIsLoading(true);
      
      // Log parameters being used
      console.log(`Debug fetch with serial number: ${serialNumber}, device ID: ${deviceId}`);
      
      // Get the direct API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002/api";
      const endpoint = serialNumber 
        ? `${baseUrl}/notifications?device_name=${serialNumber}`
        : deviceId 
          ? `${baseUrl}/notifications?device_id=${deviceId}`
          : `${baseUrl}/notifications`;
      
      console.log(`Debug fetching from: ${endpoint}`);
      
      // Make a direct fetch to see raw response
      const token = getToken();
      const response = await fetch(endpoint, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        }
      });
      
      const jsonData = await response.json();
      console.log('Debug raw API response:', jsonData);
      
      // Show response in toast
      toast({
        title: "API Response Debug",
        description: (
          <pre className="max-h-[300px] overflow-auto text-xs">
            {JSON.stringify(jsonData, null, 2)}
          </pre>
        ),
        duration: 10000
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error("Debug fetch error:", err);
      setError("Debug fetch failed");
      setIsLoading(false);
      
      toast({
        title: "Debug Error",
        description: String(err),
        variant: "destructive",
        duration: 5000
      });
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-[200px]">Loading notifications...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px]">
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchNotifications}>
          Retry
        </Button>
      </div>
    )
  }

  const titleText = deviceId 
    ? `Notifications for ${deviceName || `Device ${deviceId}`}` 
    : "Notifications";

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{titleText}</h3>
        <div className="flex space-x-2">
          <Button 
            variant="ghost"
            size="sm" 
            className="text-xs flex items-center gap-1" 
            onClick={handleClearAll}
            disabled={isClearing || notifications.length === 0}
          >
            {isClearing ? (
              <React.Fragment key="clearing">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Clearing...
              </React.Fragment>
            ) : (
              <React.Fragment key="clear-all">
                <Trash2 className="h-3 w-3" />
                Clear All
              </React.Fragment>
            )}
          </Button>
        <Button variant="ghost" size="sm" className="text-xs" onClick={handleMarkAllAsRead}>
          Mark all as read
        </Button>
        </div>
      </div>
      <ScrollArea className="h-[300px]">
        <div className="flex flex-col space-y-2">
          {!Array.isArray(notifications) || notifications.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              {deviceId ? `No notifications for this device` : `No notifications`}
            </div>
          ) : (
            Array.isArray(notifications) && notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start space-x-2 rounded-md border p-3 ${notification.read ? "bg-gray-50" : ""}`}
              >
                {getNotificationIcon(notification.type)}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {notification.created_at ? 
                      new Date(notification.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : 
                      notification.time}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <Button variant="outline" size="sm" className="w-full" onClick={fetchNotifications}>
        Refresh Notifications
      </Button>
    </div>
  )
}
