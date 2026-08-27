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

let cachedPayments: PaymentRecord[] = [];
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

export const paymentStore = {
  getPayments(): PaymentRecord[] {
    return cachedPayments;
  },

  getPaymentForOrder(orderId: string): PaymentRecord | undefined {
    if (!orderId) return undefined;
    const cleanId = String(orderId).replace(/^#/, "").trim().toLowerCase();
    return cachedPayments.find(
      (p) => String(p.order_id).toLowerCase() === cleanId || String(p.id).toLowerCase() === cleanId
    );
  },

  getPendingVerifications(): PaymentRecord[] {
    return cachedPayments.filter((p) => p.status === "pending_verification");
  },

  addPaymentRecord(record: PaymentRecord): PaymentRecord {
    const existingIndex = cachedPayments.findIndex(
      (p) => p.id === record.id || (p.order_id === record.order_id && p.status === record.status)
    );

    if (existingIndex >= 0) {
      cachedPayments[existingIndex] = { ...cachedPayments[existingIndex], ...record };
    } else {
      cachedPayments = [record, ...cachedPayments];
    }
    notifyListeners();
    return record;
  },

  verifyPayment(paymentId: string, verifiedBy: string = "Reception Staff"): boolean {
    let updated = false;
    const now = new Date().toISOString();

    cachedPayments = cachedPayments.map((p) => {
      if (p.id === paymentId || p.order_id === paymentId) {
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
      notifyListeners();
      toast.success(`Payment verified and marked PAID by ${verifiedBy}`);
    }
    return updated;
  },

  setPayments(records: PaymentRecord[]) {
    cachedPayments = records;
    notifyListeners();
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
