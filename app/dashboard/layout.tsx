"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/dashboard/sidebar"
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar"
import { getDevice } from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(null)
  const [selectedDeviceSerial, setSelectedDeviceSerial] = useState<string | null>(null)
  
  // Function to handle logout
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
    }
    router.push("/login")
  }
  
  // Global error handler for unauthorized errors
  useEffect(() => {
    // Create a global error handler to catch unauthorized errors
    const handleGlobalErrors = (event: ErrorEvent) => {
      if (
        event.error?.message?.includes("unauthorized") || 
        event.error?.message?.includes("invalid or missing token")
      ) {
        console.log("Unauthorized error detected, redirecting to login")
        handleLogout()
      }
    }

    // Handle custom auth_error events from our API
    const handleAuthError = (event: CustomEvent) => {
      console.log("Auth error event received:", event.detail)
      handleLogout()
    }

    // Add the event listeners
    window.addEventListener("error", handleGlobalErrors)
    window.addEventListener("auth_error", handleAuthError as EventListener)

    // Cleanup
    return () => {
      window.removeEventListener("error", handleGlobalErrors)
      window.removeEventListener("auth_error", handleAuthError as EventListener)
    }
  }, [])

  // Update the useEffect that handles device navigation 
  useEffect(() => {
    // Extract device ID from path if on a device page
    const match = pathname.match(/\/dashboard\/devices\/([^\/]+)/)
    
    if (match) {
      const deviceId = match[1]
      setSelectedDeviceId(deviceId)
      
      // Fetch device name asynchronously
      const fetchDeviceName = async () => {
        try {
          // Get device details to show in notifications
          const device = await getDevice(deviceId)
          if (device) {
            setSelectedDeviceName(device.name || device.serial_number)
            setSelectedDeviceSerial(device.serial_number)
          }
        } catch (error) {
          console.error("Error fetching device name:", error)
        }
      }
      
      fetchDeviceName()
    } else {
      // Reset selected device if not on a device page
      setSelectedDeviceId(null)
      setSelectedDeviceName(null)
      setSelectedDeviceSerial(null)
    }
  }, [pathname])

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <Sidebar 
        currentPath={pathname} 
        className="sidebar print:hidden" 
        onCollapse={setIsSidebarCollapsed}
      />

      {/* Main content area */}
      <div 
        className={`flex flex-col w-full transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 print:hidden">
          {/* Mobile sidebar */}
          <MobileSidebar currentPath={pathname} className="mobile-sidebar" />

          <div className="flex flex-1 items-center justify-end gap-4">
            {/* User Profile Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative user-profile hover:bg-gray-100"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
