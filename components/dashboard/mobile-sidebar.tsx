import { useState, useEffect } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Home, Cpu, FileText, Settings, Menu, X, LogOut, Shield } from "lucide-react";
import { isAdmin } from "@/lib/client-auth";

// Helper function for asset paths
const assetPath = (path: string) => `/app${path.startsWith('/') ? path : `/${path}`}`;

interface MobileSidebarProps {
  currentPath: string;
  className?: string;
}

export function MobileSidebar({ currentPath, className }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  
  // Check if user is admin when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const isUserAdmin = isAdmin();
        setUserIsAdmin(isUserAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    }
  }, [])

  const routes = [
    {
      label: "Home",
      icon: Home,
      href: "/dashboard",
    },
    {
      label: "Devices",
      icon: Cpu,
      href: "/dashboard/devices",
    },
    {
      label: "Reports",
      icon: FileText,
      href: "/dashboard/reports/generate",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/dashboard/settings",
    },
    // Show Admin link only if user is admin
    ...(userIsAdmin ? [{
      label: "Admin",
      icon: Shield,
      href: "/dashboard/admin",
    }] : []),
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`md:hidden ${className || ''}`}
          style={{
            color: '#62A800',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '8px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          }}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="p-0 w-[300px]"
        style={{
          background: 'linear-gradient(to bottom, #052816 0%, #084023 100%)',
          boxShadow: '2px 0 15px rgba(0,0,0,0.15)',
        }}
      >
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6" style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(5px)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div className="flex items-center gap-2">
            <img 
              src={assetPath("/logo.png")} 
              alt="FieldEyes Logo" 
              className="h-12 w-auto object-contain"
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))' }}
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/70 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <div className="py-6 px-3">
          <nav className="grid gap-3">
            {routes.map((route) => {
              const Icon = route.icon
              const isActive = currentPath === route.href
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-4 rounded-lg px-4 py-3 text-base font-medium relative overflow-hidden
                    ${isActive 
                      ? 'bg-green-600/90 text-white shadow-lg shadow-green-600/30' 
                      : 'text-gray-200 hover:bg-white/10'
                    } transition-all duration-200`}
                  style={{
                    margin: '0 0.5rem'
                  }}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 h-full w-1" style={{
                      background: 'linear-gradient(to bottom, #62A800, #4A8000)'
                    }}></div>
                  )}
                  <Icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-green-300'}`} />
                  <span>{route.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="absolute bottom-0 w-full border-t border-white/10 p-4" style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.1), transparent)'
        }}>
          <button 
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/app/login";
            }}
            className="w-full flex items-center justify-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-200 hover:bg-white/10 transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.08)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          >
            <LogOut className="h-6 w-6 text-green-300" />
            <span>Logout</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
} 