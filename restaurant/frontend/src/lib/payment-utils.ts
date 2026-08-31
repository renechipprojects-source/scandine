export function parseItemsArray(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
    } catch {
      return [];
    }
  }
  if (typeof raw === "object") return [raw];
  return [];
}

export function resolvePaymentStatus(item: any): "Paid" | "Unpaid" | "Pending" | "Refunded" | "Failed" {
  if (!item) return "Unpaid";

  const items = parseItemsArray(item.items || item.item);
  const firstItem = items[0] || {};
  const rawPayment = String(
    item.payment ||
    item.payment_status ||
    item.paymentStatus ||
    firstItem.payment ||
    firstItem.payment_status ||
    ""
  ).trim().toLowerCase();

  if (rawPayment === "paid" || rawPayment === "completed" || rawPayment === "success" || rawPayment === "verified") {
    return "Paid";
  }
  if (rawPayment === "pending" || rawPayment === "pending_verification") {
    return "Pending";
  }
  if (rawPayment === "refunded") {
    return "Refunded";
  }
  if (rawPayment === "failed") {
    return "Failed";
  }
  return "Unpaid";
}

export function normalizePaymentStatus(status?: string | any): string {
  if (typeof status === "object" && status !== null) {
    return resolvePaymentStatus(status);
  }
  if (!status || status === "undefined" || status === "null") return "Unpaid";
  const s = String(status).trim().toLowerCase();
  if (s === "paid" || s === "completed" || s === "success" || s === "verified") return "Paid";
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

  const status = resolvePaymentStatus(item);
  if (status !== "Paid") {
    return "—";
  }

  const items = parseItemsArray(item.items || item.item);
  const firstItem = items[0] || {};

  // Priority 1: Top-level payment_method / payment_category or item[0] payment_method / payment_category
  const topMethod = String(item.payment_method || item.paymentMethod || item.method || item.payment_type || item.paymentType || "").trim();
  const topCategory = String(item.payment_category || item.paymentCategory || item.category || "").trim().toLowerCase();

  const itemMethod = String(firstItem.payment_method || firstItem.method || "").trim();
  const itemCategory = String(firstItem.payment_category || firstItem.category || "").trim().toLowerCase();

  const rawMethod = topMethod || itemMethod;
  const category = topCategory || itemCategory;

  const rzpPaymentId = String(
    item.razorpay_payment_id ||
    firstItem.razorpay_payment_id ||
    item.razorpay_order_id ||
    firstItem.razorpay_order_id ||
    ""
  ).trim();

  const txnId = String(
    item.transaction_id ||
    item.transactionId ||
    item.txn_id ||
    item.tx_id ||
    firstItem.transaction_id ||
    firstItem.txn_id ||
    ""
  ).trim();

  const lowerMethod = rawMethod.toLowerCase();
  const lowerTxn = txnId.toLowerCase();

  // Explicit Cash checks (Highest specificity for Cash)
  if (
    category === "cash" ||
    lowerMethod === "cash" ||
    lowerMethod === "cash at counter" ||
    lowerMethod.includes("cash") ||
    lowerTxn.startsWith("txn_cash")
  ) {
    return "Cash";
  }

  // Explicit UPI / Online / Razorpay checks
  if (
    category === "upi" ||
    lowerMethod.includes("upi") ||
    lowerMethod.includes("gpay") ||
    lowerMethod.includes("phonepe") ||
    lowerMethod.includes("paytm") ||
    lowerMethod.includes("razorpay") ||
    lowerMethod.includes("online") ||
    lowerMethod.includes("qr") ||
    (rzpPaymentId && rzpPaymentId !== "undefined" && rzpPaymentId !== "null") ||
    lowerTxn.startsWith("pay_") ||
    lowerTxn.startsWith("txn_rzp") ||
    lowerTxn.includes("rzp")
  ) {
    return "UPI";
  }

  // Explicit Card checks
  if (category === "card" || lowerMethod.includes("card")) {
    return "Card";
  }

  // Custom valid method string (e.g. "Net Banking")
  if (
    rawMethod &&
    rawMethod !== "—" &&
    lowerMethod !== "paid" &&
    lowerMethod !== "unpaid" &&
    lowerMethod !== "undefined" &&
    lowerMethod !== "null"
  ) {
    return rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1);
  }

  // If transaction ID suggests online payment (pay_ / rzp), resolve to UPI
  if (lowerTxn.startsWith("pay_") || lowerTxn.includes("rzp")) {
    return "UPI";
  }

  // Safe production behavior: Do NOT assume Cash if no explicit payment method evidence exists
  console.warn("[PAYMENT METHOD UNRESOLVED] Paid order lacks explicit payment method metadata:", {
    id: item.id || item.order_id,
    payment: item.payment,
    status: item.status,
  });

  return "—";
}

export function resolveTransactionId(item: any): string {
  if (!item) return "—";

  const items = parseItemsArray(item.items || item.item);
  const firstItem = items[0] || {};

  const rzpPaymentId = String(
    item.razorpay_payment_id ||
    firstItem.razorpay_payment_id ||
    ""
  ).trim();

  if (rzpPaymentId && rzpPaymentId !== "undefined" && rzpPaymentId !== "null") {
    return rzpPaymentId;
  }

  const rzpOrderId = String(
    item.razorpay_order_id ||
    firstItem.razorpay_order_id ||
    ""
  ).trim();

  if (rzpOrderId && rzpOrderId !== "undefined" && rzpOrderId !== "null") {
    return rzpOrderId;
  }

  const txnId = String(
    item.transaction_id ||
    item.transactionId ||
    item.txn_id ||
    item.tx_id ||
    firstItem.transaction_id ||
    firstItem.txn_id ||
    ""
  ).trim();

  if (txnId && txnId !== "undefined" && txnId !== "null" && txnId !== "—") {
    return txnId;
  }

  const orderIdentifier = String(item.order_id || item.order_number || item.id || "").trim();
  if (orderIdentifier && orderIdentifier !== "undefined" && orderIdentifier !== "null") {
    if (/^\d+$/.test(orderIdentifier)) {
      return `ORD-#${orderIdentifier}`;
    }
    return orderIdentifier.startsWith("ORD-") || orderIdentifier.startsWith("ord_")
      ? orderIdentifier
      : `ORD-${orderIdentifier}`;
  }

  return "—";
}

export function resolveInvoiceId(item: any): string {
  if (!item) return "—";

  const invId = String(
    item.invoice_id ||
    item.invoiceId ||
    item.invoice_number ||
    item.order_id ||
    item.order_number ||
    item.id ||
    ""
  ).trim();

  if (!invId || invId === "undefined" || invId === "null") {
    return "—";
  }

  if (/^\d+$/.test(invId)) {
    return `#${invId}`;
  }

  return invId;
}

export function resolveCustomerName(item: any): string {
  if (!item) return "Customer";

  const items = parseItemsArray(item.items || item.item);
  const firstItem = items[0] || {};

  const name = String(
    item.customer_name ||
    item.customerName ||
    item.customer ||
    firstItem.customer_name ||
    firstItem.customer ||
    ""
  ).trim();

  if (name && name !== "undefined" && name !== "null" && name.toLowerCase() !== "customer") {
    return name;
  }

  const tbl = item.table_number || item.tableNumber;
  if (tbl && !isNaN(Number(tbl))) {
    return `Table ${tbl}`;
  }

  return name && name !== "undefined" && name !== "null" ? name : "Customer";
}
