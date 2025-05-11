import Link from "next/link"
import { Home, Users, Map, PieChart, Settings } from "lucide-react"

interface SidebarProps {
  currentPath: string
}

export function Sidebar({ currentPath }: SidebarProps) {
  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
    },
    {
      href: "/dashboard/devices",
      label: "Devices",
      icon: Users,
    },
    {
      href: "/dashboard/map",
      label: "Map",
      icon: Map,
    },
    {
      href: "/dashboard/reports",
      label: "Reports",
      icon: PieChart,
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
    },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-background md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link className="flex items-center gap-2 font-semibold" href="#">
          <span className="font-bold text-xl">SoilSense</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-2">
          {routes.map((route) => {
            const Icon = route.icon
            const isActive = currentPath === route.href
            return (
              <Link
                key={route.href}
                href={route.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {route.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="border-t p-4">
        <div className="flex items-center gap-4">
          <img src="/placeholder-user.jpg" width="40" height="40" className="rounded-full border" alt="Avatar" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">John Farmer</span>
            <span className="text-xs text-muted-foreground">john.farmer@example.com</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
