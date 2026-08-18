import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { StatusBadge } from "@/admin/components/layout/StatusBadge";
import { Card } from "@/admin/components/ui/card";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/admin/components/ui/table";
import { CreditCard, Search, Download, Banknote, Smartphone, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useCallback } from "react";
import { useSupabaseTable, type PaymentTransaction, type Invoice, type Order } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { exportToCSV } from "@/admin/lib/exportUtils";
import { toast } from "sonner";

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
  const { data: dbPayments, updateItem: updatePayment, fetchData: fetchPayments } = useSupabaseTable<PaymentTransaction>("payments");
  const { data: dbInvoices, updateItem: updateInvoice, fetchData: fetchInvoices } = useSupabaseTable<Invoice>("invoices");
  const { data: dbOrders, fetchData: fetchOrders } = useSupabaseTable<Order>("sd_orders");

  const [searchQuery, setSearchQuery] = useState("");

  const handleRealtimePayload = useCallback(() => {
    fetchPayments();
    fetchInvoices();
    fetchOrders();
  }, [fetchPayments, fetchInvoices, fetchOrders]);

  useRealtimeTable("payments", handleRealtimePayload);
  useRealtimeTable("invoices", handleRealtimePayload);
  useRealtimeTable("sd_orders", handleRealtimePayload);

  // Derive real payment transactions from Supabase tables (payments, invoices, orders)
  const paymentsList: PaymentTransaction[] = (() => {
    const list: PaymentTransaction[] = [];
    const seenKeys = new Set<string>();

    for (const p of dbPayments) {
      const key = p.id || p.transaction_id;
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);
      list.push({
        id: p.id,
        invoiceId: p.invoiceId || p.id,
        customer: p.customer || "Customer",
        method: p.method || "Cash",
        amount: Number(p.amount) || 0,
        status: p.status || "unpaid",
        date: p.date || new Date().toISOString(),
        transaction_id: p.transaction_id,
      });
    }

    for (const inv of dbInvoices) {
      const invKey = inv.invoice || inv.id;
      const alreadyInList = list.some((p) => p.invoiceId === invKey || p.id === inv.id);
      if (!alreadyInList) {
        list.push({
          id: inv.transaction_id || `PMT-${inv.id}`,
          invoiceId: invKey,
          customer: inv.customer || "Customer",
          method: inv.method || "Cash",
          amount: Number(inv.amount) || 0,
          status: (inv.status || "unpaid") as any,
          date: inv.date || new Date().toISOString(),
          transaction_id: inv.transaction_id,
        });
      }
    }

    for (const ord of dbOrders) {
      const ordKey = ord.order_id || ord.id;
      const alreadyInList = list.some((p) => p.invoiceId === ordKey || p.id === ord.id);
      if (!alreadyInList && (ord.payment === "paid" || ord.status === "completed")) {
        list.push({
          id: `PMT-${ord.id}`,
          invoiceId: ordKey,
          customer: (ord as any).customer_name || ord.customer || "Customer",
          method: "Cash",
          amount: Number(ord.total) || 0,
          status: ord.payment === "paid" ? "Paid" : "Unpaid",
          date: ord.order_time || ord.created_at || new Date().toISOString(),
        });
      }
    }

    return list;
  })();

  const paidTransactions = paymentsList.filter(
    (p) => p.status?.toLowerCase() === "paid" || p.status?.toLowerCase() === "completed"
  );

  const cashTotal = paidTransactions
    .filter((p) => p.method?.toLowerCase() === "cash")
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const upiTotal = paidTransactions
    .filter((p) => {
      const m = p.method?.toLowerCase() || "";
      return m.includes("gpay") || m.includes("upi") || m.includes("qr") || m.includes("online") || m.includes("wallet");
    })
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const methodBreakdown = [
    { method: "Cash", amount: cashTotal, icon: Banknote },
    { method: "UPI", amount: upiTotal, icon: Smartphone },
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 w-full">
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
