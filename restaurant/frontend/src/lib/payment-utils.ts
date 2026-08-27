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
      .replace(/^ord[-_]?/i, "");

  const targets = new Set([cleanRef(targetId), cleanRef(targetNum)].filter(Boolean));

  const orderKeys = [rec.id, rec.order_id, rec.order_number, rec.orderId]
    .filter(Boolean)
    .map(cleanRef);

  return orderKeys.some((k) => targets.has(k));
}

export function resolvePaymentMethod(item: any): string {
  if (!item) return "—";

  // Check if order is paid
  const rawStatus = String(item.payment || item.payment_status || item.status || "").trim().toLowerCase();
  const isPaid = rawStatus === "paid" || rawStatus === "completed";

  // Rule: Unpaid orders must show method '—'
  if (!isPaid) {
    return "—";
  }

  const firstItem = Array.isArray(item.items || item.item) ? (item.items || item.item)[0] || {} : {};

  // Inspect direct fields on item or inside item[0] JSONB
  const category = String(
    item.payment_category ||
    item.paymentCategory ||
    item.category ||
    firstItem.payment_category ||
    firstItem.category ||
    ""
  ).trim().toLowerCase();

  const rawMethod = String(
    item.payment_method ||
    item.paymentMethod ||
    item.method ||
    item.payment_type ||
    item.paymentType ||
    firstItem.payment_method ||
    firstItem.method ||
    ""
  ).trim();

  const rzpPaymentId =
    item.razorpay_payment_id ||
    item.razorpay_order_id ||
    firstItem.razorpay_payment_id ||
    firstItem.razorpay_order_id;

  const txnId = String(
    item.transaction_id ||
    item.transactionId ||
    item.txn_id ||
    item.tx_id ||
    rzpPaymentId ||
    ""
  ).trim();

  const lowerMethod = rawMethod.toLowerCase();
  const lowerTxn = txnId.toLowerCase();

  // Explicit UPI / Razorpay checks on this specific order only
  if (
    category === "upi" ||
    lowerMethod.includes("upi") ||
    lowerMethod.includes("gpay") ||
    lowerMethod.includes("phonepe") ||
    lowerMethod.includes("paytm") ||
    lowerMethod.includes("razorpay") ||
    lowerMethod.includes("online") ||
    rzpPaymentId ||
    lowerTxn.startsWith("pay_") ||
    lowerTxn.startsWith("txn_rzp") ||
    lowerTxn.includes("rzp")
  ) {
    return "UPI";
  }

  // Explicit Cash checks on this specific order only
  if (
    category === "cash" ||
    lowerMethod === "cash" ||
    lowerMethod === "cash at counter" ||
    lowerMethod.includes("cash") ||
    lowerTxn.startsWith("txn_cash")
  ) {
    return "Cash";
  }

  // Explicit Card checks on this specific order only
  if (category === "card" || lowerMethod.includes("card")) {
    return "Card";
  }

  // Custom non-empty method string on this order
  if (rawMethod && rawMethod !== "—" && lowerMethod !== "paid" && lowerMethod !== "unpaid") {
    return rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1);
  }

  return "UPI";
}
