import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { StatusBadge } from "@/admin/components/layout/StatusBadge";
import { Card } from "@/admin/components/ui/card";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/admin/components/ui/table";
import { CreditCard, Search, Download, Banknote, Smartphone, DollarSign, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState, useCallback, useMemo } from "react";
import { useSupabaseTable, type PaymentTransaction, type Order } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { exportToCSV } from "@/admin/lib/exportUtils";
import { normalizePaymentStatus, resolvePaymentMethod } from "@/lib/payment-utils";

export const Route = createFileRoute("/admin/_app/billing/payments")({
  head: () => ({ meta: [{ title: "Payments — ScanDine" }, { name: "description", content: "Payment transaction history across all methods." }] }),
  component: PaymentsPage,
});

const formatINR = (val: number) => {
  return "₹" + Number(val || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

function PaymentsPage() {
  const { data: dbOrders, fetchData: fetchOrders } = useSupabaseTable<Order>("sd_orders");
  const [searchQuery, setSearchQuery] = useState("");

  const handleRealtimePayload = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useRealtimeTable("sd_orders", handleRealtimePayload);

  // Derive real canonical payment transactions directly from Supabase sd_orders
  const paymentsList: PaymentTransaction[] = useMemo(() => {
    const list: PaymentTransaction[] = [];
    const seenOrderKeys = new Set<string>();

    for (const ord of dbOrders) {
      const orderKey = String(ord.order_id || ord.id || "").trim().toLowerCase();
      if (!orderKey || seenOrderKeys.has(orderKey)) continue;
      seenOrderKeys.add(orderKey);

      const rawStatus = ord.payment || (ord as any).payment_status || ord.status;
      const normStatus = normalizePaymentStatus(rawStatus);
      const normMethod = resolvePaymentMethod(ord);

      const txnId = (ord as any).transaction_id || ord.order_id || ord.id;
      const invoiceDisplay = (ord as any).invoice_id || ord.order_id || ord.id;
      const customerName = (ord as any).customer_name || ord.customer || "Customer";
      const totalAmount = Number(ord.total || 0);
      const txnDate = ord.order_time || (ord as any).created_at || new Date().toISOString();

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

    return list.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return timeB - timeA;
    });
  }, [dbOrders]);

  const paidTransactions = useMemo(() => {
    return paymentsList.filter((p) =>
      ["paid", "completed"].includes(
        String(p.status || "").trim().toLowerCase()
      )
    );
  }, [paymentsList]);

  const unpaidTransactions = useMemo(() => {
    return paymentsList.filter((p) =>
      !["paid", "completed"].includes(
        String(p.status || "").trim().toLowerCase()
      )
    );
  }, [paymentsList]);

  const totalRevenue = useMemo(() => {
    return paidTransactions.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [paidTransactions]);

  const cashTotal = useMemo(() => {
    return paidTransactions
      .filter((p) => String(p.method || "").trim().toLowerCase() === "cash")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [paidTransactions]);

  const upiTotal = useMemo(() => {
    return paidTransactions
      .filter((p) => {
        const m = String(p.method || "").trim().toLowerCase();
        return m === "upi" || m.includes("gpay") || m.includes("upi") || m.includes("online") || m.includes("qr") || m.includes("razorpay");
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [paidTransactions]);

  const cardTotal = useMemo(() => {
    return paidTransactions
      .filter((p) => String(p.method || "").trim().toLowerCase() === "card")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [paidTransactions]);

  const methodBreakdown = useMemo(() => {
    return [
      { method: "Cash", amount: cashTotal, icon: Banknote },
      { method: "UPI", amount: upiTotal, icon: Smartphone },
      ...(cardTotal > 0 ? [{ method: "Card", amount: cardTotal, icon: CreditCard }] : []),
    ];
  }, [cashTotal, upiTotal, cardTotal]);

  const dailyRevenueTrend = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const result: { day: string; UPI: number; Cash: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = d.toDateString();
      const dayName = days[d.getDay()];

      const dayPaidOrders = paidTransactions.filter((p) => {
        const orderDate = new Date(p.date || Date.now());
        return orderDate.toDateString() === dayStr;
      });

      const dayUpi = dayPaidOrders
        .filter((p) => {
          const m = String(p.method || "").trim().toLowerCase();
          return m === "upi" || m.includes("gpay") || m.includes("upi") || m.includes("online") || m.includes("qr") || m.includes("razorpay");
        })
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const dayCash = dayPaidOrders
        .filter((p) => String(p.method || "").trim().toLowerCase() === "cash")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      result.push({ day: dayName, UPI: dayUpi, Cash: dayCash });
    }
    return result;
  }, [paidTransactions]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return paymentsList.filter((p) => {
      return (
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.invoiceId && p.invoiceId.toLowerCase().includes(q)) ||
        (p.customer && p.customer.toLowerCase().includes(q)) ||
        (p.method && p.method.toLowerCase().includes(q)) ||
        (p.status && p.status.toLowerCase().includes(q))
      );
    });
  }, [paymentsList, searchQuery]);

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
        description="Track live revenue and payment transaction metrics directly from Supabase."
        icon={<CreditCard className="h-5 w-5" />}
        actions={<Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Export</Button>}
      />

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 gap-3 w-full sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border shadow-xs">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <DollarSign className="h-4 w-4 text-emerald-600" /> Total Revenue
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">{formatINR(totalRevenue)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {paidTransactions.length} paid transactions
          </div>
        </Card>

        <Card className="p-4 border shadow-xs">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Smartphone className="h-4 w-4 text-indigo-600" /> UPI Revenue
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">{formatINR(upiTotal)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {totalRevenue > 0 ? Math.round((upiTotal / totalRevenue) * 100) : 0}% of revenue
          </div>
        </Card>

        <Card className="p-4 border shadow-xs">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Banknote className="h-4 w-4 text-amber-600" /> Cash Revenue
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">{formatINR(cashTotal)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {totalRevenue > 0 ? Math.round((cashTotal / totalRevenue) * 100) : 0}% of revenue
          </div>
        </Card>

        <Card className="p-4 border shadow-xs">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Paid / Unpaid
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">
            {paidTransactions.length} <span className="text-sm font-normal text-muted-foreground">Paid</span> / {unpaidTransactions.length} <span className="text-sm font-normal text-muted-foreground">Unpaid</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {paymentsList.length} total orders in system
          </div>
        </Card>
      </div>

      {/* Dynamic Charts Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 w-full border shadow-xs">
          <div className="mb-3">
            <div className="font-display text-base font-semibold">Payment Methods Breakdown</div>
            <div className="text-xs text-muted-foreground">Live revenue distribution by method</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={methodBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 60)" vertical={false} />
              <XAxis dataKey="method" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(val: any) => [formatINR(Number(val)), "Revenue"]}
                contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 60)", fontSize: 12 }}
              />
              <Bar dataKey="amount" fill="oklch(0.68 0.19 40)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 w-full border shadow-xs">
          <div className="mb-3">
            <div className="font-display text-base font-semibold">7-Day Sales Trend (UPI vs Cash)</div>
            <div className="text-xs text-muted-foreground">Calculated strictly from live paid orders</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyRevenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 60)" vertical={false} />
              <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(val: any, name: any) => [formatINR(Number(val)), name]}
                contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 60)", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="UPI" fill="oklch(0.55 0.15 260)" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="Cash" fill="oklch(0.68 0.19 40)" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Full Width Payment List Table */}
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
