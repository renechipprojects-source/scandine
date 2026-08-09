import { createClient } from "@supabase/supabase-js";
import { syncManager } from "./sync-manager";

export type OrderStatus = "pending" | "received" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";

export type DbOrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  note?: string;
  image?: string;
};

export type DbOrder = {
  id: string;
  order_number: string;
  table_number: string;
  customer_name?: string;
  customer_phone?: string;
  session_id?: string;
  items: DbOrderItem[];
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  status: OrderStatus;
  payment_status: "unpaid" | "paid";
  payment_method?: string;
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

const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/^['"]|['"]$/g, "").trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").replace(/^['"]|['"]$/g, "").trim();

if (!envUrl || envUrl.includes("your-supabase-project") || envUrl.includes("placeholder")) {
  throw new Error(
    "Missing required environment variable: VITE_SUPABASE_URL. Please define VITE_SUPABASE_URL in your environment."
  );
}

if (!envKey || envKey.includes("your-supabase-anon-key") || envKey.includes("placeholder")) {
  throw new Error(
    "Missing required environment variable: VITE_SUPABASE_ANON_KEY. Please define VITE_SUPABASE_ANON_KEY in your environment."
  );
}

export const supabaseUrl = envUrl;
export const supabaseAnonKey = envKey;

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


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
  } catch {}
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
    payment_status: row.payment === "paid" || row.payment_status === "paid" ? "paid" : "unpaid",
    payment_method: row.payment_method || "card",
    created_at: row.created_at || row.order_time || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
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

      // Deduplication: Check if order already exists in Supabase
      const { data: existingDb } = await supabase
        .from("sd_orders")
        .select("*")
        .or(`id.eq.${newOrder.id},order_id.eq.${orderIdStr}`)
        .maybeSingle();

      if (existingDb) {
        const mapped = mapRowToDbOrder(existingDb);
        return mapped;
      }

      const itemsPayload = newOrder.items.map((it) => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
      }));

      const dbPayload: any = {
        id: newOrder.id,
        order_id: orderIdStr,
        customer: newOrder.customer_name || `Table ${tblNum} Customer`,
        customer_name: newOrder.customer_name || `Table ${tblNum} Customer`,
        customer_email: newOrder.customer_email || "",
        customer_phone: newOrder.customer_phone || "",
        table_number: tblNum,
        item: itemsPayload,
        total: Number(newOrder.total),
        status: newOrder.status || "pending",
        payment: newOrder.payment_status === "paid" ? "paid" : "unpaid",
        order_time: newOrder.created_at,
        created_at: newOrder.created_at,
      };

      if (newOrder.session_id) {
        dbPayload.session_id = newOrder.session_id;
      } else {
        console.warn("⚠️ Warning: createOrder called without session_id!", newOrder);
      }

      let { data, error } = await supabase
        .from("sd_orders")
        .insert([dbPayload])
        .select()
        .single();

      if (error && (error.code === "PGRST204" || error.code === "42703")) {
        // Fallback if extra columns are not yet added to remote Supabase table
        delete dbPayload.session_id;
        delete dbPayload.customer_name;
        delete dbPayload.customer_email;
        delete dbPayload.customer_phone;
        const retry = await supabase
          .from("sd_orders")
          .insert([dbPayload])
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("Supabase insert error, queuing for offline sync:", error);
        syncManager.enqueueAction({
          type: "CREATE_ORDER",
          payload: orderPayload,
          timestamp: newOrder.created_at,
        });
      } else if (data) {
        const mapped = mapRowToDbOrder(data);
        const updatedLocal = getLocalOrders();
        const filteredLocal = updatedLocal.filter((o) => o.id !== mapped.id);
        saveLocalOrders([mapped, ...filteredLocal]);
        return mapped;
      }
    } catch (err) {
      console.error("Supabase exception during insert, queuing for offline sync:", err);
      syncManager.enqueueAction({
        type: "CREATE_ORDER",
        payload: orderPayload,
        timestamp: newOrder.created_at,
      });
    }
  } else {
    syncManager.enqueueAction({
      type: "CREATE_ORDER",
      payload: orderPayload,
      timestamp: newOrder.created_at,
    });
  }

  return newOrder;
}

export async function getOrderById(orderId: string): Promise<DbOrder | null> {
  if (!orderId) return null;
  if (isSupabaseConfigured()) {
    try {
      const cleanId = orderId.replace(/^#/, "").trim();
      const { data, error } = await supabase
        .from("sd_orders")
        .select("*")
        .or(`id.eq.${orderId},order_id.eq.${orderId},id.eq.${cleanId},order_id.eq.${cleanId}`)
        .maybeSingle();

      if (!error && data) {
        return mapRowToDbOrder(data);
      }
    } catch (err) {
      console.warn("Supabase fetch error:", err);
    }
  }

  const localOrders = getLocalOrders();
  const cleanId = orderId.replace(/^#/, "").trim();
  return (
    localOrders.find(
      (o) =>
        o.id === orderId ||
        o.order_number === orderId ||
        o.id.replace(/^#/, "").trim() === cleanId ||
        o.order_number.replace(/^#/, "").trim() === cleanId
    ) || null
  );
}

export async function getOrdersByTable(
  tableNumber: string,
  customerFilter?: string,
  sessionIdFilter?: string
): Promise<DbOrder[]> {
  if (isSupabaseConfigured()) {
    try {
      const tblNum = parseInt(String(tableNumber).replace(/\D/g, ""), 10) || 1;
      const { data, error } = await supabase
        .from("sd_orders")
        .select("*")
        .eq("table_number", tblNum)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const allMapped = data.map(mapRowToDbOrder);
        if (sessionIdFilter || customerFilter) {
          const cleanFilter = (customerFilter || "").trim().toLowerCase();
          const digitsFilter = (customerFilter || "").replace(/\D/g, "");
          return allMapped.filter((o) => {
            if (sessionIdFilter && o.session_id) {
              return o.session_id === sessionIdFilter;
            }
            if (sessionIdFilter && !o.session_id) {
              // Historical orders without session_id are isolated from new customer visits
              return false;
            }
            const nameMatch = cleanFilter && o.customer_name && o.customer_name.trim().toLowerCase() === cleanFilter;
            const phoneMatch = digitsFilter.length === 10 && o.customer_phone && o.customer_phone.replace(/\D/g, "") === digitsFilter;
            return Boolean(nameMatch || phoneMatch);
          });
        }
        return allMapped;
      }
    } catch (err) {
      console.warn("Supabase table orders fetch error:", err);
    }
  }

  const localOrders = getLocalOrders();
  const tableLocal = localOrders.filter((o) => o.table_number.toLowerCase() === tableNumber.toLowerCase());
  if (sessionIdFilter || customerFilter) {
    const cleanFilter = (customerFilter || "").trim().toLowerCase();
    const digitsFilter = (customerFilter || "").replace(/\D/g, "");
    return tableLocal.filter((o) => {
      if (sessionIdFilter && o.session_id) {
        return o.session_id === sessionIdFilter;
      }
      if (sessionIdFilter && !o.session_id) {
        return false;
      }
      const nameMatch = cleanFilter && o.customer_name && o.customer_name.trim().toLowerCase() === cleanFilter;
      const phoneMatch = digitsFilter.length === 10 && o.customer_phone && o.customer_phone.replace(/\D/g, "") === digitsFilter;
      return Boolean(nameMatch || phoneMatch);
    });
  }
  return tableLocal;
}

export async function getOrdersBySession(sessionId: string): Promise<DbOrder[]> {
  if (!sessionId) return [];
  const fetchedOrders: DbOrder[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("sd_orders")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        data.map(mapRowToDbOrder).forEach((o) => fetchedOrders.push(o));
      } else if (error) {
        console.warn("Supabase session query notice:", error.message || error);
        
        // Fallback: If session_id column is not yet present on remote DB, filter by customer identity
        const rawCust = typeof window !== "undefined" ? localStorage.getItem("scandine_current_customer") : null;
        if (rawCust) {
          try {
            const cust = JSON.parse(rawCust);
            if (cust?.phone || cust?.email || cust?.fullName) {
              const { data: idData } = await supabase
                .from("sd_orders")
                .select("*")
                .order("created_at", { ascending: false });

              if (idData) {
                const matches = idData
                  .map(mapRowToDbOrder)
                  .filter((o) => {
                    if (o.session_id === sessionId) return true;
                    const pMatch = cust.phone && o.customer_phone &&
                      o.customer_phone.replace(/\D/g, "") === cust.phone.replace(/\D/g, "");
                    const eMatch = cust.email && o.customer_email &&
                      o.customer_email.trim().toLowerCase() === cust.email.trim().toLowerCase();
                    const nMatch = cust.fullName && o.customer &&
                      o.customer.trim().toLowerCase() === cust.fullName.trim().toLowerCase();
                    return pMatch || eMatch || nMatch;
                  });
                matches.forEach((m) => {
                  if (!fetchedOrders.some((existing) => existing.id === m.id)) {
                    fetchedOrders.push(m);
                  }
                });
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Supabase exception during session order fetch:", err);
    }
  }

  // Always merge local session orders so offline/newly created session orders appear immediately
  const localOrders = getLocalOrders();
  localOrders
    .filter((o) => o.session_id === sessionId)
    .forEach((o) => {
      if (!fetchedOrders.some((existing) => existing.id === o.id)) {
        fetchedOrders.push(o);
      }
    });

  return fetchedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function subscribeToOrdersBySession(sessionId: string, onUpdate: (order: DbOrder) => void) {
  if (!isSupabaseConfigured() || !sessionId) {
    return () => {};
  }

  const rawCust = typeof window !== "undefined" ? localStorage.getItem("scandine_current_customer") : null;
  let currentCust: any = null;
  if (rawCust) {
    try { currentCust = JSON.parse(rawCust); } catch {}
  }

  const channel = supabase
    .channel(`orders-sub-session-${sessionId.replace(/[^a-zA-Z0-9]/g, "_")}`)
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
          
          // Match Priority 1: Exact session_id
          if (mapped.session_id && mapped.session_id === sessionId) {
            onUpdate(mapped);
            return;
          }

          // Match Priority 2: Customer Identity fallback (Phone / Email / Full Name)
          if (currentCust) {
            const phoneMatch = currentCust.phone && mapped.customer_phone &&
              mapped.customer_phone.replace(/\D/g, "") === currentCust.phone.replace(/\D/g, "");
            const emailMatch = currentCust.email && mapped.customer_email &&
              mapped.customer_email.trim().toLowerCase() === currentCust.email.trim().toLowerCase();
            const nameMatch = currentCust.fullName && mapped.customer &&
              mapped.customer.trim().toLowerCase() === currentCust.fullName.trim().toLowerCase();

            if (phoneMatch || emailMatch || nameMatch) {
              onUpdate(mapped);
            }
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function updateOrderPayment(orderId: string, paymentMethod: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("sd_orders")
        .update({
          payment: "paid",
        })
        .or(`id.eq.${orderId},order_id.eq.${orderId}`);

      if (!error) return true;
    } catch (err) {
      console.warn("Supabase payment update error:", err);
    }
  }

  const localOrders = getLocalOrders();
  const updated = localOrders.map((o) =>
    o.id === orderId ? { ...o, payment_status: "paid" as const, payment_method: paymentMethod } : o
  );
  saveLocalOrders(updated);
  return true;
}

export async function notifyKitchenOrderPaid(tableNumber: string, orderNumber: string) {
  const channelName = "scandine_kitchen_channel";
  const payload = {
    type: "KITCHEN_ORDER_PAID",
    table_number: tableNumber,
    order_number: orderNumber,
    message: "Order Paid",
  };
  try {
    if (isSupabaseConfigured()) {
      await supabase.channel(channelName).send({
        type: "broadcast",
        event: "kitchen_notification",
        payload,
      });
    }
  } catch (err) {
    console.warn("Supabase kitchen payment broadcast error:", err);
  }
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("aura_dine_sync_channel");
      bc.postMessage(payload);
    }
  } catch {}
}

export async function notifyKitchenNewOrder(order: DbOrder) {
  const channelName = "scandine_kitchen_channel";
  const payload = {
    type: "NEW_KITCHEN_ORDER",
    target: "kitchen",
    order,
  };
  try {
    if (isSupabaseConfigured()) {
      await supabase.channel(channelName).send({
        type: "broadcast",
        event: "kitchen_new_order",
        payload,
      });
    }
  } catch (err) {
    console.warn("Supabase new order broadcast error:", err);
  }
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("aura_dine_sync_channel");
      bc.postMessage(payload);
    }
  } catch {}
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
  try {
    if (isSupabaseConfigured()) {
      await supabase.channel(channelName).send({
        type: "broadcast",
        event: "reception_admin_billing",
        payload,
      });
      try {
        await supabase.from("payments").insert([
          {
            order_id: details.order_id,
            order_number: details.order_number,
            table_number: details.table_number,
            customer_name: details.customer_name || "Guest",
            amount: details.total,
            payment_method: details.payment_method,
            transaction_id: details.transaction_id,
            status: "paid",
            created_at: details.payment_time,
          },
        ]);
      } catch (e) {}
    }
  } catch (err) {
    console.warn("Supabase reception/admin payment broadcast error:", err);
  }
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("aura_dine_sync_channel");
      bc.postMessage(payload);
    }
  } catch {}
}


export function subscribeToOrder(orderId: string, onUpdate: (order: DbOrder) => void) {
  if (!isSupabaseConfigured()) {
    return () => {};
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
    return () => {};
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
      const { data, error } = await supabase
        .from("sd_notifications")
        .insert([dbRecord])
        .select();

      if (!error && data && data.length > 0) {
        savedReq = mapNotificationToServiceRequest(data[0]);
      } else {
        if (error) console.error("Supabase notifications insert error:", error);
        syncManager.enqueueAction({
          type: "SERVICE_REQUEST",
          payload: { tableNumber: finalTable, customerName, serviceType, label: requestType },
          timestamp: createdAt,
        });
      }
    } catch (err) {
      console.error("Supabase service request error, queuing for offline sync:", err);
      syncManager.enqueueAction({
        type: "SERVICE_REQUEST",
        payload: { tableNumber: finalTable, customerName, serviceType, label: requestType },
        timestamp: createdAt,
      });
    }
  } else {
    syncManager.enqueueAction({
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

  try {
    if (isSupabaseConfigured()) {
      await supabase.channel(channelName).send({
        type: "broadcast",
        event: "kitchen_service_request",
        payload,
      });
    }
  } catch (err) {
    console.warn("Supabase kitchen service broadcast error:", err);
  }
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("aura_dine_sync_channel");
      bc.postMessage(payload);
    }
  } catch {}
}

export async function notifyCustomerServiceRequestStatus(serviceReq: Partial<ServiceRequest> & { id: string; table_number?: string; status: string }) {
  const channelName = "scandine_customer_channel";
  const payload = {
    type: "SERVICE_REQUEST_STATUS_UPDATED",
    target: "customer",
    service: serviceReq,
  };

  try {
    if (isSupabaseConfigured()) {
      await supabase.channel(channelName).send({
        type: "broadcast",
        event: "service_request_status",
        payload,
      });
    }
  } catch (err) {
    console.warn("Supabase customer service status broadcast error:", err);
  }
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("aura_dine_sync_channel");
      bc.postMessage(payload);
    }
  } catch {}
}

export async function getAllServiceRequests(): Promise<ServiceRequest[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("sd_notifications")
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
      const { data, error } = await supabase
        .from("sd_notifications")
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
    return () => {};
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
    return () => {};
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
export async function createPaymentRecordInDb(record: any) {
  if (isSupabaseConfigured()) {
    try {
      const tblNum = parseInt(String(record.table_number).replace(/\D/g, ""), 10) || 1;
      const dbPayload = {
        id: record.id,
        order_id: record.order_id,
        order_number: record.order_number,
        invoice_id: record.invoice_id,
        table_number: tblNum,
        customer_name: record.customer_name || "Guest",
        subtotal: record.subtotal,
        gst: record.gst,
        amount: record.total,
        payment_method: record.payment_method,
        payment_category: record.payment_category,
        transaction_id: record.transaction_id,
        status: record.status,
        created_at: record.created_at,
        verified_at: record.verified_at || null,
        verified_by: record.verified_by || null,
      };

      const { error } = await supabase.from("payments").insert([dbPayload]);
      if (error) {
        console.warn("Supabase payments insert error:", error);
      }
    } catch (err) {
      console.warn("Supabase payment creation error:", err);
    }
  }

  // Broadcast to Reception & Admin Channel
  broadcastPaymentToReceptionAdmin(record);
}

export async function verifyPaymentRecordInDb(paymentId: string, verifiedBy: string = "Reception Staff") {
  const verifiedAt = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from("payments")
        .update({
          status: "paid",
          verified_at: verifiedAt,
          verified_by: verifiedBy,
        })
        .or(`id.eq.${paymentId},order_id.eq.${paymentId},invoice_id.eq.${paymentId}`);
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
  } catch (err) {}
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("aura_dine_sync_channel");
      bc.postMessage(payload);
    }
  } catch {}
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
  } catch {}
}

export async function getAllPaymentsFromDb() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("payments")
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
  } catch {}

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
    } catch {}
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
  } catch {}

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
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      let { error } = await supabase.from("sd_food_ratings").upsert(
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

