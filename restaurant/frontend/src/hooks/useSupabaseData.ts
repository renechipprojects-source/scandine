import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  created_at?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  address?: string;
  phone?: string;
  role: "receptionist" | "kitchen_staff" | "waiter" | "owner" | "manager" | "cashier";
  created_at?: string;
}

export interface Ingredient {
  id: string;
  ingredient: string;
  supplier: string;
  stock: number;
  level: string;
  expiry_status: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  sku_count?: number;
  vendor_status?: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  items: number;
  total: number;
  date: string;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  entry_type?: string;
  created_at?: string;
}

function normalizeOrderStatus(s?: string): string {
  const norm = (s || "").toLowerCase().trim();
  if (norm.includes("accept") || norm === "confirmed") return "accepted";
  if (norm.includes("prep") || norm === "cooking" || norm === "in_kitchen") return "preparing";
  if (norm.includes("read") || norm === "kitchen ready") return "ready";
  if (norm.includes("serv") || norm === "delivered") return "served";
  if (norm.includes("comp") || norm === "done" || norm === "finished") return "completed";
  if (norm.includes("canc") || norm === "void" || norm.includes("reject")) return "cancelled";
  if (norm.includes("pend") || norm === "new" || norm === "placed" || norm === "received") return "pending";
  return norm || "pending";
}

function normalizePaymentStatus(p?: string): string {
  const norm = (p || "").toLowerCase().trim();
  if (norm === "paid" || norm.includes("settle") || norm.includes("cash") || norm.includes("upi") || norm.includes("card")) return "paid";
  return "unpaid";
}

export interface InventoryItem {
  name: string;
  qty: number;
  price: number;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  order_id: string;
  customer: string;
  table_number: number;
  item: OrderItem[];
  total: number;
  status: "pending" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
  payment: "paid" | "unpaid" | "refunded" | "pending";
  order_time: string;
  accepted_at?: string;
  prep_time_minutes?: number;
  estimated_ready_at?: string;
  created_at?: string;
}

export interface ServiceRequest {
  id: string;
  table_number: string | number;
  customer_name?: string;
  service_type: string;
  label?: string;
  status: "pending" | "accepted" | "dispatched" | "completed";
  created_at?: string;
}

export interface TableItem {
  id: string;
  table_number: number;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  location: string;
}

export interface Invoice {
  id: string;
  transition: string;
  invoice: string;
  customer: string;
  method: string;
  date: string;
  amount: number;
  status: "Paid" | "Pending" | "Unpaid" | "paid" | "unpaid" | "pending" | "partial";
  transaction_id?: string;
  paid_at?: string;
  created_at?: string;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  customer: string;
  method: string;
  amount: number;
  status: "Paid" | "Pending" | "Unpaid" | "paid" | "unpaid" | "pending";
  date: string;
  transaction_id?: string;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  category_id?: string;
  category?: string;
  category_name?: string;
  status?: string;
  name: string;
  description: string;
  image: string;
  image_url?: string;
  price: number;
  available: boolean;
  preparation_time: number;
  created_at?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at?: string;
}

// Clean payload to match Supabase database column schema for all tables
function cleanPayloadForSupabase(tableName: string, payload: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...payload };

  if (tableName === "suppliers") {
    delete cleaned.items;
  } else if (tableName === "sd_purchase_orders") {
    delete cleaned.entry_type;
  } else if (tableName === "sd_menu_items") {
    const rawImg = String(cleaned.image || cleaned.image_url || "").trim();
    if (rawImg && !rawImg.startsWith("blob:") && !rawImg.startsWith("file:")) {
      cleaned.image = rawImg;
      cleaned.image_url = rawImg;
    } else {
      delete cleaned.image;
      delete cleaned.image_url;
    }

    const catVal = String(cleaned.category || cleaned.category_name || "").trim();
    const CATEGORY_MAP: Record<string, string> = {
      Breakfast: "cat_1",
      Lunch: "cat_2",
      Dinner: "cat_3",
      Starters: "cat_4",
      Desserts: "cat_5",
      Drinks: "cat_6",
    };
    if (catVal && CATEGORY_MAP[catVal]) {
      cleaned.category_id = CATEGORY_MAP[catVal];
    } else if (!cleaned.category_id && catVal) {
      cleaned.category_id = "cat_2";
    }

    const prepVal = Number(cleaned.preparation_time ?? cleaned.prep_time_minutes ?? cleaned.prepTime) || 15;
    cleaned.preparation_time = prepVal;

    // Delete all non-existent Postgres table columns for sd_menu_items
    delete cleaned.category;
    delete cleaned.category_name;
    delete cleaned.status;
    delete cleaned.prep_time_minutes;
    delete cleaned.prepTime;
    delete cleaned.spicy;
    delete cleaned.veg;
    delete cleaned.popular;
    delete cleaned.featured;
    delete cleaned.emoji;
  } else if (tableName === "sd_orders") {
    if (typeof cleaned.status === "string") {
      cleaned.status = cleaned.status.toLowerCase();
    }
    if (cleaned.payment || cleaned.payment_status) {
      const pVal = String(cleaned.payment_status || cleaned.payment).toLowerCase();
      cleaned.payment = pVal;
      cleaned.payment_status = pVal;
    }
    if (cleaned.items || cleaned.item) {
      cleaned.items = cleaned.items || cleaned.item;
      delete cleaned.item;
    }
    if (cleaned.customer_name || cleaned.customer) {
      cleaned.customer_name = String(cleaned.customer_name || cleaned.customer);
      delete cleaned.customer;
    }
  }

  return cleaned;
}

// Helper to normalize rows fetched from Supabase
function normalizeFetchedRows<T>(tableName: string, rows: T[]): T[] {
  if (tableName === "sd_orders") {
    return rows.map((r: any) => ({
      ...r,
      status: normalizeOrderStatus(r.status),
      payment: normalizePaymentStatus(r.payment || r.payment_status),
    })) as unknown as T[];
  }
  if (tableName === "sd_menu_items") {
    const ID_TO_CATEGORY: Record<string, string> = {
      cat_1: "Breakfast",
      cat_2: "Lunch",
      cat_3: "Dinner",
      cat_4: "Starters",
      cat_5: "Desserts",
      cat_6: "Drinks",
    };
    const mockIds = new Set(["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"]);
    const mockNames = new Set([
      "Truffle Mushroom Risotto", "Wagyu Smash Burger", "Avocado Sourdough Toast", "Miso Glazed Salmon",
      "Berry Chia Bowl", "Butter Chicken", "Pistachio Kunafa", "Iced Matcha Latte", "Crispy Calamari",
      "Margherita Napoletana", "Peri Peri Chicken Wings", "Dark Chocolate Fondant", "Truffle Mushroom Pizza",
      "Spicy Chipotle Burger", "Caesar Salad", "Penne Arrabiata", "Molten Chocolate Cake", "Iced Hazelnut Latte",
      "Paneer Tikka", "Grilled Salmon Bowl", "Margherita Pizza", "BBQ Wings", "Tiramisu"
    ]);

    return rows
      .filter((r: any) => !mockIds.has(String(r.id)) && !mockNames.has(String(r.name || "").trim()))
      .map((r: any) => {
        const catName = r.category_name || r.category || (r.category_id ? ID_TO_CATEGORY[r.category_id] : null) || "Lunch";
        let rawImg = String(r.image_url || r.image || "").trim();
        if (rawImg.includes("localhost:") || rawImg.includes("127.0.0.1:")) {
          try {
            const parsed = new URL(rawImg);
            rawImg = (parsed.pathname && parsed.pathname !== "/" && !parsed.pathname.endsWith("/")) ? parsed.pathname : "";
          } catch {
            rawImg = "";
          }
        }
        return {
          ...r,
          category: catName,
          category_name: catName,
          image_url: rawImg,
          image: rawImg,
          status: r.status || (r.available ? "Available" : "Unavailable"),
        };
      });
  }
  return rows;
}

const inFlightUpdates = new Map<string, string>();

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  completed: 4,
  cancelled: 5,
};

function isSameLogicalOrder(a: any, b: any): boolean {
  if (!a || !b) return false;
  const aId = String(a.id || "").trim().toLowerCase();
  const aOrderId = String(a.order_id || a.order_number || "").trim().toLowerCase();

  const bId = String(b.id || "").trim().toLowerCase();
  const bOrderId = String(b.order_id || b.order_number || "").trim().toLowerCase();

  if (aId && (aId === bId || aId === bOrderId)) return true;
  if (aOrderId && (aOrderId === bId || aOrderId === bOrderId)) return true;

  const aNum = aOrderId.replace(/\D/g, "") || aId.replace(/\D/g, "");
  const bNum = bOrderId.replace(/\D/g, "") || bId.replace(/\D/g, "");
  if (aNum && bNum && aNum === bNum) return true;

  return false;
}

function isMatchingOrderId(order: any, targetIdStr: string): boolean {
  if (!order || !targetIdStr) return false;
  const target = targetIdStr.trim().toLowerCase();
  const targetNum = target.replace(/\D/g, "");

  const oId = String(order.id || "").trim().toLowerCase();
  const oOrderId = String(order.order_id || order.order_number || "").trim().toLowerCase();
  const oNum = oOrderId.replace(/\D/g, "") || oId.replace(/\D/g, "");

  if (oId === target || oOrderId === target) return true;
  if (targetNum && oNum && targetNum === oNum) return true;
  return false;
}

function mergeOrdersList(prev: any[], fetched: any[]): any[] {
  const result: any[] = [];

  const addOrMerge = (newItem: any, isFromFetch = false) => {
    if (!newItem) return;
    const normStatus = normalizeOrderStatus(newItem.status);
    const itemToProcess = {
      ...newItem,
      status: normStatus,
      payment: normalizePaymentStatus(newItem.payment || newItem.payment_status),
    };

    const existingIndex = result.findIndex((r) => isSameLogicalOrder(r, itemToProcess));
    if (existingIndex === -1) {
      const rawId = String(itemToProcess.id || "").toLowerCase();
      const rawOrd = String(itemToProcess.order_id || "").toLowerCase();
      const rawDigits = (rawOrd || rawId).replace(/\D/g, "");

      const inFlightStatus =
        inFlightUpdates.get(rawId) ||
        inFlightUpdates.get(rawOrd) ||
        inFlightUpdates.get(rawDigits) ||
        inFlightUpdates.get(`ord-${rawDigits}`);

      if (inFlightStatus) {
        itemToProcess.status = inFlightStatus;
      }
      result.push(itemToProcess);
    } else {
      const existing = result[existingIndex];
      const existingStatus = normalizeOrderStatus(existing.status);
      const newStatus = itemToProcess.status;

      let finalStatus = newStatus;

      const rawId = String(existing.id || "").toLowerCase();
      const rawOrd = String(existing.order_id || "").toLowerCase();
      const rawDigits = (rawOrd || rawId).replace(/\D/g, "");

      const inFlightStatus =
        inFlightUpdates.get(rawId) ||
        inFlightUpdates.get(rawOrd) ||
        inFlightUpdates.get(rawDigits) ||
        inFlightUpdates.get(`ord-${rawDigits}`);

      if (inFlightStatus) {
        finalStatus = inFlightStatus;
      } else if (existingStatus === "cancelled" || newStatus === "cancelled") {
        finalStatus = "cancelled";
      } else if (isFromFetch) {
        // When fetching from Supabase DB, Supabase DB is authoritative unless local rank is higher for an in-flight transition
        finalStatus = newStatus;
      } else {
        finalStatus = newStatus;
      }

      result[existingIndex] = {
        ...existing,
        ...itemToProcess,
        id: itemToProcess.id || existing.id,
        order_id: itemToProcess.order_id || existing.order_id || itemToProcess.id || existing.id,
        status: finalStatus,
        accepted_at: itemToProcess.accepted_at || existing.accepted_at,
        prep_time_minutes: itemToProcess.prep_time_minutes || existing.prep_time_minutes,
        estimated_ready_at: itemToProcess.estimated_ready_at || existing.estimated_ready_at,
      };
    }
  };

  if (fetched.length > 0) {
    fetched.forEach((item) => addOrMerge(item, true));
    prev.forEach((item) => addOrMerge(item, false));
  } else {
    prev.forEach((item) => addOrMerge(item, false));
  }

  return result;
}

// Generic Hook for managing Supabase Table CRUD with state
export function useSupabaseTable<T extends { id: string }>(
  tableName: string,
  initialData: T[] = [],
) {
  const storageKey = `mock_table_${tableName}`;

  const [data, setData] = useState<T[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && tableName === "sd_menu_items") {
          const mockIds = new Set(["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"]);
          const mockNames = new Set([
            "Truffle Mushroom Risotto", "Wagyu Smash Burger", "Avocado Sourdough Toast", "Miso Glazed Salmon",
            "Berry Chia Bowl", "Butter Chicken", "Pistachio Kunafa", "Iced Matcha Latte", "Crispy Calamari",
            "Margherita Napoletana", "Peri Peri Chicken Wings", "Dark Chocolate Fondant", "Truffle Mushroom Pizza",
            "Spicy Chipotle Burger", "Caesar Salad", "Penne Arrabiata", "Molten Chocolate Cake", "Iced Hazelnut Latte",
            "Paneer Tikka", "Grilled Salmon Bowl", "Margherita Pizza", "BBQ Wings", "Tiramisu"
          ]);
          const filtered = parsed.filter((item: any) => !mockIds.has(String(item.id)) && !mockNames.has(String(item.name || "").trim()));
          localStorage.setItem(storageKey, JSON.stringify(filtered));
          return filtered as T[];
        }
        if (Array.isArray(parsed) && tableName === "sd_orders" && isSupabaseConfigured) {
          const mockIds = new Set(["#ORD-10247", "#ORD-10248", "#ORD-10249", "#ORD-10250", "ORD-10247", "ORD-10248", "ORD-10249", "ORD-10250"]);
          const filtered = parsed.filter((item: any) => !mockIds.has(String(item.id)) && !mockIds.has(String(item.order_id)));
          localStorage.setItem(storageKey, JSON.stringify(filtered));
          return filtered as T[];
        }
        return parsed;
      }
      if (initialData.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(initialData));
        return initialData;
      }
    } catch (e) {
      console.error(e);
    }
    return initialData;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcast and sync to local storage for instant reactive UI updates
  const updateLocalData = useCallback((newVal: T[] | ((prev: T[]) => T[]), source?: string) => {
    setData((prev) => {
      const updated = typeof newVal === "function" ? newVal(prev) : newVal;
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName, source } }));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, [tableName, storageKey]);

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: rows, error: fetchErr } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchErr) {
        console.warn(`Supabase fetch notice for ${tableName}:`, fetchErr.message);
        if (fetchErr.message.toLowerCase().includes("created_at") || fetchErr.code === "42703") {
          const { data: rows2, error: fetchErr2 } = await supabase
            .from(tableName)
            .select("*");
          if (!fetchErr2 && rows2) {
            updateLocalData(normalizeFetchedRows(tableName, rows2 as T[]), "fetch");
          }
        }
      } else if (rows) {
        if (rows.length > 0) {
          const fetched = normalizeFetchedRows(tableName, rows as T[]);

          if (tableName === "sd_menu_items" || tableName === "sd_employees" || (tableName === "sd_orders" && isSupabaseConfigured)) {
            // Live database rows from Supabase are the single source of truth; replace state completely without merging stale deleted/mock items
            updateLocalData(fetched, "fetch");
          } else if (tableName === "sd_orders") {
            updateLocalData((prev) => mergeOrdersList(prev, fetched) as T[], "fetch");
          } else {
            updateLocalData((prev) => {
              const map = new Map<string, T>();
              prev.forEach((item) => map.set(item.id, item));

              fetched.forEach((item: any) => {
                map.set(item.id, item);
              });
              return Array.from(map.values());
            }, "fetch");
          }
        } else if (rows.length === 0) {
          updateLocalData([], "fetch");
        }
      }

    } catch (err) {
      console.warn(`Supabase fetch notice for ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [tableName, updateLocalData]);

  useEffect(() => {
    fetchData();

    const handleLocalUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (!customEv.detail || (customEv.detail.tableName === tableName && customEv.detail.source !== "fetch")) {
        fetchData();
      }
    };

    window.addEventListener("local-table-updated", handleLocalUpdate);
    window.addEventListener("storage", handleLocalUpdate);
    return () => {
      window.removeEventListener("local-table-updated", handleLocalUpdate);
      window.removeEventListener("storage", handleLocalUpdate);
    };
  }, [fetchData, tableName]);

  // CREATE
  const addItem = async (newItem: Omit<T, "id"> & Partial<Pick<T, "id">>) => {
    const created = {
      ...newItem,
      id: newItem.id || `${tableName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    } as unknown as T;

    updateLocalData((prev) => [created, ...prev]);

    if (isSupabaseConfigured) {
      try {
        const payload = cleanPayloadForSupabase(tableName, created as unknown as Record<string, unknown>);
        let res = await supabase
          .from(tableName)
          .insert([payload])
          .select()
          .single();

        if (res.error && (res.error.code === "42703" || res.error.message.toLowerCase().includes("column"))) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.entry_type;
          res = await supabase
            .from(tableName)
            .insert([fallbackPayload])
            .select()
            .single();
        }

        if (res.error) {
          console.warn(`[Supabase Insert Notice on ${tableName}]:`, res.error.message);
          return created;
        } else if (res.data) {
          const finalItem = { ...created, ...res.data } as T;
          updateLocalData((prev) =>
            prev.map((item) => (item.id === created.id ? finalItem : item)),
          );
          return finalItem;
        }
      } catch (err: any) {
        console.warn(`Supabase insert notice for ${tableName}:`, err);
        return created;
      }
    }
    return created;
  };

  // UPDATE
  const updateItem = async (id: string, updates: Partial<T>) => {
    const targetIdStr = String(id).trim();
    const normUpdates: Record<string, any> = { ...updates };
    if (normUpdates.status) {
      normUpdates.status = normalizeOrderStatus(String(normUpdates.status)) as any;
    }

    let previousOrdersState: T[] = [];
    const targetDigits = targetIdStr.replace(/\D/g, "");
    const keysToTrack = [targetIdStr, targetDigits, `ORD-${targetDigits}`].filter(Boolean);
    if (normUpdates.status) {
      keysToTrack.forEach((k) => inFlightUpdates.set(k.toLowerCase(), normUpdates.status));
    }

    updateLocalData((prev) => {
      previousOrdersState = prev;

      if (tableName === "sd_orders") {
        let foundMatch = false;
        const updatedList = prev.map((item: any) => {
          if (isMatchingOrderId(item, targetIdStr)) {
            foundMatch = true;
            return { ...item, ...normUpdates };
          }
          return item;
        });

        if (!foundMatch && initialData.length > 0) {
          const fromInitial = initialData.find((item: any) => isMatchingOrderId(item, targetIdStr));
          if (fromInitial) {
            updatedList.unshift({ ...fromInitial, ...normUpdates });
          }
        }

        return mergeOrdersList(updatedList, []) as T[];
      }

      const exists = prev.some((item: any) => item.id === id || item.order_id === id);
      if (!exists && initialData.length > 0) {
        const fromInitial = initialData.find((item: any) => item.id === id || item.order_id === id);
        if (fromInitial) {
          return [{ ...fromInitial, ...updates }, ...prev];
        }
      }
      return prev.map((item: any) =>
        item.id === id || item.order_id === id ? { ...item, ...updates } : item
      );
    }, "optimistic");

    if (isSupabaseConfigured) {
      try {
        const payload = cleanPayloadForSupabase(tableName, updates as unknown as Record<string, unknown>);

        if (tableName === "sd_orders") {
          const dbOrderPayload: Record<string, any> = {};
          if (payload.status !== undefined) dbOrderPayload.status = normalizeOrderStatus(String(payload.status));
          if (payload.payment !== undefined || payload.payment_status !== undefined) {
            dbOrderPayload.payment = normalizePaymentStatus(String(payload.payment || payload.payment_status));
          }
          if (payload.total !== undefined) dbOrderPayload.total = Number(payload.total);
          if (payload.item !== undefined || payload.items !== undefined) {
            dbOrderPayload.item = payload.item || payload.items;
          }
          if (payload.customer !== undefined || payload.customer_name !== undefined) {
            dbOrderPayload.customer = String(payload.customer || payload.customer_name);
          }
          if (payload.table_number !== undefined) dbOrderPayload.table_number = Number(payload.table_number);
          if (payload.accepted_at !== undefined) dbOrderPayload.accepted_at = payload.accepted_at;
          if (payload.prep_time_minutes !== undefined) dbOrderPayload.prep_time_minutes = payload.prep_time_minutes;
          if (payload.estimated_ready_at !== undefined) dbOrderPayload.estimated_ready_at = payload.estimated_ready_at;

          const targetDigits = targetIdStr.replace(/\D/g, "");
          const withOrdPrefix = targetIdStr.startsWith("ORD-") ? targetIdStr : `ORD-${targetIdStr}`;
          const withoutOrdPrefix = targetIdStr.replace(/^ORD-/i, "");

          let updatedRows: any[] | null = null;
          let updateErr: any = null;

          // Attempt 1: match id = targetIdStr
          const res1 = await supabase
            .from(tableName)
            .update(dbOrderPayload)
            .eq("id", targetIdStr)
            .select();
          updatedRows = res1.data;
          updateErr = res1.error;

          // Attempt 2: match order_id = targetIdStr
          if ((!updatedRows || updatedRows.length === 0) && !updateErr) {
            const res2 = await supabase
              .from(tableName)
              .update(dbOrderPayload)
              .eq("order_id", targetIdStr)
              .select();
            if (res2.data && res2.data.length > 0) {
              updatedRows = res2.data;
            }
            if (res2.error) updateErr = res2.error;
          }

          // Attempt 3: match order_id = withOrdPrefix
          if (!updatedRows || updatedRows.length === 0) {
            const res3 = await supabase
              .from(tableName)
              .update(dbOrderPayload)
              .eq("order_id", withOrdPrefix)
              .select();
            if (res3.data && res3.data.length > 0) {
              updatedRows = res3.data;
            }
          }

          // Attempt 4: match order_id = withoutOrdPrefix or targetDigits
          if (!updatedRows || updatedRows.length === 0) {
            const matchVal = withoutOrdPrefix || targetDigits;
            if (matchVal) {
              const res4 = await supabase
                .from(tableName)
                .update(dbOrderPayload)
                .eq("order_id", matchVal)
                .select();
              if (res4.data && res4.data.length > 0) {
                updatedRows = res4.data;
              }
            }
          }

          // Attempt 5: match id = matchVal
          if (!updatedRows || updatedRows.length === 0) {
            const matchVal = targetDigits || withoutOrdPrefix;
            if (matchVal) {
              const res5 = await supabase
                .from(tableName)
                .update(dbOrderPayload)
                .eq("id", matchVal)
                .select();
              if (res5.data && res5.data.length > 0) {
                updatedRows = res5.data;
              }
            }
          }

          if (updatedRows && updatedRows.length > 0) {
            keysToTrack.forEach((k) => inFlightUpdates.delete(k.toLowerCase()));
            const normalizedDBRows = normalizeFetchedRows(tableName, updatedRows);
            updateLocalData((prev) => mergeOrdersList(prev, normalizedDBRows) as T[], "db_update");
          } else {
            keysToTrack.forEach((k) => inFlightUpdates.delete(k.toLowerCase()));
            updateLocalData(previousOrdersState, "rollback");
            throw new Error(`Order status update for ${targetIdStr} failed in Supabase database (0 rows affected).`);
          }
        } else {
          let res = await supabase.from(tableName).update(payload).eq("id", id).select();
          if (res.error || !res.data || res.data.length === 0) {
            const res2 = await supabase.from(tableName).update(payload).eq("id", id).select();
            if (res2.error || !res2.data || res2.data.length === 0) {
              updateLocalData(previousOrdersState, "rollback");
              throw new Error(`Update for ${id} failed in database.`);
            }
          }
        }
      } catch (err) {
        keysToTrack.forEach((k) => inFlightUpdates.delete(k.toLowerCase()));
        updateLocalData(previousOrdersState, "rollback");
        console.error(`Supabase update error for ${tableName}:`, err);
        throw err;
      }
    }
  };

  // DELETE
  const deleteItem = async (id: string) => {
    updateLocalData((prev) => prev.filter((item) => item.id !== id));

    if (isSupabaseConfigured) {
      try {
        const { error: deleteErr } = await supabase
          .from(tableName)
          .delete()
          .eq("id", id);

        if (deleteErr) {
          console.error(`[Supabase Delete Error on ${tableName}]:`, deleteErr.message);
          throw deleteErr;
        }

        window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName } }));
        try {
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("aura_dine_sync_channel");
            bc.postMessage({ type: "MENU_UPDATED", tableName });
          }
        } catch {}
      } catch (err) {
        console.error(`Supabase delete exception for ${tableName}:`, err);
        throw err;
      }
    }
  };

  return {
    data,
    setData: updateLocalData,
    loading,
    error,
    fetchData,
    addItem,
    updateItem,
    deleteItem,
  };
}

// Optimized parallel utility function to mark payment & invoice as paid across Supabase
export async function markPaymentAndInvoiceAsPaid(
  targetId: string,
  invoiceIdOrOrder?: string,
  customerName?: string,
  amountVal?: number,
  methodVal: string = "Cash"
) {
  const invId = invoiceIdOrOrder || targetId;
  const isCash = methodVal.toLowerCase().includes("cash");
  const category = isCash ? "cash" : (methodVal.toLowerCase().includes("upi") || methodVal.toLowerCase().includes("razorpay") ? "upi" : "card");

  const cleanRef = (s: any) =>
    String(s || "")
      .trim()
      .replace(/^[#]/, "")
      .replace(/^ord[-_]?/i, "");

  const c1 = cleanRef(targetId);
  const c2 = cleanRef(invId);

  const idCandidates = Array.from(new Set([targetId, invId, c1, c2, `ord_${c1}`].filter(Boolean)));

  if (isSupabaseConfigured) {
    try {
      for (const candId of idCandidates) {
        let { data: byId } = await supabase
          .from("sd_orders")
          .update({
            payment: "paid",
          })
          .eq("id", candId)
          .select();

        if (byId && byId.length > 0) {
          let items: any[] = [];
          if (Array.isArray(byId[0].item)) {
            items = byId[0].item;
          } else if (typeof byId[0].item === "string") {
            try {
              const parsed = JSON.parse(byId[0].item);
              if (Array.isArray(parsed)) items = parsed;
              else if (parsed && typeof parsed === "object") items = [parsed];
            } catch {}
          } else if (byId[0].item && typeof byId[0].item === "object") {
            items = [byId[0].item];
          }

          if (items.length === 0) {
            items = [{ name: "Food Order", price: Number(byId[0].total || 0), qty: 1 }];
          }

          const updatedItems = items.map((it: any, idx: number) => ({
            ...it,
            ...(idx === 0 ? { payment_method: methodVal, payment_category: category } : {})
          }));
          await supabase.from("sd_orders").update({ item: updatedItems }).eq("id", byId[0].id);
          break;
        }

        let { data: byOrder } = await supabase
          .from("sd_orders")
          .update({
            payment: "paid",
          })
          .eq("order_id", candId)
          .select();

        if (byOrder && byOrder.length > 0) {
          let items: any[] = [];
          if (Array.isArray(byOrder[0].item)) {
            items = byOrder[0].item;
          } else if (typeof byOrder[0].item === "string") {
            try {
              const parsed = JSON.parse(byOrder[0].item);
              if (Array.isArray(parsed)) items = parsed;
              else if (parsed && typeof parsed === "object") items = [parsed];
            } catch {}
          } else if (byOrder[0].item && typeof byOrder[0].item === "object") {
            items = [byOrder[0].item];
          }

          if (items.length === 0) {
            items = [{ name: "Food Order", price: Number(byOrder[0].total || 0), qty: 1 }];
          }

          const updatedItems = items.map((it: any, idx: number) => ({
            ...it,
            ...(idx === 0 ? { payment_method: methodVal, payment_category: category } : {})
          }));
          await supabase.from("sd_orders").update({ item: updatedItems }).eq("id", byOrder[0].id);
          break;
        }
      }
    } catch (err) {
      console.warn("Supabase markAsPaid notice:", err);
    }
  }

  // Notify reactive UI listeners to re-fetch canonical sd_orders table
  window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName: "sd_orders" } }));
}
