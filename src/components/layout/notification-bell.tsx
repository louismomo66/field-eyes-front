"use client"

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, XCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Notification as NotificationType } from "@/types"; // Assuming this is src/types/index.ts
import { cn } from "@/lib/utils";

// Placeholder API function - replace with your actual API call
async function fetchNotifications(): Promise<NotificationType[]> {
  // Simulate API call
  // In a real app, fetch from your backend: GET /api/notifications
  // Ensure your backend returns notifications sorted by time, newest first
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "1",
          type: "info",
          message: "New device 'Farm Sensor Alpha' added successfully.",
          time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          read: false,
        },
        {
          id: "2",
          type: "warning",
          message: "Battery low on device 'Greenhouse Sensor Gamma'.",
          time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          read: false,
        },
        {
          id: "3",
          type: "error",
          message: "Failed to fetch readings from 'Weather Station Delta'.",
          time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
          read: true,
        },
        {
          id: "4",
          type: "success",
          message: "Report 'Soil Analysis Q2' generated successfully.",
          time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          read: true,
        },
         {
          id: "5",
          type: "info",
          message: "System maintenance scheduled for tomorrow at 2 AM.",
          time: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // 30 hours ago
          read: false,
        },
      ]);
    }, 500);
  });
}

async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  // Simulate API call: PUT /api/notifications/:id/read
  console.log(`Marking notification ${notificationId} as read`);
  return new Promise(resolve => setTimeout(() => resolve(true), 300));
}

async function markAllNotificationsAsRead(): Promise<boolean> {
  // Simulate API call: POST /api/notifications/mark-all-as-read
  console.log("Marking all notifications as read");
  return new Promise(resolve => setTimeout(() => resolve(true), 300));
}

const NotificationIcon = ({ type }: { type: NotificationType["type"] }) => {
  switch (type) {
    case "info":
      return <Info className="h-5 w-5 text-blue-500" />;
    case "success":
      return <CheckCheck className="h-5 w-5 text-green-500" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "error":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      const fetchedNotifications = await fetchNotifications();
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter(n => !n.read).length);
    };
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const success = await markNotificationAsRead(id);
    if (success) {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
    }
  };

  const handleMarkAllAsRead = async () => {
    const success = await markAllNotificationsAsRead();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative notification-center h-10 w-10 rounded-md border bg-background text-card-foreground shadow-sm hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent ref={popoverContentRef} className="w-80 p-0 z-50" align="end">
        <div className="p-4">
          <h4 className="font-medium leading-none">Notifications</h4>
        </div>
        <Separator />
        {notifications.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No new notifications.</p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-1 p-2">
              {Array.isArray(notifications) && notifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-muted/50",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className="mt-1 flex-shrink-0">
                    <NotificationIcon type={notification.type} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-snug text-card-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(notification.time)}
                    </p>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent popover from closing if it's not desired
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        {Array.isArray(notifications) && notifications.some(n => !n.read) && (
          <>
            <Separator />
            <div className="p-2 text-center">
              <Button
                variant="link"
                size="sm"
                className="text-primary"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
} 