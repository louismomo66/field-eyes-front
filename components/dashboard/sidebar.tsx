import Link from "next/link"
import { useState, useEffect } from "react"
import { Home, Cpu, FileText, Settings, Menu, LogOut } from "lucide-react"

interface SidebarProps {
  currentPath: string
  className?: string
  onCollapse?: (collapsed: boolean) => void
}

export function Sidebar({ currentPath, className, onCollapse }: SidebarProps) {
  const [menuCollapsed, setMenuCollapsed] = useState(false);

  useEffect(() => {
    onCollapse?.(menuCollapsed);
  }, [menuCollapsed, onCollapse]);

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
  ]

  return (
    <aside 
      className={`fixed hidden h-screen md:block transition-all duration-300 ease-in-out ${
        menuCollapsed ? 'w-20' : 'w-64'
      } ${className || ''}`}
      style={{
        background: 'linear-gradient(to bottom, #052816 0%, #084023 100%)',
        boxShadow: '2px 0 15px rgba(0,0,0,0.15)',
        borderRight: '1px solid rgba(0,0,0,0.1)',
        zIndex: 10
      }}
    >
      <div className="flex h-20 items-center justify-between border-b border-opacity-10 px-6" style={{
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(5px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div className={`${menuCollapsed ? 'w-full flex justify-center' : ''}`}>
          <img 
            src="/logo.png" 
            alt="FieldEyes Logo" 
            className="h-12 w-auto object-contain"
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))' }}
          />
        </div>
        
        {!menuCollapsed && (
          <p className="text-xs text-white/90 mt-2 text-center font-light tracking-wider leading-tight">
            Sensors for Precision Agriculture
          </p>
        )}
        
        <button 
          onClick={() => setMenuCollapsed(!menuCollapsed)}
          className="text-green-500 bg-white/10 rounded-lg p-2 transition-all duration-200 hover:bg-white/20"
          style={{ boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
        >
          <Menu className="h-4 w-4" />
        </button>
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
                {!menuCollapsed && <span>{route.label}</span>}
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
            window.location.href = "/login";
          }}
          className="w-full flex items-center justify-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-200 hover:bg-white/10 transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.08)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}
        >
          <LogOut className="h-6 w-6 text-green-300" />
          {!menuCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
} 