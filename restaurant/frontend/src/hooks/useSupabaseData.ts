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
  if (norm.includes("prep") || norm === "cooking") return "preparing";
  if (norm.includes("read") || norm === "kitchen ready") return "ready";
  if (norm.includes("serv") || norm === "delivered") return "served";
  if (norm.includes("comp") || norm === "done") return "completed";
  if (norm.includes("canc") || norm === "void") return "cancelled";
  return "pending";
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

          if (tableName === "sd_menu_items") {
            // Live database rows from Supabase are the single source of truth; replace state completely without merging stale deleted items
            updateLocalData(fetched, "fetch");
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
    let previousState: T[] = [];
    updateLocalData((prev) => {
      previousState = prev;
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
          // Strictly valid PostgreSQL DB columns for sd_orders table
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

          // Perform a single exact update matching either primary id or order_id
          const targetId = String(id).trim();
          let { error: singleErr } = await supabase
            .from(tableName)
            .update(dbOrderPayload)
            .or(`id.eq.${targetId},order_id.eq.${targetId}`);

          updateErr = singleErr;
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
        } else {
          let res = await supabase.from(tableName).update(payload).eq("id", id);
          updateErr = res.error;
        }

        if (updateErr) {
          console.error(`[Supabase Update Error on ${tableName}]:`, updateErr.message);
          updateLocalData(() => previousState);
          throw updateErr;
        }
      } catch (err) {
        console.error(`Supabase update error for ${tableName}:`, err);
        updateLocalData(() => previousState);
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
          const items = Array.isArray(byId[0].item) ? byId[0].item : [];
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
          const items = Array.isArray(byOrder[0].item) ? byOrder[0].item : [];
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
