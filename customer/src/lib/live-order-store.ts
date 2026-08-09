import { useSyncExternalStore } from "react";

export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "completed";
export type PaymentStatus = "paid" | "unpaid" | "refunded" | "partial";

export type OrderItem = {
  name: string;
  qty: number;
  price: number;
  note?: string;
};

export type LiveOrder = {
  id: string;
  table: string;
  customer: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment: PaymentStatus;
  placedAt: string;
  waiter?: string;
  channel?: "QR" | "Counter" | "Waiter";
  createdAt: string;
};

export type LiveServiceRequest = {
  id: string;
  table_number: string;
  service_type: string;
  label: string;
  status: "pending" | "dispatched" | "accepted" | "rejected" | "completed";
  created_at: string;
};

const ORDERS_KEY = "aura_dine_live_orders_v2";
const SERVICES_KEY = "aura_dine_service_requests_v2";

const initialOrders: LiveOrder[] = [];

let cachedOrders: LiveOrder[] = (() => {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(ORDERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return initialOrders;
})();

let cachedServices: LiveServiceRequest[] = (() => {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SERVICES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
})();

const listeners = new Set<() => void>();
const serviceListeners = new Set<(req: LiveServiceRequest) => void>();
const orderAddListeners = new Set<(order: LiveOrder) => void>();

let channel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  channel = new BroadcastChannel("aura_dine_sync_channel");
  channel.onmessage = (event) => {
    if (event.data?.type === "ORDERS_UPDATE") {
      cachedOrders = event.data.orders;
      try {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(cachedOrders));
      } catch {}
      listeners.forEach((l) => l());
      if (event.data.newOrder) {
        orderAddListeners.forEach((l) => l(event.data.newOrder));
      }
    } else if (event.data?.type === "SERVICES_UPDATE") {
      cachedServices = event.data.services;
      try {
        localStorage.setItem(SERVICES_KEY, JSON.stringify(cachedServices));
      } catch {}
      listeners.forEach((l) => l());
      if (event.data.newReq) {
        serviceListeners.forEach((l) => l(event.data.newReq));
      }
    }
  };
}

function persistOrders(newOrder?: LiveOrder) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(cachedOrders));
  } catch {}
  channel?.postMessage({ type: "ORDERS_UPDATE", orders: cachedOrders, newOrder });
  listeners.forEach((l) => l());
}

function persistServices(newReq?: LiveServiceRequest) {
  try {
    localStorage.setItem(SERVICES_KEY, JSON.stringify(cachedServices));
  } catch {}
  channel?.postMessage({ type: "SERVICES_UPDATE", services: cachedServices, newReq });
  listeners.forEach((l) => l());
}

export const liveOrderStore = {
  resetForNewSession() {
    cachedOrders = [];
    cachedServices = [];
    try {
      localStorage.removeItem(ORDERS_KEY);
      localStorage.removeItem(SERVICES_KEY);
    } catch {}
    listeners.forEach((l) => l());
  },
  getOrders(): LiveOrder[] {
    return cachedOrders;
  },

  getOrdersForTable(tableStr: string): LiveOrder[] {
    const normDigits = tableStr.replace(/\D/g, "");
    const normStr = tableStr.toLowerCase().replace(/\s+/g, "");
    return cachedOrders.filter((o) => {
      const oDigits = o.table.replace(/\D/g, "");
      const oStr = o.table.toLowerCase().replace(/\s+/g, "");
      if (normDigits && oDigits) {
        return normDigits === oDigits;
      }
      return normStr === oStr;
    });
  },

  addOrder(o: Omit<LiveOrder, "id" | "placedAt" | "createdAt"> & { id?: string }): LiveOrder {
    const newOrd: LiveOrder = {
      ...o,
      id: o.id || `#ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      placedAt: "Just now",
      createdAt: new Date().toISOString(),
    };
    cachedOrders = [newOrd, ...cachedOrders];
    persistOrders(newOrd);
    return newOrd;
  },

  updateOrderStatus(orderId: string, nextStatus: OrderStatus): boolean {
    let updated = false;
    cachedOrders = cachedOrders.map((o) => {
      if (o.id === orderId || o.id.replace("#", "") === orderId.replace("#", "")) {
        updated = true;
        return { ...o, status: nextStatus };
      }
      return o;
    });
    if (updated) {
      persistOrders();
    }
    return updated;
  },

  getServiceRequests(): LiveServiceRequest[] {
    return cachedServices;
  },

  addServiceRequest(req: Omit<LiveServiceRequest, "id" | "created_at" | "status">): LiveServiceRequest {
    const newReq: LiveServiceRequest = {
      ...req,
      id: `srv_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    cachedServices = [newReq, ...cachedServices];
    persistServices(newReq);
    serviceListeners.forEach((l) => l(newReq));
    return newReq;
  },

  updateServiceRequestStatus(id: string, status: "pending" | "dispatched" | "accepted" | "rejected" | "completed"): boolean {
    let updated = false;
    cachedServices = cachedServices.map((s) => {
      if (s.id === id) {
        updated = true;
        return { ...s, status };
      }
      return s;
    });
    if (updated) {
      persistServices();
    }
    return updated;
  },

  onNewOrder(cb: (order: LiveOrder) => void) {
    orderAddListeners.add(cb);
    return () => orderAddListeners.delete(cb);
  },

  onNewServiceRequest(cb: (req: LiveServiceRequest) => void) {
    serviceListeners.add(cb);
    return () => serviceListeners.delete(cb);
  },
};

const SERVER_ORDERS: LiveOrder[] = [];
const SERVER_SERVICES: LiveServiceRequest[] = [];

export function useLiveOrders(): LiveOrder[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => liveOrderStore.getOrders(),
    () => SERVER_ORDERS
  );
}

export function useLiveServiceRequests(): LiveServiceRequest[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => liveOrderStore.getServiceRequests(),
    () => SERVER_SERVICES
  );
}
