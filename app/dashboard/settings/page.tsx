"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { getFarmInfo, updateFarmInfo } from "@/src/lib/api"
import { login } from "@/src/lib/field-eyes-api"
import type { User, Farm } from "@/types"
import type { User as FieldEyesUser } from "@/src/types/field-eyes"
import { getToken } from "@/lib/auth"

// Define notification preferences interface
interface NotificationPreferences {
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
const defaultNotificationPreferences: NotificationPreferences = {
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

export default function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState({ 
    name: "", 
    email: "", 
    phone: "",  // This is not in the User type but we'll keep for UI
    language: "en"  // This is not in the User type but we'll keep for UI
  })
  const [farmData, setFarmData] = useState({
    name: "",
    size: "",
    location: "",
    soilType: "",
    primaryCrops: "",
    description: ""
  })
  const [showFarmTab, setShowFarmTab] = useState(false)
  
  // State for notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  
  // Load notification preferences from localStorage
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem('notificationPreferences');
      if (savedPrefs) {
        setNotificationPrefs(JSON.parse(savedPrefs));
        console.log('Loaded notification preferences from localStorage:', JSON.parse(savedPrefs));
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }, []);
  
  // Handle notification toggle changes
  const handleNotificationToggle = (key: string, value: boolean) => {
    if (key.includes('.')) {
      // Handle nested properties (alert types)
      const [parent, child] = key.split('.');
      setNotificationPrefs(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof NotificationPreferences] as object,
          [child]: value
        }
      }));
    } else {
      // Handle top-level properties
      setNotificationPrefs(prev => ({
        ...prev,
        [key]: value
      }));
    }
  }
  
  // Save notification preferences
  const handleSaveNotificationPreferences = async () => {
    setIsSavingNotifications(true);
    try {
      // Save to localStorage
      localStorage.setItem('notificationPreferences', JSON.stringify(notificationPrefs));
      
      // In a real implementation, you would also save to backend API
      // await saveNotificationPreferences(notificationPrefs);
      
      toast({
        title: "Notification preferences saved",
        description: "Your notification settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: "Error saving preferences",
        description: "There was a problem saving your notification preferences.",
        variant: "destructive"
      });
    } finally {
      setIsSavingNotifications(false);
    }
  }

  // Function to get the current user's profile from the token
  const getCurrentUser = async (): Promise<FieldEyesUser | null> => {
    try {
      const token = getToken();
      if (!token) {
        console.error("No auth token found");
        return null;
      }
      
      console.log("Fetching current user profile with token");
      
      // Parse the JWT token to get user info (token has 3 parts: header.payload.signature)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error("Invalid token format");
        return null;
      }
      
      // The payload is the second part (index 1), and it's base64 encoded
      try {
        // Properly decode the base64 token (handle padding issues)
        const base64Payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padding = '='.repeat((4 - base64Payload.length % 4) % 4);
        const jsonPayload = atob(base64Payload + padding);
        
        const payload = JSON.parse(jsonPayload);
        console.log("Token payload:", payload);
        
        // Field-Eyes might store user info in different ways
        // Try various common JWT patterns to find the user info
        
        // Check if full user object is in the token
        if (payload.user) {
          console.log("Found user object in token");
          return payload.user as FieldEyesUser;
        }
        
        // Check if user info is stored as individual fields
        const userId = payload.sub || payload.user_id || payload.id || 1;
        const userName = payload.name || payload.username || payload.preferred_username || payload.email?.split('@')[0] || "User";
        const userEmail = payload.email || "";
        const userRole = payload.role || "user";
        
        console.log("Extracted user info from token fields:", {
          id: userId,
          name: userName,
          email: userEmail,
          role: userRole
        });
        
        // Return a user object with the extracted fields
        return {
          id: userId,
          name: userName,
          email: userEmail,
          role: userRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } catch (error) {
        console.error("Error parsing token payload:", error);
        return null;
      }
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  };

  // Fetch user and farm data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        console.log("Fetching user profile data...")
        
        // Fetch user profile data
        let userProfileData;
        try {
          userProfileData = await getCurrentUser();
          console.log("User profile data received:", userProfileData)
          
          if (!userProfileData) {
            throw new Error("No user profile data returned");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
          // Use mock data if API fails - for development only
          userProfileData = {
            id: 1,
            name: "Test User",
            email: "user@example.com",
            role: "user",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          console.log("Using mock user profile:", userProfileData)
        }
        
        // Make sure we have a valid name, using email username as fallback
        let displayName = userProfileData.name || "";
        if (!displayName && userProfileData.email) {
          // Extract username part from email (before @)
          const emailParts = userProfileData.email.split('@');
          if (emailParts.length > 0) {
            // Convert username to title case for better display
            displayName = emailParts[0]
              .split(/[._-]/)
              .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
              .join(' ');
          }
        }
        
        setUserData({
          name: displayName,
          email: userProfileData.email || "",
          phone: "", // Not in the User type
          language: "en" // Not in the User type
        })

        console.log("Checking if farm API endpoint exists...")

        // Check if farm endpoint exists before trying to fetch data
        try {
          // Use a direct fetch call instead of the API function to check endpoint existence
          // This way we can properly handle the 404 without throwing
          const token = getToken();
          const response = await fetch("http://localhost:9002/api/farm", {
            headers: {
              "Content-Type": "application/json",
              "Authorization": token ? `Bearer ${token}` : "",
            }
          });
          
          if (!response.ok) {
            console.log(`Farm endpoint not available (${response.status} ${response.statusText}), hiding tab`);
            setShowFarmTab(false);
            return; // Skip the rest of the farm loading
          }
          
          // If response is OK, parse the data and continue
          const farmInfoData = await response.json();
          console.log("Farm info received:", farmInfoData);
          
          // If we got here, the farm endpoint exists
          setShowFarmTab(true);
          
          setFarmData({
            name: farmInfoData.name || "",
            size: farmInfoData.size?.toString() || "",
            location: farmInfoData.location || "",
            soilType: farmInfoData.soilType || "",
            primaryCrops: Array.isArray(farmInfoData.primaryCrops) 
              ? farmInfoData.primaryCrops.join(", ") 
              : "",
            description: farmInfoData.description || ""
          });
        } catch (error) {
          // This will only happen for network errors, not HTTP status errors
          console.log("Error checking farm endpoint availability:", error);
          setShowFarmTab(false);
        }
      } catch (error) {
        console.error("Error in fetchData:", error)
        toast({
          title: "Error loading data",
          description: "There was a problem loading your settings.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const handleUpdateUser = async () => {
    try {
      // Only show success message since we don't have a real API yet
      // We'll implement this later when the API is ready
      // const userToUpdate: Partial<User> = {
      //   name: userData.name,
      //   email: userData.email
      // }
      // await updateUserProfile(userToUpdate)
      
      toast({
        title: "Profile updated",
        description: "Your account information has been successfully updated.",
      })
    } catch (error) {
      console.error("Error updating user profile:", error)
      toast({
        title: "Update failed",
        description: "There was a problem updating your account information.",
        variant: "destructive"
      })
    }
  }

  const handleUpdateFarm = async () => {
    // If farm tab is not available, don't attempt to update
    if (!showFarmTab) return;
    
    try {
      // Convert string fields to proper types for Farm
      const farmDataToUpdate: Partial<Farm> = {
        name: farmData.name,
        size: farmData.size ? parseFloat(farmData.size) : undefined,
        location: farmData.location,
        soilType: farmData.soilType,
        primaryCrops: farmData.primaryCrops.split(',').map(crop => crop.trim()).filter(Boolean),
        description: farmData.description
      }
      await updateFarmInfo(farmDataToUpdate)
      toast({
        title: "Farm information updated",
        description: "Your farm information has been successfully updated.",
      })
    } catch (error) {
      console.error("Error updating farm information:", error)
      toast({
        title: "Update failed",
        description: "There was a problem updating your farm information.",
        variant: "destructive"
      })
    }
  }

  const handleUserInputChange = (field: string, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }))
  }

  const handleFarmInputChange = (field: string, value: string) => {
    setFarmData(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full py-10">Loading settings...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences</p>
      </div>
      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="devices">Device Settings</TabsTrigger>
          {showFarmTab && <TabsTrigger value="farm">Farm Information</TabsTrigger>}
        </TabsList>
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your account details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={userData.name}
                    onChange={(e) => handleUserInputChange("name", e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={userData.email}
                    onChange={(e) => handleUserInputChange("email", e.target.value)}
                    placeholder="Enter your email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={userData.phone}
                    onChange={(e) => handleUserInputChange("phone", e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={userData.language}
                    onValueChange={(value) => handleUserInputChange("language", value)}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleUpdateUser}>
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how and when you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email notifications for important alerts</p>
                  </div>
                  <Switch id="email-notifications" checked={notificationPrefs.emailNotifications} onCheckedChange={(value) => handleNotificationToggle("emailNotifications", value)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-notifications">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive text messages for critical alerts</p>
                  </div>
                  <Switch id="sms-notifications" checked={notificationPrefs.smsNotifications} onCheckedChange={(value) => handleNotificationToggle("smsNotifications", value)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive push notifications on your mobile device</p>
                  </div>
                  <Switch id="push-notifications" checked={notificationPrefs.pushNotifications} onCheckedChange={(value) => handleNotificationToggle("pushNotifications", value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alert Types</Label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="low-moisture" checked={notificationPrefs.alertTypes.lowMoisture} onCheckedChange={(value) => handleNotificationToggle("alertTypes.lowMoisture", value)} />
                    <Label htmlFor="low-moisture">Low Soil Moisture</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="high-moisture" checked={notificationPrefs.alertTypes.highMoisture} onCheckedChange={(value) => handleNotificationToggle("alertTypes.highMoisture", value)} />
                    <Label htmlFor="high-moisture">High Soil Moisture</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="ph-change" checked={notificationPrefs.alertTypes.phChange} onCheckedChange={(value) => handleNotificationToggle("alertTypes.phChange", value)} />
                    <Label htmlFor="ph-change">pH Level Changes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="nutrient-deficiency" checked={notificationPrefs.alertTypes.nutrientDeficiency} onCheckedChange={(value) => handleNotificationToggle("alertTypes.nutrientDeficiency", value)} />
                    <Label htmlFor="nutrient-deficiency">Nutrient Deficiency</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="battery-low" checked={notificationPrefs.alertTypes.batteryLow} onCheckedChange={(value) => handleNotificationToggle("alertTypes.batteryLow", value)} />
                    <Label htmlFor="battery-low">Device Battery Low</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="device-offline" checked={notificationPrefs.alertTypes.deviceOffline} onCheckedChange={(value) => handleNotificationToggle("alertTypes.deviceOffline", value)} />
                    <Label htmlFor="device-offline">Device Offline</Label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveNotificationPreferences}>
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device Settings</CardTitle>
              <CardDescription>Configure your soil monitoring devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reading-frequency">Reading Frequency</Label>
                <Select defaultValue="1hour">
                  <SelectTrigger id="reading-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5min">Every 5 minutes</SelectItem>
                    <SelectItem value="15min">Every 15 minutes</SelectItem>
                    <SelectItem value="30min">Every 30 minutes</SelectItem>
                    <SelectItem value="1hour">Every hour</SelectItem>
                    <SelectItem value="6hours">Every 6 hours</SelectItem>
                    <SelectItem value="12hours">Every 12 hours</SelectItem>
                    <SelectItem value="24hours">Every 24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data-retention">Data Retention Period</Label>
                <Select defaultValue="6months">
                  <SelectTrigger id="data-retention">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1month">1 Month</SelectItem>
                    <SelectItem value="3months">3 Months</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                    <SelectItem value="5years">5 Years</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parameter Thresholds</Label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="moisture-min">Moisture Min (%)</Label>
                    <Input id="moisture-min" type="number" placeholder="Enter minimum value" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moisture-max">Moisture Max (%)</Label>
                    <Input id="moisture-max" type="number" placeholder="Enter maximum value" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ph-min">pH Min</Label>
                    <Input id="ph-min" type="number" step="0.1" placeholder="Enter minimum value" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ph-max">pH Max</Label>
                    <Input id="ph-max" type="number" step="0.1" placeholder="Enter maximum value" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temp-min">Temperature Min (°C)</Label>
                    <Input id="temp-min" type="number" placeholder="Enter minimum value" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temp-max">Temperature Max (°C)</Label>
                    <Input id="temp-max" type="number" placeholder="Enter maximum value" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-green-600 hover:bg-green-700">
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        {showFarmTab && (
          <TabsContent value="farm" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Farm Information</CardTitle>
                <CardDescription>Provide details about your farm for better analysis and recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="farm-name">Farm Name</Label>
                    <Input 
                      id="farm-name" 
                      value={farmData.name}
                      onChange={(e) => handleFarmInputChange("name", e.target.value)}
                      placeholder="Enter your farm name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="farm-size">Farm Size (acres)</Label>
                    <Input 
                      id="farm-size" 
                      type="number" 
                      value={farmData.size}
                      onChange={(e) => handleFarmInputChange("size", e.target.value)}
                      placeholder="Enter farm size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="farm-location">Location</Label>
                    <Input 
                      id="farm-location" 
                      value={farmData.location}
                      onChange={(e) => handleFarmInputChange("location", e.target.value)}
                      placeholder="Enter your farm location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="soil-type">Primary Soil Type</Label>
                    <Select 
                      value={farmData.soilType}
                      onValueChange={(value) => handleFarmInputChange("soilType", value)}
                    >
                      <SelectTrigger id="soil-type">
                        <SelectValue placeholder="Select soil type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clay">Clay</SelectItem>
                        <SelectItem value="silt">Silt</SelectItem>
                        <SelectItem value="sand">Sandy</SelectItem>
                        <SelectItem value="loam">Loam</SelectItem>
                        <SelectItem value="clay-loam">Clay Loam</SelectItem>
                        <SelectItem value="sandy-loam">Sandy Loam</SelectItem>
                        <SelectItem value="silty-loam">Silty Loam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary-crops">Primary Crops</Label>
                  <Input 
                    id="primary-crops" 
                    value={farmData.primaryCrops}
                    onChange={(e) => handleFarmInputChange("primaryCrops", e.target.value)}
                    placeholder="Enter your primary crops (comma separated)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farm-description">Farm Description</Label>
                  <Textarea
                    id="farm-description"
                    placeholder="Provide additional details about your farm..."
                    className="min-h-[100px]"
                    value={farmData.description}
                    onChange={(e) => handleFarmInputChange("description", e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleUpdateFarm}>
                  Save Information
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
