import { createClient } from "@supabase/supabase-js";

function safeEnqueueAction(action: any) {
  import("./sync-manager")
    .then(({ syncManager }) => {
      syncManager.enqueueAction(action);
    })
    .catch(() => {});
}

export type OrderStatus = "pending" | "received" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";

export type DbOrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  note?: string;
  image?: string;
  payment_method?: string;
  payment_category?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  method?: string;
  category?: string;
};

export type DbOrder = {
  id: string;
  order_id?: string;
  order_number: string;
  table_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  session_id?: string;
  items: DbOrderItem[];
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  status: OrderStatus;
  payment_status: "unpaid" | "paid";
  payment_method?: string;
  payment_category?: string;
  created_at: string;
  updated_at?: string;
};

export type ServiceRequest = {
  id: string;
  table_number: string;
  customer_name?: string;
  service_type: string;
  label: string;
  status: "pending" | "dispatched" | "accepted" | "rejected" | "completed";
  created_at: string;
};

export type DbMenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  category_name?: string;
  category_id?: string;
  image: string;
  veg: boolean;
  available: boolean;
  prepTime?: number;
};

const DEFAULT_SUPABASE_URL = "https://nyhnkftlkigoliyogwvp.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/^['"]|['"]$/g, "").trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").replace(/^['"]|['"]$/g, "").trim();

const envUrl = (rawUrl && !rawUrl.includes("your-supabase-project") && !rawUrl.includes("placeholder")) ? rawUrl : DEFAULT_SUPABASE_URL;
const envKey = (rawKey && !rawKey.includes("your-supabase-anon-key") && !rawKey.includes("placeholder")) ? rawKey : DEFAULT_SUPABASE_ANON_KEY;

export const supabaseUrl = envUrl;
export const supabaseAnonKey = envKey;

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);

export function isValidId(id?: any): boolean {
  if (!id || typeof id !== "string") return false;
  const trimmed = id.trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "[object Object]" ||
    trimmed === "0" ||
    trimmed.startsWith("undefined") ||
    trimmed.startsWith("null")
  ) {
    return false;
  }
  return true;
}

export const getSessionIdHeader = (): string => {
  try {
    if (typeof window !== "undefined") {
      const rawCurrent = localStorage.getItem("scandine_current_customer");
      if (rawCurrent) {
        const current = JSON.parse(rawCurrent);
        if (current?.sessionId) return String(current.sessionId).trim();
      }
    }
  } catch { }
  return "";
};

declare global {
  // eslint-disable-next-line no-var
  var __scandine_supabase_client__: ReturnType<typeof createClient> | undefined;
}

export const supabase =
  globalThis.__scandine_supabase_client__ ??
  (globalThis.__scandine_supabase_client__ = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: (url, options = {}) => {
        const sessionId = getSessionIdHeader();
        const headers = new Headers(options.headers || {});
        if (sessionId) {
          headers.set("x-session-id", sessionId);
        }
        return fetch(url, { ...options, headers });
      },
    },
  }));


const getLocalOrdersKey = () => {
  try {
    if (typeof window !== "undefined") {
      const rawCurrent = localStorage.getItem("scandine_current_customer");
      if (rawCurrent) {
        const current = JSON.parse(rawCurrent);
        if (current?.sessionId) {
          return `aura_dine_orders_${current.sessionId}`;
        }
      }
    }
  } catch { }
  return "aura_dine_orders_guest";
};

function getLocalOrders(): DbOrder[] {
  try {
    const key = getLocalOrdersKey();
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalOrders(orders: DbOrder[]) {
  try {
    const key = getLocalOrdersKey();
    localStorage.setItem(key, JSON.stringify(orders));
  } catch (err) {
    console.error("Failed to save local orders:", err);
  }
}

const MOCK_SERVICES_KEY = "aura_dine_service_requests_v2";

function getLocalServices(): ServiceRequest[] {
  try {
    const raw = localStorage.getItem(MOCK_SERVICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalServices(services: ServiceRequest[]) {
  try {
    localStorage.setItem(MOCK_SERVICES_KEY, JSON.stringify(services));
  } catch (err) {
    console.error("Failed to save local services:", err);
  }
}

// Helper to convert database row to DbOrder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRowToDbOrder(row: any): DbOrder {
  const itemsArr: DbOrderItem[] = Array.isArray(row.item)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? row.item.map((it: any) => ({
      id: it.id || it.name,
      name: it.name || "Item",
      price: Number(it.price || 0),
      qty: Number(it.qty || 1),
    }))
    : Array.isArray(row.items)
      ? row.items
      : [];

  const firstItem = itemsArr[0] || {};
  const rawPayment = String(row.payment || row.payment_status || "").trim().toLowerCase();
  const isPaid = rawPayment === "paid" || rawPayment === "completed";
  const rawMethod = String(row.payment_method || row.method || firstItem.payment_method || firstItem.method || "").trim();
  const rawCategory = String(row.payment_category || row.category || firstItem.payment_category || firstItem.category || "").trim().toLowerCase();
  const rzpId = row.razorpay_payment_id || row.razorpay_order_id || firstItem.razorpay_payment_id || firstItem.razorpay_order_id;

  let resolvedMethod = isPaid && rawMethod && rawMethod !== "—" ? rawMethod : undefined;
  if (isPaid && !resolvedMethod && (rawCategory === "upi" || rawMethod.toLowerCase().includes("upi") || rzpId)) {
    resolvedMethod = "UPI";
  } else if (isPaid && !resolvedMethod && (rawCategory === "cash" || rawMethod.toLowerCase().includes("cash"))) {
    resolvedMethod = "Cash";
  }

  return {
    id: row.id || row.order_id,
    order_number: row.order_id || row.order_number || row.id,
    table_number: String(row.table_number || "1"),
    customer_name: row.customer || row.customer_name || "Guest",
    customer_phone: row.phone || row.customer_phone || row.mobile || undefined,
    session_id: row.session_id || undefined,
    items: itemsArr,
    subtotal: Number(row.total || 0),
    discount: 0,
    gst: 0,
    total: Number(row.total || 0),
    status: (row.status || "pending") as OrderStatus,
    payment_status: isPaid ? "paid" : "unpaid",
    payment_method: resolvedMethod,
    payment_category: isPaid ? (rawCategory || (resolvedMethod ? (resolvedMethod.toLowerCase().includes("upi") ? "upi" : "cash") : undefined)) : undefined,
    created_at: row.created_at || row.order_time || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export type CanonicalOrderStatus = "pending" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";

export function normalizeOrderStatus(rawStatus?: string | null): CanonicalOrderStatus {
  if (!rawStatus) return "pending";
  const s = String(rawStatus).toLowerCase().trim();
  if (s === "pending" || s === "placed" || s === "new" || s === "received") return "pending";
  if (s === "accepted" || s === "confirmed") return "accepted";
  if (s === "preparing" || s === "in_kitchen" || s === "cooking") return "preparing";
  if (s === "ready" || s === "served" || s === "dispatch") return "ready";
  if (s === "completed" || s === "done" || s === "finished") return "completed";
  if (s === "cancelled" || s === "canceled" || s === "rejected") return "cancelled";
  return "pending";
}

export type CanonicalPaymentStatus = "paid" | "unpaid" | "refunded" | "pending";

export function normalizePaymentStatus(rawPayment?: string | null): CanonicalPaymentStatus {
  if (!rawPayment) return "unpaid";
  const p = String(rawPayment).toLowerCase().trim();
  if (p === "paid" || p === "success" || p === "verified") return "paid";
  if (p === "refunded") return "refunded";
  if (p === "pending" || p === "pending_verification") return "pending";
  return "unpaid";
}

// Order Functions
export async function createOrder(orderPayload: Omit<DbOrder, "created_at">): Promise<DbOrder> {
  const newOrder: DbOrder = {
    ...orderPayload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Always save to local cache first for instant feedback & offline availability
  const existingLocal = getLocalOrders();
  // Deduplicate in local store
  if (!existingLocal.some((o) => o.id === newOrder.id || o.order_number === newOrder.order_number)) {
    saveLocalOrders([newOrder, ...existingLocal]);
  }

  if (isSupabaseConfigured()) {
    try {
      const tblNum = parseInt(String(newOrder.table_number).replace(/\D/g, ""), 10) || 1;
      const orderIdStr = newOrder.order_number || newOrder.id;

      // Safe clean IDs for PostgREST filter
      const safeId = String(newOrder.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
      const safeOrdStr = String(orderIdStr || "").replace(/[^a-zA-Z0-9_-]/g, "");

      if (safeId || safeOrdStr) {
        const filters = [];
        if (safeId) filters.push(`id.eq.${safeId}`, `order_id.eq.${safeId}`);
        if (safeOrdStr) filters.push(`id.eq.${safeOrdStr}`, `order_id.eq.${safeOrdStr}`);
        const { data: existingDb } = await supabase
          .from("sd_orders")
          .select("*")
          .or(filters.join(","));

        if (existingDb && existingDb.length > 0) {
          const mapped = mapRowToDbOrder(existingDb[0]);
          return mapped;
        }
      }

      const pMethod = newOrder.payment_method;
      const pCategory = newOrder.payment_category;

      const itemsPayload = newOrder.items.map((it, idx) => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
        ...(idx === 0 && pMethod && pCategory ? {
          payment_method: pMethod,
          payment_category: pCategory,
        } : {})
      }));

      const rawCust = typeof window !== "undefined" ? localStorage.getItem("scandine_current_customer") : null;
      let custPhone: string | null = newOrder.customer_phone || null;
      let custEmail: string | null = newOrder.customer_email || null;
      if (rawCust && (!custPhone || !custEmail)) {
        try {
          const parsed = JSON.parse(rawCust);
          if (!custPhone && parsed?.phone) custPhone = parsed.phone;
          if (!custEmail && parsed?.email) custEmail = parsed.email;
        } catch { }
      }

      const normStatus = normalizeOrderStatus(newOrder.status);
      const normPayment = normalizePaymentStatus(newOrder.payment_status || pMethod);

      const dbPayload: any = {
        id: newOrder.id,
        order_id: orderIdStr,
        customer: newOrder.customer_name || `Table ${tblNum} Customer`,
        customer_email: custEmail || null,
        customer_phone: custPhone || null,
        table_number: tblNum,
        item: itemsPayload,
        total: Number(newOrder.total),
        status: normStatus,
        payment: normPayment,
        order_time: newOrder.created_at,
        created_at: newOrder.created_at,
      };

      let { data, error } = await (supabase.from("sd_orders") as any)
        .insert([dbPayload])
        .select();

      const insertedRow = Array.isArray(data) ? data[0] : data;
      if (error) {
        console.error("Supabase insert error, queuing for offline sync:", error);
        safeEnqueueAction({
          type: "CREATE_ORDER",
          payload: orderPayload,
          timestamp: newOrder.created_at,
        });
      } else if (insertedRow) {
        const mapped = mapRowToDbOrder(insertedRow);
        mapped.session_id = newOrder.session_id || mapped.session_id;
        const updatedLocal = getLocalOrders();
        const filteredLocal = updatedLocal.filter((o) => o.id !== mapped.id && o.order_number !== mapped.order_number);
        saveLocalOrders([mapped, ...filteredLocal]);
        return mapped;
      }
    } catch (err) {
      console.error("Supabase exception during insert, queuing for offline sync:", err);
      safeEnqueueAction({
        type: "CREATE_ORDER",
        payload: orderPayload,
        timestamp: newOrder.created_at,
      });
    }
  } else {
    safeEnqueueAction({
      type: "CREATE_ORDER",
      payload: orderPayload,
      timestamp: newOrder.created_at,
    });
  }

  return newOrder;
}

export async function getOrderById(
  orderId?: string,
  expectedSessionId?: string
): Promise<DbOrder | null> {
  if (!isValidId(orderId)) return null;
  let order: DbOrder | null = null;

  if (isSupabaseConfigured()) {
    try {
      const cleanId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, "");
      if (cleanId) {
        const { data, error } = await supabase
          .from("sd_orders")
          .select("*")
          .or(`id.eq.${cleanId},order_id.eq.${cleanId}`);

        if (!error && data && data.length > 0) {
          order = mapRowToDbOrder(data[0]);
        }
      }
    } catch (err) {
      console.warn("Supabase fetch error:", err);
    }
  }

  if (!order) {
    const localOrders = getLocalOrders();
    const cleanId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    order =
      localOrders.find(
        (o) =>
          o.id === orderId ||
          o.order_number === orderId ||
          String(o.id).replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() === cleanId ||
          String(o.order_number).replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() === cleanId
      ) || null;
  }

  // Strict Session Isolation: If expectedSessionId is provided, ONLY return order if order.session_id matches expectedSessionId
  if (expectedSessionId && order && order.session_id && order.session_id !== expectedSessionId) {
    console.warn(`[SECURITY] Access denied for order ${orderId}. Session mismatch: order session (${order.session_id}) != current session (${expectedSessionId})`);
    return null;
  }

  return order;
}

export async function getOrdersByTable(
  tableNumber: string,
  customerFilter?: string,
  sessionIdFilter?: string
): Promise<DbOrder[]> {
  if (!tableNumber) return [];
  const tblNum = parseInt(String(tableNumber).replace(/\D/g, ""), 10);
  if (!tblNum || isNaN(tblNum)) return [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("sd_orders")
        .select("*")
        .eq("table_number", tblNum)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const allMapped = data.map(mapRowToDbOrder);
        if (isValidId(sessionIdFilter)) {
          return allMapped.filter((o) => !o.session_id || o.session_id === sessionIdFilter);
        }
        return allMapped;
      }
    } catch (err) {
      console.warn("Supabase table orders fetch error:", err);
    }
  }

  const localOrders = getLocalOrders();
  const tableLocal = localOrders.filter((o) => o.table_number.toLowerCase() === String(tableNumber).toLowerCase());
  if (isValidId(sessionIdFilter)) {
    return tableLocal.filter((o) => !o.session_id || o.session_id === sessionIdFilter);
  }
  return tableLocal;
}

export async function getOrdersBySession(sessionId?: string): Promise<DbOrder[]> {
  if (!isValidId(sessionId)) return [];
  const cleanSessionId = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanSessionId) return [];

  const localOrders = getLocalOrders();
  const localOrderIds = new Set(
    localOrders.map((o) => String(o.id || o.order_number || "").toLowerCase())
  );

  let tblNum: number | null = null;
  let custPhone: string | null = null;
  try {
    if (typeof window !== "undefined") {
      const rawCust = localStorage.getItem("scandine_current_customer");
      if (rawCust) {
        const parsed = JSON.parse(rawCust);
        if (parsed?.tableNumber) {
          tblNum = parseInt(String(parsed.tableNumber).replace(/\D/g, ""), 10) || null;
        }
        if (parsed?.phone) {
          custPhone = String(parsed.phone).replace(/\D/g, "") || null;
        }
      }
    }
  } catch {}

  const fetchedOrders: DbOrder[] = [];

  if (isSupabaseConfigured() && tblNum && !isNaN(tblNum)) {
    try {
      const { data, error } = await supabase
        .from("sd_orders")
        .select("*")
        .eq("table_number", tblNum)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        data.map(mapRowToDbOrder).forEach((o) => {
          const cleanId = String(o.id || "").toLowerCase();
          const cleanOrdNum = String(o.order_number || "").toLowerCase();
          const phoneMatch = custPhone && o.customer_phone && String(o.customer_phone).replace(/\D/g, "") === custPhone;
          const isOwnOrder =
            (o.session_id && (o.session_id === sessionId || o.session_id === cleanSessionId)) ||
            localOrderIds.has(cleanId) ||
            localOrderIds.has(cleanOrdNum) ||
            phoneMatch;

          if (isOwnOrder) {
            o.session_id = sessionId || cleanSessionId;
            fetchedOrders.push(o);
          }
        });
      }
    } catch (err) {
      console.warn("Supabase session order fetch warning:", err);
    }
  }

  // Merge local session orders
  localOrders.forEach((o) => {
    if (!fetchedOrders.some((existing) => existing.id === o.id || existing.order_number === o.order_number)) {
      fetchedOrders.push(o);
    }
  });

  return fetchedOrders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function subscribeToOrdersBySession(
  sessionId?: string,
  onUpdate?: (order: DbOrder) => void,
  onSubscribed?: (status?: string) => void
) {
  if (!isSupabaseConfigured() || !isValidId(sessionId) || !onUpdate) {
    return () => { };
  }

  const cleanSessionId = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanSessionId) return () => { };

  const channel = supabase
    .channel(`orders-sub-session-${cleanSessionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sd_orders",
      },
      (payload) => {
        if (payload.new) {
          const mapped = mapRowToDbOrder(payload.new);

          let currentTableNum: number | null = null;
          let currentCustPhone: string | null = null;
          try {
            if (typeof window !== "undefined") {
              const rawCust = localStorage.getItem("scandine_current_customer");
              if (rawCust) {
                const parsed = JSON.parse(rawCust);
                if (parsed?.tableNumber) {
                  currentTableNum = parseInt(String(parsed.tableNumber).replace(/\D/g, ""), 10) || null;
                }
                if (parsed?.phone) {
                  currentCustPhone = String(parsed.phone).replace(/\D/g, "") || null;
                }
              }
            }
          } catch {}

          // 1. Must match current customer table
          if (currentTableNum && parseInt(String(mapped.table_number).replace(/\D/g, ""), 10) !== currentTableNum) {
            return;
          }

          // 2. Must match current customer session / local orders / phone
          const localOrders = getLocalOrders();
          const localOrderIds = new Set(
            localOrders.map((o) => String(o.id || o.order_number || "").toLowerCase())
          );
          const cleanId = String(mapped.id || "").toLowerCase();
          const cleanOrdNum = String(mapped.order_number || "").toLowerCase();
          const phoneMatch = currentCustPhone && mapped.customer_phone && String(mapped.customer_phone).replace(/\D/g, "") === currentCustPhone;

          const isOwnOrder =
            (mapped.session_id && (mapped.session_id === sessionId || mapped.session_id === cleanSessionId)) ||
            localOrderIds.has(cleanId) ||
            localOrderIds.has(cleanOrdNum) ||
            phoneMatch;

          if (isOwnOrder) {
            onUpdate(mapped);
          }
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED" && onSubscribed) {
        onSubscribed(status);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("[TRACK] Realtime subscription warning:", status, err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function updateOrderPayment(orderId: string, paymentMethod: string = "UPI", secondaryId?: string, razorpayPaymentId?: string): Promise<boolean> {
  if (!isValidId(orderId) && !isValidId(secondaryId)) return true;

  if (isSupabaseConfigured()) {
    try {
      const isUpi = paymentMethod.toLowerCase().includes("upi") || paymentMethod.toLowerCase().includes("razorpay") || paymentMethod.toLowerCase().includes("gpay");
      const category = isUpi ? "upi" : (paymentMethod.toLowerCase().includes("cash") ? "cash" : "card");

      const cleanRef = (s: any) =>
        String(s || "")
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, "");

      const rawCandidates = [orderId, secondaryId].filter(Boolean);
      const safeCandidates: string[] = [];
      rawCandidates.forEach((raw) => {
        const cleaned = cleanRef(raw);
        if (cleaned) {
          safeCandidates.push(cleaned);
        }
      });

      const idSet = Array.from(new Set(safeCandidates));
      if (idSet.length === 0) return true;

      const orFilter = idSet
        .flatMap((cand) => [`id.eq.${cand}`, `order_id.eq.${cand}`])
        .join(",");

      const { data: updatedData } = await (supabase.from("sd_orders") as any)
        .update({
          payment: "paid",
        })
        .or(orFilter)
        .select();

      const data = updatedData;

      if (data && data.length > 0) {
        const row = data[0];
        const updatedRowId = row.id;
        let currentItems: any[] = [];
        if (Array.isArray(row.item)) {
          currentItems = row.item;
        } else if (typeof row.item === "string") {
          try {
            const parsed = JSON.parse(row.item);
            if (Array.isArray(parsed)) currentItems = parsed;
            else if (parsed && typeof parsed === "object") currentItems = [parsed];
          } catch {}
        } else if (row.item && typeof row.item === "object") {
          currentItems = [row.item];
        }

        if (currentItems.length === 0) {
          currentItems = [{ name: "Food Order", price: Number(row.total || 0), qty: 1 }];
        }

        const newItems = currentItems.map((it: any, idx: number) => ({
          ...it,
          ...(idx === 0 ? {
            payment_method: paymentMethod,
            payment_category: category,
            ...(razorpayPaymentId ? { razorpay_payment_id: razorpayPaymentId } : {})
          } : {})
        }));

        const { error: itemUpdateErr } = await (supabase.from("sd_orders") as any)
          .update({ item: newItems })
          .eq("id", updatedRowId);

        if (itemUpdateErr) {
          console.error("[UPDATE ORDER PAYMENT ITEM ERROR]", itemUpdateErr.message);
          return false;
        }
      } else {
        console.warn("[UPDATE ORDER PAYMENT NO ROW MATCHED]", { orderId, secondaryId });
        return false;
      }

      if (data && data.length > 0) {
        const cleanId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
        const localOrders = getLocalOrders();
        const updated = localOrders.map((o) => {
          const oId = String(o.id || "").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
          const oNum = String(o.order_number || o.order_id || "").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
          if (oId === cleanId || oNum === cleanId || o.id === orderId || o.order_id === orderId) {
            return { ...o, payment: "paid", payment_status: "paid" as const, payment_method: paymentMethod };
          }
          return o;
        });
        saveLocalOrders(updated);
        return true;
      }
    } catch (err) {
      console.warn("Supabase payment update exception:", err);
    }
  }

  const cleanId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
  const localOrders = getLocalOrders();
  const updated = localOrders.map((o) => {
    const oId = String(o.id || "").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    const oNum = String(o.order_number || o.order_id || "").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    if (oId === cleanId || oNum === cleanId || o.id === orderId || o.order_id === orderId) {
      return { ...o, payment: "paid", payment_status: "paid" as const, payment_method: paymentMethod };
    }
    return o;
  });
  saveLocalOrders(updated);
  return true;
}

async function safeBroadcast(channelName: string, event: string, payload: any) {
  try {
    if (isSupabaseConfigured()) {
      await Promise.race([
        supabase.channel(channelName).send({
          type: "broadcast",
          event,
          payload,
        }),
        new Promise((res) => setTimeout(res, 1200)),
      ]);
    }
  } catch (err) {
    console.warn(`[BROADCAST WARN ${event}]:`, err);
  }
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("aura_dine_sync_channel");
      bc.postMessage(payload);
    }
  } catch { }
}

export async function notifyKitchenOrderPaid(tableNumber: string, orderNumber: string) {
  const channelName = "scandine_kitchen_channel";
  const payload = {
    type: "KITCHEN_ORDER_PAID",
    table_number: tableNumber,
    order_number: orderNumber,
    message: "Order Paid",
  };
  await safeBroadcast(channelName, "kitchen_notification", payload);
}

export async function notifyKitchenNewOrder(order: DbOrder) {
  const channelName = "scandine_kitchen_channel";
  const payload = {
    type: "NEW_KITCHEN_ORDER",
    target: "kitchen",
    order,
  };
  await safeBroadcast(channelName, "kitchen_new_order", payload);
}

export async function notifyReceptionAdminPayment(details: {
  order_id: string;
  order_number: string;
  table_number: string;
  customer_name?: string;
  items: DbOrderItem[];
  subtotal: number;
  gst: number;
  total: number;
  payment_method: string;
  status: "paid";
  transaction_id: string;
  payment_time: string;
}) {
  const channelName = "scandine_reception_admin_channel";
  const payload = {
    type: "RECEPTION_ADMIN_PAYMENT",
    target: "reception_admin",
    ...details,
  };
  await safeBroadcast(channelName, "reception_admin_billing", payload);
}


export function subscribeToOrder(orderId: string, onUpdate: (order: DbOrder) => void) {
  if (!isSupabaseConfigured()) {
    return () => { };
  }

  const channel = supabase
    .channel(`order-updates-${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sd_orders",
      },
      (payload) => {
        if (payload.new) {
          const mapped = mapRowToDbOrder(payload.new);
          if (mapped.id === orderId || mapped.order_number === orderId) {
            onUpdate(mapped);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToAllOrders(tableNumber: string, onUpdate: (order: DbOrder) => void) {
  if (!isSupabaseConfigured()) {
    return () => { };
  }

  const tblNum = parseInt(String(tableNumber).replace(/\D/g, ""), 10) || 1;
  const channelName = `orders-sub-table-${tblNum}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sd_orders",
      },
      (payload) => {
        if (payload.new) {
          const mapped = mapRowToDbOrder(payload.new);
          if (Number(mapped.table_number) === tblNum || String(mapped.table_number).toLowerCase().includes(String(tblNum))) {
            onUpdate(mapped);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


// Service Request Functions (using existing notifications table)
export function mapNotificationToServiceRequest(row: any): ServiceRequest {
  const requestType = row.request_type || row.label || row.title || "Call Waiter";
  let serviceType = "waiter";
  const lower = requestType.toLowerCase();
  if (lower.includes("water")) serviceType = "water";
  else if (lower.includes("spoon") || lower.includes("cutlery")) serviceType = "spoon";
  else if (lower.includes("bill") || lower.includes("receipt")) serviceType = "bill";
  else if (lower.includes("other") || lower.includes("help")) serviceType = "other";

  const rawStatus = row.status || "Pending";
  const normStatus = rawStatus.toLowerCase() as "pending" | "accepted" | "rejected" | "completed" | "dispatched";

  return {
    id: String(row.id),
    table_number: String(row.table_number || ""),
    customer_name: row.customer_name || "Guest",
    service_type: row.service_type || serviceType,
    label: requestType,
    status: normStatus,
    created_at: row.created_at || new Date().toISOString(),
  };
}

export async function sendServiceRequest(tableNumber: string, serviceType: string, label: string, customerName: string = "Guest"): Promise<ServiceRequest> {
  const finalTable = tableNumber;
  const requestType = label || serviceType || "Call Waiter";
  const createdAt = new Date().toISOString();

  const dbRecord = {
    table_number: finalTable,
    request_type: requestType,
    status: "Pending",
    created_at: createdAt,
    title: `${requestType} - ${finalTable}`,
    message: `Service request: ${requestType} for ${finalTable}`,
    type: "service_request",
    read: false,
  };

  let savedReq: ServiceRequest = {
    id: `notif_${Date.now()}`,
    table_number: finalTable,
    customer_name: customerName,
    service_type: serviceType,
    label: requestType,
    status: "pending",
    created_at: createdAt,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await (supabase.from("sd_notifications") as any)
        .insert([dbRecord])
        .select();

      if (!error && data && data.length > 0) {
        savedReq = mapNotificationToServiceRequest(data[0]);
      } else {
        if (error) console.error("Supabase notifications insert error:", error);
        safeEnqueueAction({
          type: "SERVICE_REQUEST",
          payload: { tableNumber: finalTable, customerName, serviceType, label: requestType },
          timestamp: createdAt,
        });
      }
    } catch (err) {
      console.error("Supabase service request error, queuing for offline sync:", err);
      safeEnqueueAction({
        type: "SERVICE_REQUEST",
        payload: { tableNumber: finalTable, customerName, serviceType, label: requestType },
        timestamp: createdAt,
      });
    }
  } else {
    safeEnqueueAction({
      type: "SERVICE_REQUEST",
      payload: { tableNumber: finalTable, customerName, serviceType, label: requestType },
      timestamp: createdAt,
    });
  }

  const existing = getLocalServices();
  saveLocalServices([savedReq, ...existing]);

  // Broadcast strictly to Kitchen Channel
  notifyKitchenServiceRequest(savedReq);

  return savedReq;
}

export async function notifyKitchenServiceRequest(serviceReq: ServiceRequest) {
  const channelName = "scandine_kitchen_channel";
  const payload = {
    type: "NEW_KITCHEN_SERVICE_REQUEST",
    target: "kitchen",
    service: serviceReq,
  };
  await safeBroadcast(channelName, "kitchen_service_request", payload);
}

export async function notifyCustomerServiceRequestStatus(serviceReq: Partial<ServiceRequest> & { id: string; table_number?: string; status: string }) {
  const channelName = "scandine_customer_channel";
  const payload = {
    type: "SERVICE_REQUEST_STATUS_UPDATED",
    target: "customer",
    service: serviceReq,
  };
  await safeBroadcast(channelName, "service_request_status", payload);
}

export async function getAllServiceRequests(): Promise<ServiceRequest[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await (supabase.from("sd_notifications") as any)
        .select("*")
        .not("request_type", "is", null)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map(mapNotificationToServiceRequest);
      }
    } catch (err) {
      console.warn("Supabase fetch all service requests error from notifications table:", err);
    }
  }

  return getLocalServices();
}

export async function getServiceRequestsByTable(tableNumber: string): Promise<ServiceRequest[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await (supabase.from("sd_notifications") as any)
        .select("*")
        .not("request_type", "is", null)
        .eq("table_number", tableNumber)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map(mapNotificationToServiceRequest);
      }
    } catch (err) {
      console.warn("Supabase fetch service requests by table error from notifications table:", err);
    }
  }

  const local = getLocalServices();
  return local.filter((s) => s.table_number.toLowerCase() === tableNumber.toLowerCase());
}

export function subscribeToServiceRequests(tableNumber: string, onUpdate: (req: ServiceRequest) => void) {
  if (!isSupabaseConfigured()) {
    return () => { };
  }

  const normDigits = tableNumber.replace(/\D/g, "");
  const normStr = tableNumber.toLowerCase().replace(/\s+/g, "");

  const matchesTable = (reqTable?: string | number) => {
    if (!reqTable) return true;
    const str = String(reqTable).toLowerCase().replace(/\s+/g, "");
    const digits = String(reqTable).replace(/\D/g, "");
    if (normDigits && digits) return normDigits === digits;
    return normStr === str;
  };

  const cleanChannelName = `services-sub-${normStr}`;
  const channel = supabase
    .channel(cleanChannelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sd_notifications",
      },
      (payload) => {
        if (payload.new && (payload.new as any).request_type) {
          const req = mapNotificationToServiceRequest(payload.new);
          if (matchesTable(req.table_number)) {
            onUpdate(req);
          }
        }
      }
    )
    .on("broadcast", { event: "service_request_status" }, (eventPayload) => {
      if (eventPayload.payload?.service) {
        const req = eventPayload.payload.service as ServiceRequest;
        if (matchesTable(req.table_number)) {
          onUpdate(req);
        }
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

let cachedMenuItems: DbMenuItem[] | null = null;
let lastMenuFetchTimestamp = 0;
const MENU_CACHE_TTL_MS = 30000;

export async function fetchDbMenuItems(forceRefresh = false): Promise<DbMenuItem[]> {
  const now = Date.now();
  const isMockItem = (item: any) => {
    if (!item) return true;
    const mockIds = new Set(["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"]);
    const mockNames = new Set([
      "Truffle Mushroom Risotto", "Wagyu Smash Burger", "Avocado Sourdough Toast", "Miso Glazed Salmon",
      "Berry Chia Bowl", "Butter Chicken", "Pistachio Kunafa", "Iced Matcha Latte", "Crispy Calamari",
      "Margherita Napoletana", "Peri Peri Chicken Wings", "Dark Chocolate Fondant", "Truffle Mushroom Pizza",
      "Spicy Chipotle Burger", "Caesar Salad", "Penne Arrabiata", "Molten Chocolate Cake", "Iced Hazelnut Latte",
      "Paneer Tikka", "Grilled Salmon Bowl", "Margherita Pizza", "BBQ Wings", "Tiramisu"
    ]);
    return mockIds.has(String(item.id)) || mockNames.has(String(item.name || "").trim());
  };

  if (!forceRefresh && cachedMenuItems && now - lastMenuFetchTimestamp < MENU_CACHE_TTL_MS) {
    return cachedMenuItems.filter((it) => !isMockItem(it));
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("sd_menu_items")
        .select("*");

      if (!error && data) {
        const filtered = data.filter((it: any) => !isMockItem(it));
        cachedMenuItems = filtered.map((item: any) => {
          const rawImg = item.image || item.image_url || item.photo || item.imageUrl || item.img || "";
          return {
            ...item,
            image: rawImg,
            image_url: rawImg,
          };
        }) as DbMenuItem[];
        lastMenuFetchTimestamp = now;
        return cachedMenuItems;
      }
    } catch (err) {
      console.warn("Supabase menu fetch error:", err);
    }
  }

  try {
    const raw = localStorage.getItem("mock_table_sd_menu_items");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((it: any) => !isMockItem(it));
        cachedMenuItems = filtered.map((item: any) => {
          const rawImg = item.image || item.image_url || item.photo || item.imageUrl || item.img || "";
          return {
            ...item,
            image: rawImg,
            image_url: rawImg,
          };
        }) as DbMenuItem[];
        lastMenuFetchTimestamp = now;
        return cachedMenuItems;
      }
    }
  } catch (err) {
    console.warn("Local kitchen menu storage fetch error:", err);
  }

  return cachedMenuItems || [];
}

export function subscribeToMenuItems(onUpdate: () => void) {
  if (!isSupabaseConfigured()) {
    return () => { };
  }

  const channel = supabase
    .channel("menu-items-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sd_menu_items",
      },
      () => {
        cachedMenuItems = null;
        lastMenuFetchTimestamp = 0;
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Payment Persistence & Sync Functions
export async function createPaymentRecordInDb(_record: any) {
  // Canonical payment records are maintained directly on sd_orders table.
  return Promise.resolve();
}

export async function verifyPaymentRecordInDb(paymentId: string, verifiedBy: string = "Reception Staff") {
  const verifiedAt = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const cleanId = String(paymentId).replace(/^#/, "").trim();
      await (supabase.from("sd_orders") as any)
        .update({ payment: "paid" })
        .or(`id.eq.${paymentId},order_id.eq.${paymentId},id.eq.${cleanId},order_id.eq.${cleanId}`);
    } catch (err) {
      console.warn("Supabase payment verification error:", err);
    }
  }

  // Broadcast verification event
  const payload = {
    type: "PAYMENT_VERIFIED",
    target: "reception_admin_customer",
    payment_id: paymentId,
    status: "paid",
    verified_at: verifiedAt,
    verified_by: verifiedBy,
  };

  try {
    if (isSupabaseConfigured()) {
      await supabase.channel("scandine_reception_admin_channel").send({
        type: "broadcast",
        event: "payment_status_update",
        payload,
      });
    }
  } catch (err) { }
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("aura_dine_sync_channel");
      bc.postMessage(payload);
    }
  } catch { }
}

export async function broadcastPaymentToReceptionAdmin(record: any) {
  const payload = {
    type: "PAYMENT_RECORD_CREATED",
    target: "reception_admin",
    record,
  };

  try {
    if (isSupabaseConfigured()) {
      await supabase.channel("scandine_reception_admin_channel").send({
        type: "broadcast",
        event: "reception_admin_billing",
        payload,
      });
    }
  } catch (err) {
    console.warn("Broadcast payment error:", err);
  }
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("aura_dine_sync_channel");
      bc.postMessage(payload);
    }
  } catch { }
}

export async function getAllPaymentsFromDb() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("sd_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn("Fetch payments error:", err);
    }
  }
  return [];
}

// Category & Rating Helpers
export type FoodRatingStats = {
  avgRating: number;
  reviewCount: number;
};

export type FoodRating = {
  id: string;
  food_id: string;
  session_id: string;
  customer_name?: string;
  rating: number;
  review?: string;
  created_at: string;
};

const ID_TO_CAT_MAP: Record<string, string> = {
  cat_1: "Breakfast",
  cat_2: "Lunch",
  cat_3: "Dinner",
  cat_4: "Starters",
  cat_5: "Desserts",
  cat_6: "Drinks",
};

export function getCategoryDisplayName(item: any): string {
  if (!item) return "General";
  const rawCat = item.category || item.category_name || item.category_title || item.category_label;
  if (typeof rawCat === "string" && rawCat.trim() && !rawCat.toLowerCase().startsWith("cat_")) {
    return rawCat.trim();
  }
  const catId = (item.category_id || (typeof rawCat === "string" ? rawCat : "")).toLowerCase();
  if (catId && ID_TO_CAT_MAP[catId]) {
    return ID_TO_CAT_MAP[catId];
  }
  return typeof rawCat === "string" && rawCat.trim() ? rawCat.trim() : "General";
}

export async function fetchFoodRatingStats(foodId: string): Promise<FoodRatingStats> {
  if (!foodId) return { avgRating: 4.5, reviewCount: 0 };

  let ratings: number[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("sd_food_ratings")
        .select("rating")
        .eq("food_id", String(foodId));

      if (!error && data && data.length > 0) {
        ratings = data.map((r: any) => Number(r.rating)).filter((r) => r >= 1 && r <= 5);
      }
    } catch (err) {
      console.warn("Supabase fetch food ratings error:", err);
    }
  }

  try {
    const rawLocal = typeof localStorage !== "undefined" ? localStorage.getItem(`scandine_food_ratings_${foodId}`) : null;
    if (rawLocal) {
      const parsedLocal: any[] = JSON.parse(rawLocal);
      if (Array.isArray(parsedLocal)) {
        const localRatings = parsedLocal.map((r) => Number(r.rating)).filter((r) => r >= 1 && r <= 5);
        if (ratings.length === 0) {
          ratings = localRatings;
        }
      }
    }
  } catch { }

  if (ratings.length === 0) {
    return { avgRating: 4.5, reviewCount: 0 };
  }

  const sum = ratings.reduce((acc, curr) => acc + curr, 0);
  const avg = Math.round((sum / ratings.length) * 10) / 10;

  return {
    avgRating: avg,
    reviewCount: ratings.length,
  };
}

export async function fetchFoodReviews(foodId: string): Promise<FoodRating[]> {
  if (!foodId) return [];
  let list: FoodRating[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("sd_food_ratings")
        .select("*")
        .eq("food_id", String(foodId))
        .order("created_at", { ascending: false });

      if (!error && data) {
        list = data.map((r: any) => ({
          id: String(r.id),
          food_id: String(r.food_id),
          session_id: String(r.session_id),
          customer_name: r.customer_name || "Guest",
          rating: Number(r.rating),
          review: r.review || undefined,
          created_at: r.created_at || new Date().toISOString(),
        }));
      }
    } catch { }
  }

  try {
    const rawLocal = typeof localStorage !== "undefined" ? localStorage.getItem(`scandine_food_ratings_${foodId}`) : null;
    if (rawLocal) {
      const parsedLocal: any[] = JSON.parse(rawLocal);
      if (Array.isArray(parsedLocal)) {
        const existingIds = new Set(list.map((l) => l.id));
        for (const loc of parsedLocal) {
          if (!existingIds.has(loc.id)) {
            list.push(loc);
          }
        }
      }
    }
  } catch { }

  return list;
}

export async function submitFoodRating(payload: {
  food_id: string;
  session_id: string;
  customer_name?: string;
  rating: number;
  review?: string;
}): Promise<FoodRatingStats> {
  const newRating: FoodRating = {
    id: `rat_${payload.food_id}_${payload.session_id}`,
    food_id: String(payload.food_id),
    session_id: String(payload.session_id),
    customer_name: payload.customer_name || "Guest",
    rating: Number(payload.rating),
    review: payload.review || "",
    created_at: new Date().toISOString(),
  };

  try {
    const key = `scandine_food_ratings_${payload.food_id}`;
    const rawLocal = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    let list: FoodRating[] = rawLocal ? JSON.parse(rawLocal) : [];
    if (!Array.isArray(list)) list = [];
    const existingIndex = list.findIndex((r) => r.session_id === payload.session_id);
    if (existingIndex >= 0) {
      list[existingIndex] = newRating;
    } else {
      list.push(newRating);
    }
    localStorage.setItem(key, JSON.stringify(list));
  } catch { }

  if (isSupabaseConfigured()) {
    try {
      let { error } = await (supabase.from("sd_food_ratings") as any).upsert(
        [
          {
            id: newRating.id,
            food_id: newRating.food_id,
            session_id: newRating.session_id,
            customer_name: newRating.customer_name,
            rating: newRating.rating,
            review: newRating.review,
            updated_at: newRating.created_at,
          },
        ],
        { onConflict: "id" }
      );

      if (error && error.code === "PGRST204") {
        console.warn("sd_food_ratings table not created yet in Supabase. Using persistent local rating cache.");
      }
    } catch (err) {
      console.warn("Supabase submit rating error:", err);
    }
  }

  return fetchFoodRatingStats(payload.food_id);
}

