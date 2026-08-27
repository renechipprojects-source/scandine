import { useSyncExternalStore, useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { tableStore } from "./table-store";
import { cart } from "./cart-store";
import { notificationStore } from "./notification-store";
import { liveOrderStore } from "./live-order-store";

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
      const activeTable = table || localStorage.getItem("aura_dine_table_number") || "";
      const normTable = activeTable ? activeTable.toLowerCase().replace(/\s+/g, "") : "";
      
      const rawCurrent = localStorage.getItem("scandine_current_customer");
      let currentCust: CustomerDetails | null = null;
      if (rawCurrent) {
        try { currentCust = JSON.parse(rawCurrent); } catch {}
      }

      let tableCust: CustomerDetails | null = null;
      if (normTable) {
        const rawTable = localStorage.getItem(getStorageKey(activeTable));
        if (rawTable) {
          try { tableCust = JSON.parse(rawTable); } catch {}
        }
      }

      // Priority 1: Current customer if table matches
      const targetCust = currentCust || tableCust;

      const composite = `${activeTable}|${targetCust?.sessionId || ""}|${targetCust?.registeredAt || ""}`;

      if (table === cachedTable && composite === cachedComposite) {
        return cachedCustomer;
      }

      cachedTable = table;
      cachedComposite = composite;
      cachedCustomer = targetCust;
      return cachedCustomer;
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
    
    // Always generate a unique session ID for every new customer registration
    const sessionId = `session_${normTable || "guest"}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const customer: CustomerDetails = {
      fullName: cleanName,
      phone: cleanPhone,
      email: details.email ? details.email.trim() : "",
      tableNumber: targetTable,
      registeredAt: new Date().toISOString(),
      sessionId,
    };

    // Reset cart, notifications, and live order caches for the new session
    cart.clearCartForNewSession();
    notificationStore.resetForNewSession(sessionId);
    liveOrderStore.resetForNewSession();

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

    // Optional Supabase sync wrapped safely without breaking registration
    if (isSupabaseConfigured() && targetTable) {
      try {
        const tblNum = parseInt(String(targetTable).replace(/\D/g, ""), 10);
        if (tblNum && !isNaN(tblNum)) {
          // Attempt insert into sd_customers if table exists
          await supabase.from("sd_customers").insert([
            {
              full_name: customer.fullName,
              phone: customer.phone,
              email: customer.email || null,
              table_number: tblNum,
              session_id: customer.sessionId,
              created_at: customer.registeredAt,
            },
          ]);
        }
      } catch (err) {
        console.warn("Non-blocking Supabase customer registration sync warning:", err);
      }
    }

    cachedTable = null;
    cachedComposite = null;
    cachedCustomer = customer;
    emit();
    return customer;
  },

  clearCustomer(table: string) {
    try {
      const normTable = table ? table.toLowerCase().replace(/\s+/g, "") : "";
      if (table) {
        localStorage.removeItem(getStorageKey(table));
      }
      if (normTable) {
        localStorage.removeItem(`scandine_session_${normTable}`);
      }
      localStorage.removeItem("scandine_current_customer");
    } catch {}
    cachedTable = null;
    cachedComposite = null;
    cachedCustomer = null;
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
    () => (typeof window !== "undefined" ? loadCustomer(table) : null),
    () => null
  );
}
