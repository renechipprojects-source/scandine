export function normalizePaymentStatus(status?: string): string {
  if (!status) return "Unpaid";
  const s = String(status).trim().toLowerCase();
  if (s === "paid" || s === "completed") return "Paid";
  if (s === "pending" || s === "pending_verification") return "Pending";
  if (s === "failed") return "Failed";
  if (s === "cancelled") return "Cancelled";
  if (s === "refunded") return "Refunded";
  if (s === "unpaid") return "Unpaid";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function exactMatchRef(rec: any, targetId: string, targetNum?: string): boolean {
  if (!rec || !targetId) return false;

  const cleanRef = (s: any) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/^[#]/, "")
      .replace(/^ord[-_]?/i, "")
      .replace(/^pmt[-_]?/i, "")
      .replace(/^inv[-_]?/i, "");

  const targets = [cleanRef(targetId), cleanRef(targetNum)].filter(Boolean);

  const keys = [
    rec.id,
    rec.order_id,
    rec.order_number,
    rec.orderId,
    rec.invoiceId,
    rec.invoice_id,
    rec.invoice,
    rec.transition,
    rec.transaction_id,
  ]
    .filter(Boolean)
    .map(cleanRef);

  for (const k of keys) {
    if (k && targets.includes(k)) return true;
  }
  return false;
}

export function resolvePaymentMethod(item: any): string {
  if (!item) return "—";

  // 1. Direct fields on item
  const category = String(
    item.payment_category ||
    item.paymentCategory ||
    item.category ||
    ""
  ).trim().toLowerCase();

  const rawMethod = String(
    item.payment_method ||
    item.paymentMethod ||
    item.method ||
    item.payment_type ||
    item.paymentType ||
    ""
  ).trim();

  const txnId = String(
    item.transaction_id ||
    item.transactionId ||
    item.txn_id ||
    item.tx_id ||
    item.razorpay_payment_id ||
    item.razorpay_order_id ||
    ""
  ).trim();

  const lowerMethod = rawMethod.toLowerCase();
  const lowerTxn = txnId.toLowerCase();
  const lowerId = String(item.id || "").toLowerCase();

  // Explicit UPI checks on item
  if (
    category === "upi" ||
    lowerMethod.includes("upi") ||
    lowerMethod.includes("gpay") ||
    lowerMethod.includes("phonepe") ||
    lowerMethod.includes("paytm") ||
    lowerMethod.includes("razorpay") ||
    lowerMethod.includes("online") ||
    item.razorpay_payment_id ||
    item.razorpay_order_id ||
    lowerTxn.startsWith("pay_") ||
    lowerTxn.startsWith("txn_rzp") ||
    lowerTxn.includes("rzp") ||
    lowerId.startsWith("pay_") ||
    lowerId.startsWith("txn_rzp")
  ) {
    return "UPI";
  }

  // Explicit Cash checks on item
  if (
    category === "cash" ||
    lowerMethod === "cash" ||
    lowerMethod === "cash at counter" ||
    lowerMethod.includes("cash") ||
    lowerTxn.startsWith("txn_cash") ||
    lowerId.startsWith("txn_cash")
  ) {
    return "Cash";
  }

  if (category === "card" || lowerMethod.includes("card")) {
    return "Card";
  }

  // 2. Check local payment stores (scandine_payment_records_v1, aura_dine_payments, etc.)
  try {
    if (typeof window !== "undefined") {
      const storeKeys = [
        "scandine_payment_records_v1",
        "aura_dine_payments",
        "mock_table_payments",
        "mock_table_invoices",
        "mock_table_sd_orders",
      ];

      for (const sKey of storeKeys) {
        const stored = localStorage.getItem(sKey);
        if (!stored) continue;
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const match = parsed.find((p: any) =>
              exactMatchRef(p, item.id || item.order_id, item.order_id || item.invoice_id || item.order_number)
            );
            if (match) {
              const mCat = String(match.payment_category || match.category || "").trim().toLowerCase();
              const mMethod = String(match.payment_method || match.method || "").trim().toLowerCase();
              const mTxn = String(match.transaction_id || match.razorpay_payment_id || "").trim().toLowerCase();

              if (mCat === "upi" || mMethod.includes("upi") || mMethod.includes("gpay") || mMethod.includes("razorpay") || mMethod.includes("online") || mTxn.startsWith("pay_") || mTxn.includes("rzp")) {
                return "UPI";
              }
              if (mCat === "cash" || mMethod.includes("cash") || mTxn.startsWith("txn_cash")) {
                return "Cash";
              }
              if (mCat === "card" || mMethod.includes("card")) {
                return "Card";
              }
            }
          }
        } catch {}
      }

      // Check customer session order stores
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("aura_dine_orders_")) {
          const stored = localStorage.getItem(key);
          if (!stored) continue;
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const match = parsed.find((p: any) =>
                exactMatchRef(p, item.id || item.order_id, item.order_id || item.invoice_id || item.order_number)
              );
              if (match) {
                const mCat = String(match.payment_category || match.category || "").trim().toLowerCase();
                const mMethod = String(match.payment_method || match.method || "").trim().toLowerCase();
                if (mCat === "upi" || mMethod.includes("upi") || mMethod.includes("razorpay") || match.razorpay_payment_id) {
                  return "UPI";
                }
                if (mCat === "cash" || mMethod.includes("cash")) {
                  return "Cash";
                }
              }
            }
          } catch {}
        }
      }
    }
  } catch {}

  // 3. Fallback channel hints
  const channel = String(item.channel || item.order_channel || "").trim().toLowerCase();
  if (channel === "counter") return "Cash";
  if (channel === "waiter") return "Cash";

  // 4. Custom non-empty method string
  if (rawMethod && rawMethod !== "—" && lowerMethod !== "paid" && lowerMethod !== "unpaid") {
    return rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1);
  }

  // 5. For paid transactions with unspecified method text
  const statusStr = String(item.payment_status || item.payment || item.status || "").trim().toLowerCase();
  if (statusStr === "paid" || statusStr === "completed") {
    if (item.razorpay_payment_id || item.razorpay_order_id) {
      return "UPI";
    }
    return "Cash";
  }

  return "Cash";
}
