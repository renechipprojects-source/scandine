import { useSyncExternalStore, useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

export type CustomerDetails = {
  fullName: string;
  phone: string;
  email?: string;
  tableNumber: string;
  registeredAt: string;
  sessionId?: string;
};

const getStorageKey = (table: string) =>
  `scandine_customer_${table.toLowerCase().replace(/\s+/g, "")}`;

let cachedTable: string | null = null;
let cachedComposite: string | null = null;
let cachedCustomer: CustomerDetails | null = null;

function loadCustomer(table: string): CustomerDetails | null {
  if (!table) return null;
  try {
    if (typeof window !== "undefined") {
      const key = getStorageKey(table);
      const raw = localStorage.getItem(key);
      const rawCurrent = localStorage.getItem("scandine_current_customer");
      const composite = `${raw || ""}|${rawCurrent || ""}`;

      if (table === cachedTable && composite === cachedComposite) {
        return cachedCustomer;
      }

      cachedTable = table;
      cachedComposite = composite;

      if (raw) {
        cachedCustomer = JSON.parse(raw);
        return cachedCustomer;
      }

      if (rawCurrent) {
        const current: CustomerDetails = JSON.parse(rawCurrent);
        cachedCustomer = {
          ...current,
          tableNumber: table,
        };
        return cachedCustomer;
      }
    }
  } catch {}

  cachedTable = table;
  cachedComposite = null;
  cachedCustomer = null;
  return null;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const customerStore = {
  getCustomer(table: string): CustomerDetails | null {
    return loadCustomer(table);
  },

  getSessionId(table: string): string | undefined {
    const cust = this.getCustomer(table);
    if (cust?.sessionId) return cust.sessionId;
    try {
      const normTable = table.toLowerCase().replace(/\s+/g, "");
      return localStorage.getItem(`scandine_session_${normTable}`) || undefined;
    } catch {
      return undefined;
    }
  },

  async registerCustomer(details: {
    fullName: string;
    phone: string;
    email?: string;
    tableNumber: string;
  }): Promise<CustomerDetails> {
    const cleanPhone = (details.phone || "").trim().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      throw new Error("Mobile number must be exactly 10 digits.");
    }
    const cleanName = (details.fullName || "").trim();
    if (!cleanName) {
      throw new Error("Full name is required.");
    }

    const normTable = details.tableNumber.toLowerCase().replace(/\s+/g, "");
    
    // Check if existing customer profile matches (Deduplication by phone & table)
    const existing = this.getCustomer(details.tableNumber);
    let sessionId = existing?.sessionId;

    if (!sessionId) {
      try {
        const savedSession = localStorage.getItem(`scandine_session_${normTable}`);
        if (savedSession) sessionId = savedSession;
      } catch {}
    }

    if (!sessionId) {
      sessionId = `session_${normTable}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const customer: CustomerDetails = {
      fullName: details.fullName,
      phone: details.phone,
      email: details.email,
      tableNumber: details.tableNumber,
      registeredAt: existing?.registeredAt || new Date().toISOString(),
      sessionId,
    };

    const key = getStorageKey(details.tableNumber);
    try {
      localStorage.setItem(key, JSON.stringify(customer));
      localStorage.setItem("scandine_current_customer", JSON.stringify(customer));
      localStorage.setItem(`scandine_session_${normTable}`, sessionId);
    } catch (e) {
      console.error("Failed to save customer details locally:", e);
    }

    if (isSupabaseConfigured()) {
      try {
        const tblNum = parseInt(String(details.tableNumber).replace(/\D/g, ""), 10) || 1;
        
        // Deduplication in Supabase: Check if customer with same phone and table already registered recently
        const { data: existingDb } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", details.phone)
          .eq("table_number", tblNum)
          .maybeSingle();

        if (!existingDb) {
          await supabase.from("customers").insert([
            {
              full_name: details.fullName,
              phone: details.phone,
              email: details.email || null,
              table_number: tblNum,
              created_at: customer.registeredAt,
            },
          ]);
        }
      } catch (err) {
        console.warn("Supabase customer registration save error:", err);
      }
    }

    cachedTable = null;
    cachedRaw = null;
    emit();
    return customer;
  },

  clearCustomer(table: string) {
    try {
      const normTable = table.toLowerCase().replace(/\s+/g, "");
      localStorage.removeItem(getStorageKey(table));
      localStorage.removeItem(`scandine_session_${normTable}`);
      localStorage.removeItem("scandine_current_customer");
    } catch {}
    cachedTable = null;
    cachedRaw = null;
    emit();
  },
};

const SERVER_CUSTOMER: CustomerDetails | null = null;

export function useCustomer(table: string): CustomerDetails | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const storeCust = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => loadCustomer(table),
    () => SERVER_CUSTOMER
  );

  return mounted ? storeCust : null;
}
