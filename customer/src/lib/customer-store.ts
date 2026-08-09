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
  try {
    if (typeof window !== "undefined") {
      const activeTable = table || (typeof localStorage !== "undefined" ? localStorage.getItem("aura_dine_table_number") || "" : "");
      const key = activeTable ? getStorageKey(activeTable) : "";
      const rawTable = key ? localStorage.getItem(key) : null;
      const rawCurrent = localStorage.getItem("scandine_current_customer");
      const raw = rawTable || rawCurrent;

      const composite = `${activeTable}|${raw || ""}`;

      if (table === cachedTable && composite === cachedComposite) {
        return cachedCustomer;
      }

      cachedTable = table;
      cachedComposite = composite;

      if (raw) {
        cachedCustomer = JSON.parse(raw);
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
      const targetTable = table || tableStore.getTableNumber() || "";
      const normTable = targetTable ? targetTable.toLowerCase().replace(/\s+/g, "") : "";
      return normTable ? (localStorage.getItem(`scandine_session_${normTable}`) || undefined) : undefined;
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

    const targetTable = details.tableNumber || tableStore.getTableNumber() || "";
    if (targetTable) {
      tableStore.setTableNumber(targetTable);
    }

    const normTable = targetTable ? targetTable.toLowerCase().replace(/\s+/g, "") : "";
    
    // Check if existing customer profile matches (Deduplication by phone & table)
    const existing = targetTable ? this.getCustomer(targetTable) : null;
    let sessionId = existing?.sessionId;

    if (!sessionId && normTable) {
      try {
        const savedSession = localStorage.getItem(`scandine_session_${normTable}`);
        if (savedSession) sessionId = savedSession;
      } catch {}
    }

    if (!sessionId) {
      sessionId = `session_${normTable || "guest"}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const customer: CustomerDetails = {
      fullName: details.fullName,
      phone: details.phone,
      email: details.email,
      tableNumber: targetTable,
      registeredAt: existing?.registeredAt || new Date().toISOString(),
      sessionId,
    };

    const key = targetTable ? getStorageKey(targetTable) : "scandine_customer_guest";
    try {
      if (targetTable) {
        localStorage.setItem(key, JSON.stringify(customer));
      }
      localStorage.setItem("scandine_current_customer", JSON.stringify(customer));
      if (normTable) {
        localStorage.setItem(`scandine_session_${normTable}`, sessionId);
      }
    } catch (e) {
      console.error("Failed to save customer details locally:", e);
    }

    if (isSupabaseConfigured() && targetTable) {
      try {
        const tblNum = parseInt(String(targetTable).replace(/\D/g, ""), 10);
        if (tblNum && !isNaN(tblNum)) {
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
        }
      } catch (err) {
        console.warn("Supabase customer registration save error:", err);
      }
    }

    cachedTable = null;
    cachedComposite = null;
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
    cachedComposite = null;
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
