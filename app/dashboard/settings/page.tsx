"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsPage() {
  const { toast } = useToast()

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been successfully updated.",
    })
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
          <TabsTrigger value="farm">Farm Information</TabsTrigger>
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
                  <Input id="name" defaultValue="John Farmer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue="john.farmer@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="+1 (555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select defaultValue="en">
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
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
                Save Changes
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
                Update Password
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
                  <Switch id="email-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-notifications">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive text messages for critical alerts</p>
                  </div>
                  <Switch id="sms-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive push notifications on your mobile device</p>
                  </div>
                  <Switch id="push-notifications" defaultChecked />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alert Types</Label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="low-moisture" defaultChecked />
                    <Label htmlFor="low-moisture">Low Soil Moisture</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="high-moisture" defaultChecked />
                    <Label htmlFor="high-moisture">High Soil Moisture</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="ph-change" defaultChecked />
                    <Label htmlFor="ph-change">pH Level Changes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="nutrient-deficiency" defaultChecked />
                    <Label htmlFor="nutrient-deficiency">Nutrient Deficiency</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="battery-low" defaultChecked />
                    <Label htmlFor="battery-low">Device Battery Low</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="device-offline" defaultChecked />
                    <Label htmlFor="device-offline">Device Offline</Label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
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
                <Select defaultValue="30min">
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
                <Select defaultValue="1year">
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
                    <Input id="moisture-min" type="number" defaultValue="30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moisture-max">Moisture Max (%)</Label>
                    <Input id="moisture-max" type="number" defaultValue="60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ph-min">pH Min</Label>
                    <Input id="ph-min" type="number" defaultValue="6.0" step="0.1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ph-max">pH Max</Label>
                    <Input id="ph-max" type="number" defaultValue="7.0" step="0.1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temp-min">Temperature Min (°C)</Label>
                    <Input id="temp-min" type="number" defaultValue="10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temp-max">Temperature Max (°C)</Label>
                    <Input id="temp-max" type="number" defaultValue="35" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
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
                  <Input id="farm-name" defaultValue="Green Valley Farm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farm-size">Farm Size (acres)</Label>
                  <Input id="farm-size" type="number" defaultValue="120" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farm-location">Location</Label>
                  <Input id="farm-location" defaultValue="Midwest, USA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="soil-type">Primary Soil Type</Label>
                  <Select defaultValue="loam">
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
                <Input id="primary-crops" defaultValue="Corn, Soybeans, Wheat" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farm-description">Farm Description</Label>
                <Textarea
                  id="farm-description"
                  placeholder="Provide additional details about your farm..."
                  className="min-h-[100px]"
                  defaultValue="Family-owned farm operating since 1985. We practice sustainable farming methods and crop rotation."
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
                Save Information
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
