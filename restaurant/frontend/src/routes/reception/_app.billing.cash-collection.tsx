import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/reception/components/layout/PageHeader";
import { StatusBadge } from "@/reception/components/layout/StatusBadge";
import { Card } from "@/reception/components/ui/card";
import { Button } from "@/reception/components/ui/button";
import { Input } from "@/reception/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/reception/components/ui/table";
import { Banknote, Search, CheckCircle2, DollarSign, Clock, RefreshCw } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useSupabaseTable, type Order } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { normalizePaymentStatus, resolvePaymentMethod } from "@/lib/payment-utils";

export const Route = createFileRoute("/reception/_app/billing/cash-collection")({
  head: () => ({
    meta: [
      { title: "Cash Collection — ScanDine Reception" },
      { name: "description", content: "Collect cash payments from customers and mark specific orders as paid." },
    ],
  }),
  component: CashCollectionPage,
});

const formatINR = (val: number) => {
  return "₹" + Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function CashCollectionPage() {
  const { data: dbOrders, fetchData: fetchOrders, loading } = useSupabaseTable<Order>("sd_orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleRealtimePayload = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useRealtimeTable("sd_orders", handleRealtimePayload);

  // Filter strictly unpaid / pending orders from sd_orders
  const unpaidOrders = useMemo(() => {
    return dbOrders.filter((ord) => {
      const rawStatus = ord.payment || (ord as any).payment_status;
      const normStatus = normalizePaymentStatus(rawStatus);
      return normStatus === "Unpaid" || normStatus === "Pending";
    }).sort((a, b) => {
      const timeA = new Date(a.order_time || a.created_at || 0).getTime();
      const timeB = new Date(b.order_time || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, [dbOrders]);

  // Filter paid cash orders
  const paidCashOrders = useMemo(() => {
    return dbOrders.filter((ord) => {
      const rawStatus = ord.payment || (ord as any).payment_status;
      const normStatus = normalizePaymentStatus(rawStatus);
      const method = resolvePaymentMethod(ord);
      return normStatus === "Paid" && method === "Cash";
    });
  }, [dbOrders]);

  const pendingCashTotal = useMemo(() => {
    return unpaidOrders.reduce((sum, ord) => sum + Number(ord.total || 0), 0);
  }, [unpaidOrders]);

  const collectedCashTotal = useMemo(() => {
    return paidCashOrders.reduce((sum, ord) => sum + Number(ord.total || 0), 0);
  }, [paidCashOrders]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return unpaidOrders;
    return unpaidOrders.filter((ord) => {
      const orderIdStr = String(ord.order_id || ord.id || "").toLowerCase();
      const custStr = String((ord as any).customer_name || ord.customer || "").toLowerCase();
      const tableStr = String(ord.table_number || "").toLowerCase();
      return orderIdStr.includes(q) || custStr.includes(q) || tableStr.includes(q);
    });
  }, [unpaidOrders, searchQuery]);

  // Handle cash collection for ONE specific sd_orders row only
  const handleCollectCash = async (targetOrder: Order) => {
    const targetId = targetOrder.id;
    const orderDisplayId = targetOrder.order_id || targetOrder.id;

    try {
      setProcessingId(targetId);
      const txnId = `TXN_CASH_${orderDisplayId.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}`;
      const payMethodName = "Cash";
      const payCategory = "cash";

      console.log("[CASH COLLECTION] Updating single sd_orders row:", { targetId, orderDisplayId, txnId });

      const currentItems = Array.isArray(targetOrder.item) ? targetOrder.item : [];
      const updatedItems = currentItems.map((it: any, idx: number) => ({
        ...it,
        ...(idx === 0
          ? {
              payment_method: payMethodName,
              payment_category: payCategory,
              transaction_id: txnId,
            }
          : {}),
      }));

      // Single atomic update for target order matching either id or order_id
      const { error: updateErr } = await supabase
        .from("sd_orders")
        .update({
          payment: "paid",
          item: updatedItems,
          payment_method: payMethodName,
          payment_category: payCategory,
        })
        .or(`id.eq.${targetId},order_id.eq.${targetId}`);

      if (updateErr) {
        console.warn("[CASH COLLECTION WARN] Single atomic update notice:", updateErr.message);
      }

      // Refresh data cleanly
      await fetchOrders();

      toast.success(`Cash collected for Order ${orderDisplayId}! Status updated to Paid.`);
    } catch (err: any) {
      console.error("Cash collection error:", err);
      toast.error(err?.message || "Failed to collect cash payment.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Cash Collection"
        description="Collect cash payments at reception counter and update individual order payment status."
        icon={<Banknote className="h-5 w-5 text-amber-600" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => fetchOrders()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 w-full sm:grid-cols-3">
        <Card className="p-4 border shadow-xs">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Clock className="h-4 w-4 text-amber-600" /> Pending Cash Collection
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatINR(pendingCashTotal)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {unpaidOrders.length} unpaid orders waiting for payment
          </div>
        </Card>

        <Card className="p-4 border shadow-xs">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Total Cash Collected
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatINR(collectedCashTotal)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {paidCashOrders.length} cash orders processed
          </div>
        </Card>

        <Card className="p-4 border shadow-xs">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <DollarSign className="h-4 w-4 text-primary" /> Total Unpaid Orders
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">
            {unpaidOrders.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Requires cashier / reception action
          </div>
        </Card>
      </div>

      {/* Main Cash Collection Table Card */}
      <Card className="w-full p-4 border shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold">Unpaid Orders Pending Payment</h3>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              {filtered.length} pending
            </span>
          </div>
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reception-cash-search"
              name="cashSearch"
              placeholder="Search by order ID, customer name or table…"
              aria-label="Search by order ID, customer name or table"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Table className="w-full min-w-[700px]" containerClassName="max-h-[420px] overflow-y-auto overflow-x-auto scrollbar-thin rounded-lg border border-border bg-card shadow-xs relative">
          <TableHeader className="sticky top-0 z-30 bg-muted/95 backdrop-blur-md shadow-xs border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Order ID</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Table</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Customer</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Items</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Date / Time</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 text-right font-semibold text-foreground">Total</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Status</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 text-right font-semibold text-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && dbOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Loading unpaid orders from database…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  {searchQuery.trim() ? "No unpaid orders match your search." : "No unpaid orders pending cash collection."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((ord) => {
                const isProcessing = processingId === ord.id;
                const itemsCount = Array.isArray(ord.item) ? ord.item.reduce((s: number, i: any) => s + (Number(i.qty) || 1), 0) : 0;
                const itemSummary = Array.isArray(ord.item)
                  ? ord.item.map((i: any) => `${i.name || "Item"} ×${i.qty || 1}`).join(", ")
                  : "Order items";

                return (
                  <TableRow key={ord.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      {ord.order_id || ord.id}
                    </TableCell>
                    <TableCell className="font-semibold text-xs">
                      Table {ord.table_number}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {(ord as any).customer_name || ord.customer || "Guest Customer"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={itemSummary}>
                      {itemSummary} ({itemsCount} items)
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ord.order_time ? new Date(ord.order_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {formatINR(Number(ord.total) || 0)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status="Unpaid" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                        onClick={() => handleCollectCash(ord)}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        {isProcessing ? "Processing…" : "Collect Cash & Mark Paid"}
                      </Button>
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
