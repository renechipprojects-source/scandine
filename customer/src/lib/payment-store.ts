// Enterprise Payment Store for managing real-time billing, invoices, and payment statuses
import { useSyncExternalStore } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { toast } from "sonner";

export type PaymentCategory = "upi" | "cash" | "card";

export type PaymentRecord = {
  id: string;
  order_id: string;
  order_number: string;
  invoice_id: string;
  table_number: string;
  customer_name: string;
  subtotal: number;
  gst: number;
  total: number;
  payment_method: string;
  payment_category: PaymentCategory;
  transaction_id: string;
  status: "paid" | "pending_verification";
  created_at: string;
  verified_at?: string;
  verified_by?: string;
};

const PAYMENTS_KEY = "scandine_payment_records_v1";

let cachedPayments: PaymentRecord[] = (() => {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(PAYMENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
})();

const listeners = new Set<() => void>();

let channel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  channel = new BroadcastChannel("aura_dine_sync_channel");
  channel.onmessage = (event) => {
    if (event.data?.type === "PAYMENTS_UPDATE") {
      cachedPayments = event.data.payments;
      try {
        localStorage.setItem(PAYMENTS_KEY, JSON.stringify(cachedPayments));
      } catch {}
      listeners.forEach((l) => l());
    }
  };
}

function persistPayments() {
  try {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(cachedPayments));
  } catch {}
  channel?.postMessage({ type: "PAYMENTS_UPDATE", payments: cachedPayments });
  listeners.forEach((l) => l());
}

export const paymentStore = {
  getPayments(): PaymentRecord[] {
    return cachedPayments;
  },

  getPaymentForOrder(orderId: string): PaymentRecord | undefined {
    return cachedPayments.find(
      (p) => p.order_id === orderId || p.order_number === orderId || p.id === orderId
    );
  },

  getPendingVerifications(): PaymentRecord[] {
    return cachedPayments.filter((p) => p.status === "pending_verification");
  },

  addPaymentRecord(record: PaymentRecord): PaymentRecord {
    // Deduplication check
    const existingIndex = cachedPayments.findIndex(
      (p) => p.id === record.id || (p.order_id === record.order_id && p.status === record.status)
    );

    if (existingIndex >= 0) {
      cachedPayments[existingIndex] = { ...cachedPayments[existingIndex], ...record };
    } else {
      cachedPayments = [record, ...cachedPayments];
    }
    persistPayments();
    return record;
  },

  verifyPayment(paymentId: string, verifiedBy: string = "Reception Staff"): boolean {
    let updated = false;
    const now = new Date().toISOString();

    cachedPayments = cachedPayments.map((p) => {
      if (p.id === paymentId || p.order_id === paymentId || p.invoice_id === paymentId) {
        updated = true;
        return {
          ...p,
          status: "paid" as const,
          verified_at: now,
          verified_by: verifiedBy,
        };
      }
      return p;
    });

    if (updated) {
      persistPayments();
      toast.success(`Payment verified and marked PAID by ${verifiedBy}`);
    }
    return updated;
  },

  setPayments(records: PaymentRecord[]) {
    cachedPayments = records;
    persistPayments();
  },
};

const SERVER_PAYMENTS: PaymentRecord[] = [];

export function useLivePayments(): PaymentRecord[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => paymentStore.getPayments(),
    () => SERVER_PAYMENTS
  );
}
