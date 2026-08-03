import { useSyncExternalStore } from "react";
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
let cachedRaw: string | null = null;
let cachedCustomer: CustomerDetails | null = null;

function loadCustomer(table: string): CustomerDetails | null {
  try {
    if (typeof window !== "undefined") {
      const key = getStorageKey(table);
      const raw = localStorage.getItem(key);
      if (table === cachedTable && raw === cachedRaw) {
        return cachedCustomer;
      }
      cachedTable = table;
      cachedRaw = raw;
      cachedCustomer = raw ? JSON.parse(raw) : null;
      return cachedCustomer;
    }
  } catch {}
  return null;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const customerStore = {
  getCustomer(table: string): CustomerDetails | null {
    // 1. Try table specific customer
    const tableCust = loadCustomer(table);
    if (tableCust) return tableCust;

    // 2. Fallback to global current customer if table matches
    try {
      if (typeof window !== "undefined") {
        const rawCurrent = localStorage.getItem("scandine_current_customer");
        if (rawCurrent) {
          const current: CustomerDetails = JSON.parse(rawCurrent);
          const cTableDigits = current.tableNumber.replace(/\D/g, "");
          const targetDigits = table.replace(/\D/g, "");
          if (cTableDigits && targetDigits && cTableDigits === targetDigits) {
            // Restore for this table
            const key = getStorageKey(table);
            localStorage.setItem(key, JSON.stringify(current));
            return current;
          }
        }
      }
    } catch {}

    return null;
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
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => loadCustomer(table),
    () => SERVER_CUSTOMER
  );
}
