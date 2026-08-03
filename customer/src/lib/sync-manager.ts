// Enterprise-grade Offline Synchronization & Network Recovery Manager
import { useSyncExternalStore } from "react";
import { supabase, isSupabaseConfigured, type DbOrder, type ServiceRequest, mapRowToDbOrder } from "./supabase";
import { toast } from "sonner";

export type OfflineAction =
  | { type: "CREATE_ORDER"; payload: Omit<DbOrder, "created_at">; timestamp: string }
  | { type: "SERVICE_REQUEST"; payload: { tableNumber: string; serviceType: string; label: string; customerName?: string }; timestamp: string }
  | { type: "UPDATE_PAYMENT"; payload: { orderId: string; paymentMethod: string }; timestamp: string };

const OFFLINE_QUEUE_KEY = "scandine_offline_queue_v1";

let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
const listeners = new Set<() => void>();

function getQueue(): OfflineAction[] {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } catch {}
  return [];
}

function saveQueue(queue: OfflineAction[]) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {}
}

const emitNetworkChange = () => {
  listeners.forEach((cb) => cb());
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline = true;
    emitNetworkChange();
    toast.success("📶 Reconnected! Synchronizing offline data with Supabase...");
    syncManager.flushOfflineQueue();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
    emitNetworkChange();
    toast.warning("📡 You are offline. Data is saved locally and will sync when reconnected.");
  });
}

export const syncManager = {
  isNetworkOnline(): boolean {
    return isOnline;
  },

  enqueueAction(action: OfflineAction) {
    const queue = getQueue();
    queue.push(action);
    saveQueue(queue);
    if (isOnline) {
      this.flushOfflineQueue();
    }
  },

  async flushOfflineQueue() {
    if (!isOnline || !isSupabaseConfigured()) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    const remainingQueue: OfflineAction[] = [];

    for (const action of queue) {
      try {
        if (action.type === "CREATE_ORDER") {
          const order = action.payload;
          const tblNum = parseInt(String(order.table_number).replace(/\D/g, ""), 10) || 1;
          const orderIdStr = order.order_number || order.id;

          // Deduplication: Check if order already exists in Supabase
          const { data: existing } = await supabase
            .from("sd_orders")
            .select("id")
            .or(`id.eq.${order.id},order_id.eq.${orderIdStr}`)
            .maybeSingle();

          if (!existing) {
            const dbPayload = {
              id: order.id,
              order_id: orderIdStr,
              customer: order.customer_name || `Table ${tblNum} Customer`,
              table_number: tblNum,
              item: order.items.map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
              total: Number(order.total),
              status: order.status || "pending",
              payment: order.payment_status === "paid" ? "paid" : "unpaid",
              order_time: action.timestamp,
              created_at: action.timestamp,
            };
            await supabase.from("sd_orders").insert([dbPayload]);
          }
        } else if (action.type === "SERVICE_REQUEST") {
          const { tableNumber, serviceType, label } = action.payload;
          const reqType = label || serviceType;
          // Deduplication: check if active pending request exists in notifications table
          const { data: existingSrv } = await supabase
            .from("sd_notifications")
            .select("id")
            .eq("table_number", tableNumber)
            .eq("request_type", reqType)
            .ilike("status", "pending")
            .maybeSingle();

          if (!existingSrv) {
            await supabase.from("sd_notifications").insert([
              {
                table_number: tableNumber,
                request_type: reqType,
                status: "Pending",
                created_at: action.timestamp,
                title: `${reqType} - Table ${tableNumber}`,
                message: `Service request: ${reqType} for Table ${tableNumber}`,
                type: "service_request",
                read: false,
              },
            ]);
          }
        } else if (action.type === "UPDATE_PAYMENT") {
          const { orderId } = action.payload;
          await supabase
            .from("sd_orders")
            .update({ payment: "paid" })
            .or(`id.eq.${orderId},order_id.eq.${orderId}`);
        }
      } catch (err) {
        console.warn("Failed to sync queued action:", action, err);
        remainingQueue.push(action);
      }
    }

    saveQueue(remainingQueue);
  },

  /**
   * Sync active order statuses from Supabase into local cache
   */
  async syncSupabaseOrdersToLocal(tableNumber: string) {
    if (!isOnline || !isSupabaseConfigured()) return;
    try {
      const tblNum = parseInt(String(tableNumber).replace(/\D/g, ""), 10) || 1;
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("table_number", tblNum)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mappedOrders = data.map(mapRowToDbOrder);
        const MOCK_ORDERS_KEY = "aura_dine_orders";
        try {
          const existingRaw = localStorage.getItem(MOCK_ORDERS_KEY);
          const existing: DbOrder[] = existingRaw ? JSON.parse(existingRaw) : [];
          
          // Merge with deduplication
          const merged = [...mappedOrders];
          existing.forEach((e) => {
            if (!merged.some((m) => m.id === e.id || m.order_number === e.order_number)) {
              merged.push(e);
            }
          });
          localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(merged));
        } catch {}
      }
    } catch (err) {
      console.warn("Error syncing Supabase orders to local:", err);
    }
  },
};

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => isOnline,
    () => true
  );
}
