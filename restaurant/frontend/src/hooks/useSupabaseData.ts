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

  if (tableName === "customers") {
    delete cleaned.visits;
    delete cleaned.spent;
    delete cleaned.tier;
    delete cleaned.avatar;
  } else if (tableName === "suppliers") {
    delete cleaned.items;
  } else if (tableName === "sd_purchase_orders") {
    delete cleaned.entry_type;
  } else if (tableName === "sd_menu_items") {
    if (cleaned.image_url || cleaned.image) {
      cleaned.image = (cleaned.image || cleaned.image_url) as string;
      cleaned.image_url = (cleaned.image_url || cleaned.image) as string;
    }
    if (cleaned.category || cleaned.category_id || cleaned.category_name) {
      const CATEGORY_MAP: Record<string, string> = {
        Breakfast: "cat_1",
        Lunch: "cat_2",
        Dinner: "cat_3",
        Starters: "cat_4",
        Desserts: "cat_5",
        Drinks: "cat_6",
      };
      const catVal = String(cleaned.category || cleaned.category_name || "");
      if (catVal && CATEGORY_MAP[catVal]) {
        cleaned.category_id = CATEGORY_MAP[catVal];
      } else if (!cleaned.category_id) {
        cleaned.category_id = "cat_1";
      }
    }
    delete cleaned.category;
    delete cleaned.category_name;
    delete cleaned.status;
    delete cleaned.prepTime;
    delete cleaned.spicy;
    delete cleaned.veg;
    delete cleaned.popular;
    delete cleaned.featured;
    delete cleaned.emoji;
  } else if (tableName === "invoices") {
    if (typeof cleaned.status === "string") {
      cleaned.status = cleaned.status.toLowerCase();
    }
  } else if (tableName === "payments") {
    if (typeof cleaned.status === "string") {
      cleaned.status = cleaned.status.toLowerCase();
    }
  } else if (tableName === "sd_orders") {
    if (typeof cleaned.status === "string") {
      cleaned.status = cleaned.status.toLowerCase();
    }
    if (typeof cleaned.payment === "string") {
      cleaned.payment = cleaned.payment.toLowerCase();
    }
  }

  return cleaned;
}

// Helper to normalize rows fetched from Supabase
function normalizeFetchedRows<T>(tableName: string, rows: T[]): T[] {
  if (tableName === "sd_menu_items") {
    const ID_TO_CATEGORY: Record<string, string> = {
      cat_1: "Breakfast",
      cat_2: "Lunch",
      cat_3: "Dinner",
      cat_4: "Starters",
      cat_5: "Desserts",
      cat_6: "Drinks",
    };
    return rows.map((r: any) => {
      const catName = r.category_name || r.category || (r.category_id ? ID_TO_CATEGORY[r.category_id] : null) || "Lunch";
      return {
        ...r,
        category: catName,
        category_name: catName,
        image_url: r.image_url || r.image,
        image: r.image || r.image_url,
        status: r.status || (r.available ? "Available" : "Unavailable"),
      };
    });
  }
  return rows;
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
      if (saved) return JSON.parse(saved);
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
  const updateLocalData = useCallback((newVal: T[] | ((prev: T[]) => T[])) => {
    setData((prev) => {
      const updated = typeof newVal === "function" ? newVal(prev) : newVal;
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName } }));
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
            updateLocalData(normalizeFetchedRows(tableName, rows2 as T[]));
          }
        }
      } else if (rows) {
        updateLocalData(normalizeFetchedRows(tableName, rows as T[]));
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
      if (!customEv.detail || customEv.detail.tableName === tableName) {
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
          console.error(`[Supabase Insert Error on ${tableName}]:`, res.error.message);
          updateLocalData((prev) => prev.filter((item) => item.id !== created.id));
          throw new Error(res.error.message || `Failed to save to ${tableName}`);
        } else if (res.data) {
          const finalItem = { ...created, ...res.data } as T;
          updateLocalData((prev) =>
            prev.map((item) => (item.id === created.id ? finalItem : item)),
          );
          return finalItem;
        }
      } catch (err: any) {
        console.error(`Supabase insert exception for ${tableName}:`, err);
        updateLocalData((prev) => prev.filter((item) => item.id !== created.id));
        throw err;
      }
    }
    return created;
  };

  // UPDATE
  const updateItem = async (id: string, updates: Partial<T>) => {
    updateLocalData((prev) => {
      const exists = prev.some((item) => item.id === id);
      if (!exists && initialData.length > 0) {
        const fromInitial = initialData.find((item) => item.id === id);
        if (fromInitial) {
          return [{ ...fromInitial, ...updates }, ...prev];
        }
      }
      return prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
    });

    if (isSupabaseConfigured) {
      try {
        const payload = cleanPayloadForSupabase(tableName, updates as unknown as Record<string, unknown>);
        let query = supabase.from(tableName).update(payload);
        if (tableName === "invoices") {
          query = query.or(`id.eq.${id},invoice.eq.${id}`);
        } else {
          query = query.eq("id", id);
        }
        let { error: updateErr } = await query;

        if (updateErr && (updateErr.code === "42703" || updateErr.message.toLowerCase().includes("column"))) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.paid_at;
          delete fallbackPayload.transaction_id;
          let retryQuery = supabase.from(tableName).update(fallbackPayload);
          if (tableName === "invoices") {
            retryQuery = retryQuery.or(`id.eq.${id},invoice.eq.${id}`);
          } else {
            retryQuery = retryQuery.eq("id", id);
          }
          const { error: retryErr } = await retryQuery;
          updateErr = retryErr;
        }

        if (updateErr) {
          console.error(`[Supabase Update Error on ${tableName}]:`, updateErr.message);
        }
      } catch (err) {
        console.error(`Supabase update exception for ${tableName}:`, err);
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
        }
      } catch (err) {
        console.error(`Supabase delete exception for ${tableName}:`, err);
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
  invoiceIdOrOrder: string,
  customerName?: string,
  amountVal?: number,
  methodVal?: string
) {
  const nowIso = new Date().toISOString();
  const invId = invoiceIdOrOrder || targetId;

  if (isSupabaseConfigured) {
    try {
      await Promise.all([
        supabase
          .from("invoices")
          .update({ status: "paid", date: nowIso })
          .or(`id.eq.${targetId},invoice.eq.${invId},transition.eq.${invId}`),
        supabase
          .from("payments")
          .update({ status: "paid", date: nowIso })
          .or(`id.eq.${targetId},invoiceId.eq.${invId}`),
        supabase
          .from("sd_orders")
          .update({ payment: "paid" })
          .or(`id.eq.${targetId},order_id.eq.${invId}`),
      ]);
    } catch (err) {
      console.warn("Optimized Supabase batch update notice:", err);
    }
  }

  // Sync local storage tables
  ["invoices", "payments"].forEach((tbl) => {
    try {
      const key = `mock_table_${tbl}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const arr = JSON.parse(saved);
        const updated = arr.map((item: any) => {
          if (
            item.id === targetId ||
            item.id === invId ||
            item.invoice === invId ||
            item.invoiceId === invId ||
            item.transition === invId
          ) {
            return { ...item, status: "Paid", date: nowIso };
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }
  });

  try {
    const savedOrders = localStorage.getItem("mock_table_sd_orders");
    if (savedOrders) {
      const arr = JSON.parse(savedOrders);
      const updated = arr.map((item: any) => {
        if (item.id === targetId || item.order_id === invId || item.id === invId) {
          return { ...item, payment: "paid" };
        }
        return item;
      });
      localStorage.setItem("mock_table_sd_orders", JSON.stringify(updated));
    }
  } catch (e) {
    console.error(e);
  }

  window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName: "invoices" } }));
  window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName: "payments" } }));
  window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName: "sd_orders" } }));
}
