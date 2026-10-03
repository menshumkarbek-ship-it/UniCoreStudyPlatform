"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useDictionary } from "@/i18n/locale-provider";
import { api, formatDateTime } from "@/lib/client";

export type Notification = { id: number; title: string; detail: string; href: string; readAt: string | null; createdAt: string };

const notificationsChanged = "unicore:notifications-changed";

/** The signed-in user's notifications. Every user of this hook (the header bell, the dashboard card) reloads when another one marks something read. */
export function useNotifications() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    api<{ notifications: Notification[]; unreadCount: number }>("/api/notifications").then((result) => {
      setItems(result.notifications);
      setUnreadCount(result.unreadCount);
      setLoaded(true);
    }, () => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
    // Poll while the tab is visible, and catch up as soon as the user comes back to it.
    const refresh = () => { if (document.visibilityState === "visible") load(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener(notificationsChanged, load);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(notificationsChanged, load);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const markRead = async (json: { id: number } | { all: true }) => {
    await api("/api/notifications", { method: "PATCH", json }).catch(() => undefined);
    window.dispatchEvent(new Event(notificationsChanged));
  };

  const openItem = async (item: Notification) => {
    if (!item.readAt) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      setUnreadCount((count) => Math.max(0, count - 1));
      await markRead({ id: item.id });
    }
    router.push(item.href);
  };

  const markAllRead = async () => {
    setItems((current) => current.map((entry) => ({ ...entry, readAt: entry.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    await markRead({ all: true });
  };

  return { items, unreadCount, loaded, load, openItem, markAllRead };
}

export default function NotificationDropdown() {
  const dict = useDictionary();
  const [open, setOpen] = useState(false);
  const { items, unreadCount, load, openItem, markAllRead } = useNotifications();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button type="button" aria-label={dict.common.notifications.openNotifications} aria-expanded={open} onClick={() => { setOpen(!open); if (!open) load(); }} className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft hover:text-accent">
        <Bell size={18} />
        {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[9px] font-medium text-canvas ring-2 ring-surface">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[11px] font-medium text-ink">{dict.common.notifications.title}</p>
            {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"><CheckCheck size={14} /> {dict.common.notifications.markAllRead}</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? <p className="px-4 py-8 text-center text-xs text-muted">{dict.wk.noNotifications}</p> : items.map((item) => (
              <button type="button" key={item.id} onClick={() => { setOpen(false); void openItem(item); }} className={`block w-full border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-surface-muted ${item.readAt ? "" : "bg-mint/30 dark:bg-surface-muted"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  {!item.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-periwinkle" />}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.detail}</p>
                <p className="mt-1 text-[11px] text-faint">{formatDateTime(item.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
