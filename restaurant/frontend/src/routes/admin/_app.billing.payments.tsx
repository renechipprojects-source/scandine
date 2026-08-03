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
          status: inv.status || "unpaid",
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

  const gpayTotal = paidTransactions
    .filter((p) => {
      const m = p.method?.toLowerCase() || "";
      return m.includes("gpay") || m.includes("upi") || m.includes("qr") || m.includes("online") || m.includes("wallet");
    })
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const cardTotal = paidTransactions
    .filter((p) => {
      const m = p.method?.toLowerCase() || "";
      return m.includes("card") || m.includes("credit") || m.includes("debit");
    })
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const methodBreakdown = [
    { method: "Cash", amount: cashTotal, icon: Banknote },
    { method: "GPay", amount: gpayTotal, icon: Smartphone },
    { method: "Card", amount: cardTotal, icon: CreditCard },
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

  const handleMarkAsPaid = async (p: PaymentTransaction) => {
    try {
      const nowStr = new Date().toISOString();
      await updatePayment(p.id, { status: "Paid", date: nowStr });

      const matchingInv = dbInvoices.find((i) => i.id === p.invoiceId || i.invoice === p.invoiceId || i.id === p.id);
      if (matchingInv) {
        await updateInvoice(matchingInv.id, { status: "Paid", date: nowStr });
      }

      await fetchPayments();
      await fetchInvoices();
      await fetchOrders();

      toast.success(`Payment transaction ${p.id} marked as Paid!`);
    } catch (err) {
      console.error("Failed to mark payment as paid:", err);
      toast.error("Failed to update payment status.");
    }
  };

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
    <div>
      <PageHeader
        title="Payments"
        description="Track every transaction across Cash, GPay and Cards."
        icon={<CreditCard className="h-5 w-5" />}
        actions={<Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Export</Button>}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-display text-base font-semibold">Payment Methods Distribution</div>
              <div className="text-xs text-muted-foreground">Cash vs GPay vs Card revenue</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
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
        <Card className="p-5">
          <div className="font-display text-base font-semibold">Settlement Summary</div>
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Sales</span>
              <span className="font-semibold">{formatINR(totalGrossSales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Fees</span>
              <span className="text-destructive">−₹0</span>
            </div>
            <div className="flex justify-between border-t pt-3 font-display text-lg font-bold">
              <span>Net Payout</span>
              <span className="text-primary">{formatINR(totalGrossSales)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transaction ID, invoice, or method…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="-mx-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Transaction / Txn ID</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No payment transactions found in database.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const isPaid = p.status?.toLowerCase() === "paid";
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-semibold">
                        {p.transaction_id || p.id}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.invoiceId}</TableCell>
                      <TableCell className="font-medium">{p.customer}</TableCell>
                      <TableCell>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{p.method}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.date ? (isNaN(Date.parse(p.date)) ? p.date : new Date(p.date).toLocaleDateString()) : "Today"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatINR(Number(p.amount) || 0)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPaid && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            onClick={() => handleMarkAsPaid(p)}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark as Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
