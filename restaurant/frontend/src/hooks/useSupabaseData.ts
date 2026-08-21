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
        if (rows.length > 0) {
          const fetched = normalizeFetchedRows(tableName, rows as T[]);

          if (tableName === "sd_menu_items") {
            // Live database rows from Supabase are the single source of truth; replace state completely without merging stale deleted items
            updateLocalData(fetched);
          } else {
            updateLocalData((prev) => {
              const map = new Map<string, T>();
              prev.forEach((item) => map.set(item.id, item));

              fetched.forEach((item: any) => {
                const prevItem = (map.get(item.id) || Array.from(map.values()).find((p: any) => p.order_id === item.order_id)) as any;
                if (prevItem && tableName === "sd_orders") {
                  const STAGE_ORDER: Record<string, number> = {
                    pending: 1,
                    accepted: 2,
                    preparing: 3,
                    ready: 4,
                    completed: 5,
                    cancelled: 6,
                  };
                  const prevStage = STAGE_ORDER[prevItem.status] || 0;
                  const fetchedStage = STAGE_ORDER[item.status] || 0;

                  // Keep locally advanced stage if fetched stage from DB is older/behind
                  if (prevStage > fetchedStage) {
                    item.status = prevItem.status;
                    item.accepted_at = prevItem.accepted_at || item.accepted_at;
                    item.prep_time_minutes = prevItem.prep_time_minutes || item.prep_time_minutes;
                    item.estimated_ready_at = prevItem.estimated_ready_at || item.estimated_ready_at;
                  }
                }
                map.set(item.id, item);
              });
              return Array.from(map.values());
            });
          }
        } else if (rows.length === 0) {
          updateLocalData([]);
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
    updateLocalData((prev) => {
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
    });

    if (isSupabaseConfigured) {
      try {
        const payload = cleanPayloadForSupabase(tableName, updates as unknown as Record<string, unknown>);

        let updateErr: any = null;

        if (tableName === "sd_orders") {
          // Clean payload containing only valid Postgres DB columns
          const dbOrderPayload: Record<string, any> = {};
          if (payload.status !== undefined) dbOrderPayload.status = payload.status;
          if (payload.payment_status !== undefined || payload.payment !== undefined) {
            dbOrderPayload.payment_status = payload.payment_status || payload.payment;
          }
          if (payload.total !== undefined) dbOrderPayload.total = payload.total;
          if (payload.items !== undefined || payload.item !== undefined) {
            dbOrderPayload.items = payload.items || payload.item;
          }
          if (payload.customer_name !== undefined || payload.customer !== undefined) {
            dbOrderPayload.customer_name = payload.customer_name || payload.customer;
          }
          if (payload.accepted_at !== undefined) dbOrderPayload.accepted_at = payload.accepted_at;
          if (payload.prep_time_minutes !== undefined) dbOrderPayload.prep_time_minutes = payload.prep_time_minutes;
          if (payload.estimated_ready_at !== undefined) dbOrderPayload.estimated_ready_at = payload.estimated_ready_at;

          let { error: err1 } = await supabase.from(tableName).update(dbOrderPayload).eq("id", id);
          if (err1) {
            let { error: err2 } = await supabase.from(tableName).update(dbOrderPayload).eq("order_id", id);
            updateErr = err2;
          }
        } else if (tableName === "sd_menu_items") {
          let res = await supabase.from(tableName).update(payload).eq("id", id);
          if (res.error) {
            const fullItem = (data.find((it: any) => it.id === id) || initialData.find((it: any) => it.id === id)) as any;
            if (fullItem) {
              const fullPayload = cleanPayloadForSupabase(tableName, { ...fullItem, ...updates });
              let res2 = await supabase.from(tableName).upsert([fullPayload]);
              updateErr = res2.error;
            } else {
              updateErr = res.error;
            }
          } else {
            updateErr = res.error;
          }
        } else if (tableName === "invoices") {
          let res = await supabase.from(tableName).update(payload).eq("id", id).select();
          if (res.error || !res.data || res.data.length === 0) {
            let res2 = await supabase.from(tableName).update(payload).eq("invoice", id).select();
            updateErr = res2.error;
          } else {
            updateErr = res.error;
          }
        } else {
          let res = await supabase.from(tableName).update(payload).eq("id", id);
          updateErr = res.error;
        }

        if (updateErr) {
          console.warn(`[Supabase Update Notice on ${tableName}]:`, updateErr.message);
        }
      } catch (err) {
        console.warn(`Supabase update notice for ${tableName}:`, err);
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
  invoiceIdOrOrder: string,
  customerName?: string,
  amountVal?: number,
  methodVal: string = "Cash"
) {
  const nowIso = new Date().toISOString();
  const invId = invoiceIdOrOrder || targetId;
  const isCash = methodVal.toLowerCase().includes("cash");
  const category = isCash ? "cash" : (methodVal.toLowerCase().includes("upi") || methodVal.toLowerCase().includes("razorpay") ? "upi" : "card");

  const cleanRef = (s: any) =>
    String(s || "")
      .trim()
      .replace(/^[#]/, "")
      .replace(/^ord[-_]?/i, "")
      .replace(/^inv[-_]?/i, "");

  const c1 = cleanRef(targetId);
  const c2 = cleanRef(invId);

  const idCandidates = Array.from(
    new Set([targetId, invId, c1, c2, `#${c1}`, `ord_${c1}`, `INV-${c1}`].filter(Boolean))
  );

  if (isSupabaseConfigured) {
    try {
      // 1. Primary update: Update core 'payment = paid' column directly in sd_orders
      for (const candId of idCandidates) {
        let { data: byId } = await supabase
          .from("sd_orders")
          .update({ payment: "paid" })
          .eq("id", candId)
          .select();

        if (byId && byId.length > 0) break;

        let { data: byOrder } = await supabase
          .from("sd_orders")
          .update({ payment: "paid" })
          .eq("order_id", candId)
          .select();

        if (byOrder && byOrder.length > 0) break;
      }

      // 2. Best-effort update for payment_method and payment_category in sd_orders
      for (const candId of idCandidates) {
        try {
          await supabase
            .from("sd_orders")
            .update({ payment_method: methodVal, payment_category: category } as any)
            .or(`id.eq.${candId},order_id.eq.${candId}`);
        } catch {}
      }

      // 3. Update invoices and payments tables
      await Promise.allSettled([
        supabase
          .from("invoices")
          .update({ status: "paid", method: methodVal, date: nowIso })
          .or(`id.eq.${targetId},invoice.eq.${invId},transition.eq.${invId}`),
        supabase
          .from("payments")
          .update({ status: "paid", method: methodVal, date: nowIso })
          .or(`id.eq.${targetId},invoiceId.eq.${invId}`),
      ]);
    } catch (err) {
      console.warn("Supabase markAsPaid notice:", err);
    }
  }

  // 4. Store canonical payment record in local storage scandine_payment_records_v1
  try {
    if (typeof window !== "undefined") {
      const recordsKey = "scandine_payment_records_v1";
      let existing: any[] = [];
      const saved = localStorage.getItem(recordsKey);
      if (saved) {
        try { existing = JSON.parse(saved) || []; } catch {}
      }

      const newRec = {
        id: `txn_${targetId}`,
        transaction_id: `txn_${targetId}`,
        order_id: invId,
        invoice_id: invId,
        customer_name: customerName || "Customer",
        amount: amountVal || 0,
        total: amountVal || 0,
        method: methodVal,
        payment_method: methodVal,
        payment_category: category,
        status: "Paid",
        created_at: nowIso,
      };

      const updatedRecords = [newRec, ...existing.filter((r: any) => r.order_id !== invId && r.id !== targetId)];
      localStorage.setItem(recordsKey, JSON.stringify(updatedRecords));

      // Also sync to aura_dine_payments store
      try {
        const auraKey = "aura_dine_payments";
        let auraExisting: any[] = [];
        const auraSaved = localStorage.getItem(auraKey);
        if (auraSaved) {
          try { auraExisting = JSON.parse(auraSaved) || []; } catch {}
        }
        const updatedAura = [newRec, ...auraExisting.filter((r: any) => r.order_id !== invId && r.id !== targetId)];
        localStorage.setItem(auraKey, JSON.stringify(updatedAura));
      } catch {}

      // Sync local storage tables
      ["invoices", "payments"].forEach((tbl) => {
        try {
          const key = `mock_table_${tbl}`;
          const savedTbl = localStorage.getItem(key);
          if (savedTbl) {
            const arr = JSON.parse(savedTbl);
            const updated = arr.map((item: any) => {
              if (
                item.id === targetId ||
                item.id === invId ||
                item.invoice === invId ||
                item.invoiceId === invId ||
                item.transition === invId
              ) {
                return { ...item, status: "Paid", method: methodVal, payment_method: methodVal, payment_category: category, date: nowIso };
              }
              return item;
            });
            localStorage.setItem(key, JSON.stringify(updated));
          }
        } catch (e) {
          console.error(e);
        }
      });

      const savedOrders = localStorage.getItem("mock_table_sd_orders");
      if (savedOrders) {
        const arr = JSON.parse(savedOrders);
        const updated = arr.map((item: any) => {
          if (item.id === targetId || item.order_id === invId || item.id === invId) {
            return { ...item, payment: "paid", payment_status: "paid", method: methodVal, payment_method: methodVal, payment_category: category };
          }
          return item;
        });
        localStorage.setItem("mock_table_sd_orders", JSON.stringify(updated));
      }
    }
  } catch (e) {
    console.error(e);
  }

  // Broadcast real-time events across windows & tabs
  window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName: "invoices" } }));
  window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName: "payments" } }));
  window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName: "sd_orders" } }));

  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("aura_dine_sync_channel");
      bc.postMessage({ type: "MENU_UPDATED", tableName: "sd_orders" });
    }
  } catch {}
}
