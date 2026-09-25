"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useDictionary } from "@/i18n/locale-provider";

type Notification = { readAt: string | null };

export default function NotificationDropdown() {
  const [hasUnread, setHasUnread] = useState(false);
  const dict = useDictionary();

  useEffect(() => {
    const loadUnreadState = async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;
      const result = await response.json() as { notifications?: Notification[] };
      setHasUnread((result.notifications ?? []).some((notification) => !notification.readAt));
    };
    void loadUnreadState();
    const refresh = window.setInterval(() => void loadUnreadState(), 30000);
    return () => window.clearInterval(refresh);
  }, []);

  const markAllRead = async () => {
    if (!hasUnread) return;
    setHasUnread(false);
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
  };

  return <button type="button" aria-label={dict.common.notifications.openNotifications} title="Mark notifications as read" onClick={() => void markAllRead()} className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-cyan-50 hover:text-cyan-700"><Bell size={18} />{hasUnread && <span aria-label="Unread notifications" className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}</button>;
}
