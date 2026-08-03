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

const NOTIFS_STORAGE_KEY = "aura_dine_notifications";

let notifList: AppNotification[] = ((): AppNotification[] => {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(NOTIFS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    }
  } catch {}
  return initialNotifications.map((n) => ({
    ...n,
    read: false,
    type: n.type as NotificationType,
    category: n.type === "offer" ? "offers" : "orders",
    createdAt: new Date().toISOString(),
  }));
})();

const listeners = new Set<() => void>();
const emit = () => {
  try {
    localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(notifList));
  } catch {}
  listeners.forEach((l) => l());
};

export const notificationStore = {
  getNotifications(): AppNotification[] {
    return notifList;
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
