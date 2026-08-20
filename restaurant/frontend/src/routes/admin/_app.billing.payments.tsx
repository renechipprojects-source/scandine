import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { StatusBadge } from "@/admin/components/layout/StatusBadge";
import { Card } from "@/admin/components/ui/card";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/admin/components/ui/table";
import { CreditCard, Search, Download, Banknote, Smartphone } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useCallback } from "react";
import { useSupabaseTable, type PaymentTransaction, type Order } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { exportToCSV } from "@/admin/lib/exportUtils";

export const Route = createFileRoute("/admin/_app/billing/payments")({
  head: () => ({ meta: [{ title: "Payments — ScanDine" }, { name: "description", content: "Payment transaction history across all methods." }] }),
  component: PaymentsPage,
});

const formatINR = (val: number) => {
  return "₹" + Number(val || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

function normalizePaymentStatus(status?: string): string {
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

// Exact reference matching across order and payment identifiers
function exactMatchRef(rec: any, targetId: string, targetNum?: string): boolean {
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

function resolvePaymentMethod(item: any): string {
  if (!item) return "—";

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

  // 1. Explicit Category check
  if (category === "upi") return "UPI";
  if (category === "cash") return "Cash";
  if (category === "card") return "Card";

  // 2. Transaction ID signature check
  if (lowerTxn.startsWith("txn_cash") || lowerId.startsWith("txn_cash")) {
    return "Cash";
  }
  if (
    lowerTxn.startsWith("pay_") ||
    lowerTxn.startsWith("txn_rzp") ||
    lowerTxn.includes("rzp") ||
    lowerId.startsWith("pay_") ||
    lowerId.startsWith("txn_rzp")
  ) {
    return "UPI";
  }

  // 3. Explicit Method string check
  if (
    lowerMethod === "cash" ||
    lowerMethod === "cash at counter" ||
    lowerMethod.includes("cash")
  ) {
    return "Cash";
  }

  if (
    lowerMethod.includes("upi") ||
    lowerMethod.includes("gpay") ||
    lowerMethod.includes("phonepe") ||
    lowerMethod.includes("paytm") ||
    lowerMethod.includes("razorpay") ||
    lowerMethod.includes("online") ||
    lowerMethod.includes("qr")
  ) {
    return "UPI";
  }

  if (lowerMethod.includes("card") || lowerMethod.includes("credit card") || lowerMethod.includes("debit card")) {
    return "Card";
  }

  // 4. Custom non-empty method string
  if (rawMethod && rawMethod !== "—" && rawMethod.toLowerCase() !== "paid" && rawMethod.toLowerCase() !== "unpaid") {
    return rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1);
  }

  return "—";
}

function PaymentsPage() {
  const { data: dbOrders, fetchData: fetchOrders } = useSupabaseTable<Order>("sd_orders");

  const [searchQuery, setSearchQuery] = useState("");

  const handleRealtimePayload = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useRealtimeTable("sd_orders", handleRealtimePayload);

  // Derive real canonical payment transactions from sd_orders & local payment store
  const paymentsList: PaymentTransaction[] = (() => {
    const list: PaymentTransaction[] = [];
    const seenOrderKeys = new Set<string>();

    let localRecords: any[] = [];
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("scandine_payment_records_v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) localRecords = parsed;
        }
      }
    } catch {}

    const findLocalRecordForRef = (refId: string, refNum?: string) => {
      return localRecords.find((l: any) => exactMatchRef(l, refId, refNum));
    };

    // 1. Process all real orders from Supabase sd_orders
    for (const ord of dbOrders) {
      const orderKey = String(ord.order_id || ord.id || "").trim().toLowerCase();
      if (!orderKey || seenOrderKeys.has(orderKey)) continue;
      seenOrderKeys.add(orderKey);

      const matchedLocal = findLocalRecordForRef(orderKey, ord.order_id || (ord as any).order_number);

      const combined = {
        ...matchedLocal,
        ...ord,
      };

      const rawStatus = ord.payment || (ord as any).payment_status || matchedLocal?.status || ord.status;
      const normStatus = normalizePaymentStatus(rawStatus);

      let normMethod = "—";
      if (normStatus === "Paid") {
        normMethod = resolvePaymentMethod(combined);
      } else if (normStatus === "Pending") {
        normMethod = resolvePaymentMethod(combined) !== "—" ? resolvePaymentMethod(combined) : "Pending";
      }

      const txnId =
        matchedLocal?.transaction_id ||
        (ord as any).transaction_id ||
        ord.order_id ||
        ord.id;

      const invoiceDisplay =
        matchedLocal?.invoice_id ||
        (ord as any).invoice_id ||
        ord.order_id ||
        ord.id;

      const customerName =
        (ord as any).customer_name ||
        ord.customer ||
        matchedLocal?.customer_name ||
        "Customer";

      const totalAmount = Number(
        matchedLocal?.total ||
        matchedLocal?.amount ||
        ord.total ||
        0
      );

      const txnDate =
        matchedLocal?.created_at ||
        ord.order_time ||
        (ord as any).created_at ||
        new Date().toISOString();

      list.push({
        id: txnId,
        invoiceId: invoiceDisplay,
        customer: customerName,
        method: normMethod,
        amount: totalAmount,
        status: normStatus as any,
        date: txnDate,
        transaction_id: txnId,
      });
    }

    // 2. Include local payment records that are not in dbOrders
    for (const loc of localRecords) {
      const locKey = String(loc.order_id || loc.order_number || loc.id || "").trim().toLowerCase();
      if (!locKey || seenOrderKeys.has(locKey)) continue;
      seenOrderKeys.add(locKey);

      const normStatus = normalizePaymentStatus(loc.status);
      let normMethod = "—";
      if (normStatus === "Paid") {
        normMethod = resolvePaymentMethod(loc);
      } else if (normStatus === "Pending") {
        normMethod = resolvePaymentMethod(loc) !== "—" ? resolvePaymentMethod(loc) : "Pending";
      }

      list.push({
        id: loc.transaction_id || loc.id,
        invoiceId: loc.invoice_id || loc.order_id || loc.id,
        customer: loc.customer_name || "Customer",
        method: normMethod,
        amount: Number(loc.total || loc.amount || 0),
        status: normStatus as any,
        date: loc.created_at || new Date().toISOString(),
        transaction_id: loc.transaction_id || loc.id,
      });
    }

    return list.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return timeB - timeA;
    });
  })();

  const paidTransactions = paymentsList.filter(
    (p) => p.status === "Paid"
  );

  const cashTotal = paidTransactions
    .filter((p) => p.method === "Cash")
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const upiTotal = paidTransactions
    .filter((p) => p.method === "UPI")
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const cardTotal = paidTransactions
    .filter((p) => p.method === "Card")
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const methodBreakdown = [
    { method: "Cash", amount: cashTotal, icon: Banknote },
    { method: "UPI", amount: upiTotal, icon: Smartphone },
    ...(cardTotal > 0 ? [{ method: "Card", amount: cardTotal, icon: CreditCard }] : []),
  ];

  const totalGrossSales = paidTransactions.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const filtered = paymentsList.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.id && p.id.toLowerCase().includes(q)) ||
      (p.invoiceId && p.invoiceId.toLowerCase().includes(q)) ||
      (p.customer && p.customer.toLowerCase().includes(q)) ||
      (p.method && p.method.toLowerCase().includes(q)) ||
      (p.status && p.status.toLowerCase().includes(q))
    );
  });

  const handleExport = () => {
    const exportData = filtered.map((p) => ({
      TransactionID: p.transaction_id || p.id,
      InvoiceID: p.invoiceId,
      Customer: p.customer,
      Method: p.method,
      Date: p.date ? new Date(p.date).toLocaleDateString() : "Today",
      Amount: p.amount,
      Status: p.status,
    }));
    exportToCSV("payments_history", exportData);
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Payments"
        description="Track every transaction across Cash and UPI."
        icon={<CreditCard className="h-5 w-5" />}
        actions={<Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Export</Button>}
      />

      <div className={`grid grid-cols-1 gap-3 w-full ${methodBreakdown.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {methodBreakdown.map((m) => (
          <Card key={m.method} className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <m.icon className="h-3.5 w-3.5" /> {m.method}
            </div>
            <div className="mt-1 font-display text-xl font-bold">{formatINR(m.amount)}</div>
            <div className="text-[10px] text-muted-foreground">
              {totalGrossSales > 0 ? Math.round((m.amount / totalGrossSales) * 100) : 0}% of total
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 w-full">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-display text-base font-semibold">Payment Methods Distribution</div>
            <div className="text-xs text-muted-foreground">Cash vs UPI revenue</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={methodBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 60)" vertical={false} />
            <XAxis dataKey="method" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(val: any) => [formatINR(Number(val)), "Amount"]}
              contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 60)", fontSize: 12 }}
            />
            <Bar dataKey="amount" fill="oklch(0.68 0.19 40)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Full Width Payment List with Dedicated Independent Scrollbar */}
      <Card className="w-full p-4 border shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold">Payment Transactions</h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {filtered.length} records
            </span>
          </div>
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transaction ID, invoice, or method…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Payment Table with Visible Scrollbar and Frozen Sticky Header */}
        <Table className="w-full min-w-[700px]" containerClassName="max-h-[380px] overflow-y-auto overflow-x-auto scrollbar-thin rounded-lg border border-border bg-card shadow-xs relative">
          <TableHeader className="sticky top-0 z-30 bg-muted/95 backdrop-blur-md shadow-xs border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Transaction / Txn ID</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Invoice</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Customer</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Method</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Date</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 text-right font-semibold text-foreground">Amount</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No payment transactions found in database.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                return (
                  <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold">
                      {p.transaction_id || p.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.invoiceId}</TableCell>
                    <TableCell className="font-medium text-foreground">{p.customer}</TableCell>
                    <TableCell>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium border border-border/50">
                        {p.method}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.date ? (isNaN(Date.parse(p.date)) ? p.date : new Date(p.date).toLocaleDateString()) : "Today"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {formatINR(Number(p.amount) || 0)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
