import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { notifications as initialNotifications } from "./mock-data";

export type NotificationType = "success" | "info" | "offer" | "warning" | "error";

export type AppNotification = {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: NotificationType;
  read: boolean;
  category?: "orders" | "services" | "offers" | "general";
  createdAt: string;
};

const getNotifsStorageKey = () => {
  try {
    if (typeof window !== "undefined") {
      const rawCurrent = localStorage.getItem("scandine_current_customer");
      if (rawCurrent) {
        const current = JSON.parse(rawCurrent);
        if (current?.sessionId) {
          return `scandine_notifications_${current.sessionId}`;
        }
      }
    }
  } catch {}
  return "scandine_notifications_guest";
};

let currentKey = getNotifsStorageKey();

let notifList: AppNotification[] = ((): AppNotification[] => {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(currentKey);
      if (stored) return JSON.parse(stored);
    }
  } catch {}
  return [];
})();

const listeners = new Set<() => void>();
const emit = () => {
  try {
    currentKey = getNotifsStorageKey();
    localStorage.setItem(currentKey, JSON.stringify(notifList));
  } catch {}
  listeners.forEach((l) => l());
};

export const notificationStore = {
  getNotifications(): AppNotification[] {
    const key = getNotifsStorageKey();
    if (key !== currentKey) {
      currentKey = key;
      try {
        const stored = localStorage.getItem(currentKey);
        notifList = stored ? JSON.parse(stored) : [];
      } catch {
        notifList = [];
      }
    }
    return notifList;
  },
  resetForNewSession(sessionId: string) {
    notifList = [];
    currentKey = `scandine_notifications_${sessionId}`;
    try {
      localStorage.setItem(currentKey, JSON.stringify([]));
    } catch {}
    listeners.forEach((l) => l());
  },
  addNotification(n: Omit<AppNotification, "id" | "time" | "read" | "createdAt"> & { id?: string }) {
    const item: AppNotification = {
      id: n.id || `notif_${Date.now()}`,
      title: n.title,
      desc: n.desc,
      type: n.type,
      category: n.category || "general",
      time: "just now",
      read: false,
      createdAt: new Date().toISOString(),
    };

    notifList = [item, ...notifList];
    emit();

    // Trigger toast notification pop-up
    if (n.type === "success") {
      toast.success(n.title, { description: n.desc });
    } else if (n.type === "warning") {
      toast.warning(n.title, { description: n.desc });
    } else if (n.type === "error") {
      toast.error(n.title, { description: n.desc });
    } else {
      toast.info(n.title, { description: n.desc });
    }
  },
  markAsRead(id: string) {
    notifList = notifList.map((n) => (n.id === id ? { ...n, read: true } : n));
    emit();
  },
  markAllAsRead() {
    notifList = notifList.map((n) => ({ ...n, read: true }));
    emit();
  },
  clearAll() {
    notifList = [];
    emit();
  },
  getUnreadCount(): number {
    return notifList.filter((n) => !n.read).length;
  },
};

const SERVER_NOTIFS: AppNotification[] = [];

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => notificationStore.getNotifications(),
    () => SERVER_NOTIFS
  );
}

export function useUnreadNotifCount(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => notificationStore.getUnreadCount(),
    () => notificationStore.getUnreadCount()
  );
}
