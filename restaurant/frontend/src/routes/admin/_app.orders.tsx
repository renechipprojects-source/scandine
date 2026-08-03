import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { StatusBadge } from "@/admin/components/layout/StatusBadge";
import { Card } from "@/admin/components/ui/card";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/admin/components/ui/table";
import { Badge } from "@/admin/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/admin/components/ui/tabs";
import { ShoppingBag, Search, Eye, CheckCircle2, Clock, Check, Utensils } from "lucide-react";
import { restaurantInfo } from "@/admin/lib/mock-data";
import { useState, useCallback, useMemo } from "react";
import { useSupabaseTable, type Order } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/admin/components/ui/dialog";

export const Route = createFileRoute("/admin/_app/orders")({
  head: () => ({
    meta: [
      { title: "Orders — ScanDine" },
      { name: "description", content: "Manage active and completed restaurant orders in real time." },
    ],
  }),
  component: OrdersPage,
});

export function OrdersPage() {
  const { data: dbOrders, fetchData } = useSupabaseTable<Order>("sd_orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed">("all");

  const handleRealtimePayload = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeTable("sd_orders", handleRealtimePayload);

  // Live Supabase Orders — strictly dynamic data
  const displayOrders: Order[] = useMemo(() => {
    return dbOrders;
  }, [dbOrders]);

  // Derived arrays & counts updating live
  const completedOrders = useMemo(() => {
    return displayOrders.filter((o) => o.status === "completed");
  }, [displayOrders]);

  const activeOrders = useMemo(() => {
    return displayOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  }, [displayOrders]);

  const completedCount = completedOrders.length;
  const activeCount = activeOrders.length;

  const filteredOrders = useMemo(() => {
    let list = displayOrders;
    if (activeTab === "active") list = activeOrders;
    if (activeTab === "completed") list = completedOrders;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((o) => {
      return (
        (o.order_id && o.order_id.toLowerCase().includes(q)) ||
        (o.customer && o.customer.toLowerCase().includes(q)) ||
        String(o.table_number).includes(q) ||
        (o.status && o.status.toLowerCase().includes(q))
      );
    });
  }, [displayOrders, activeOrders, completedOrders, activeTab, searchQuery]);

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Orders & Kitchen Fulfillment"
        description="Monitor active orders and review completed transactions in real time."
        icon={<ShoppingBag className="h-5 w-5" />}
      />

      {/* Real-time Order Summary Badges */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 w-full">
        <Card className="p-4 bg-card/60 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Orders</div>
          <div className="mt-1 font-display text-2xl font-bold">{displayOrders.length}</div>
        </Card>
        <Card className="p-4 bg-amber-50/50 border-amber-200/60 dark:bg-amber-950/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Active Orders</div>
          <div className="mt-1 font-display text-2xl font-bold text-amber-900 dark:text-amber-200">{activeCount}</div>
        </Card>
        <Card className="p-4 bg-emerald-50/50 border-emerald-200/60 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Completed</div>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-900 dark:text-emerald-200">{completedCount}</div>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue Total</div>
          <div className="mt-1 font-display text-2xl font-bold text-primary">
            {restaurantInfo.currency}
            {completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0).toFixed(2)}
          </div>
        </Card>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        {/* Full-width Sticky Header Container for Search Bar & Tabs */}
        <div className="sticky top-16 z-20 w-full py-3 bg-background/95 backdrop-blur-md border-b shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="all" className="gap-2 text-xs">
              All Orders ({displayOrders.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2 text-xs">
              Active ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2 text-xs">
              Completed ({completedCount})
            </TabsTrigger>
          </TabsList>

          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order ID, customer or table…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tab 1: All Orders Table — Full Width */}
        <TabsContent value="all" className="mt-4 w-full">
          <Card className="w-full p-2 sm:p-4 overflow-hidden border">
            <div className="w-full overflow-x-auto">
              <Table className="w-full min-w-[750px]">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        No live orders found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((o) => (
                      <TableRow key={o.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs font-semibold">{o.order_id || o.id}</TableCell>
                        <TableCell className="font-medium">{o.customer}</TableCell>
                        <TableCell><span className="rounded-md bg-muted px-2 py-0.5 text-xs">T-{o.table_number}</span></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{Array.isArray(o.item) ? o.item.length : 1} items</TableCell>
                        <TableCell className="text-right font-semibold">{restaurantInfo.currency}{Number(o.total).toFixed(2)}</TableCell>
                        <TableCell><StatusBadge status={o.status} /></TableCell>
                        <TableCell><StatusBadge status={o.payment} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{o.order_time ? new Date(o.order_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedOrder(o as Order)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Active Orders Table — Full Width */}
        <TabsContent value="active" className="mt-4 w-full">
          <Card className="w-full p-2 sm:p-4 overflow-hidden border">
            <div className="w-full overflow-x-auto">
              <Table className="w-full min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No active orders currently in queue.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((o) => (
                      <TableRow key={o.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs font-semibold">{o.order_id || o.id}</TableCell>
                        <TableCell className="font-medium">{o.customer}</TableCell>
                        <TableCell><span className="rounded-md bg-muted px-2 py-0.5 text-xs">T-{o.table_number}</span></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{Array.isArray(o.item) ? o.item.length : 1} items</TableCell>
                        <TableCell className="text-right font-semibold">{restaurantInfo.currency}{Number(o.total).toFixed(2)}</TableCell>
                        <TableCell><StatusBadge status={o.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{o.order_time ? new Date(o.order_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedOrder(o as Order)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Completed Orders Cards Grid — Full Width */}
        <TabsContent value="completed" className="mt-4 w-full space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Completed Orders ({completedCount})
            </h3>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-medium">
              Realtime Updated
            </Badge>
          </div>

          {filteredOrders.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground w-full">
              No completed orders recorded yet.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
              {filteredOrders.map((o) => (
                <CompletedOrderCard key={o.id} order={o} onViewDetails={() => setSelectedOrder(o as Order)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details — {selectedOrder?.order_id || selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-2 border-b pb-3 text-xs">
                <div><span className="text-muted-foreground">Customer</span><div className="font-semibold text-foreground">{selectedOrder.customer}</div></div>
                <div><span className="text-muted-foreground">Table</span><div className="font-semibold text-foreground">Table #{selectedOrder.table_number}</div></div>
                <div><span className="text-muted-foreground">Status</span><div className="mt-0.5"><StatusBadge status={selectedOrder.status} /></div></div>
                <div><span className="text-muted-foreground">Payment</span><div className="mt-0.5"><StatusBadge status={selectedOrder.payment} /></div></div>
              </div>

              <div>
                <div className="mb-2 font-semibold">Items Ordered</div>
                <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                  {Array.isArray(selectedOrder.item) && selectedOrder.item.length > 0 ? (
                    selectedOrder.item.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>{it.qty}x {it.name}</span>
                        <span className="font-medium">{restaurantInfo.currency}{(Number(it.price) * Number(it.qty)).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between text-xs">
                      <span>1x Order Items</span>
                      <span className="font-medium">{restaurantInfo.currency}{Number(selectedOrder.total).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3 font-display text-base font-bold">
                <span>Total Amount</span>
                <span className="text-primary">{restaurantInfo.currency}{Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Card component for completed orders
function CompletedOrderCard({ order, onViewDetails }: { order: Order; onViewDetails: () => void }) {
  const items = Array.isArray(order.item) ? order.item : [];
  return (
    <Card className="group relative overflow-hidden border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-white p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-card dark:to-card">
      <div className="flex items-start justify-between gap-2 border-b border-emerald-100/80 pb-2.5 dark:border-emerald-900/40">
        <div>
          <div className="font-mono text-xs font-bold text-foreground">
            {order.order_id || order.id}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Utensils className="h-3 w-3 text-muted-foreground" />
            <span className="font-semibold text-foreground">Table #{order.table_number}</span>
          </div>
        </div>
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[10px] uppercase tracking-wider font-semibold">
          <Check className="h-3 w-3" /> Completed
        </Badge>
      </div>

      <div className="my-3 space-y-1.5 text-xs">
        <div className="flex justify-between font-medium text-foreground">
          <span>Customer:</span>
          <span>{order.customer}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Items ({items.length || 1}):</span>
          <span className="truncate max-w-[140px] text-right font-medium">
            {items.length > 0 ? items.map((i) => i.name).join(", ") : "Food Order"}
          </span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground pt-1">
          <span className="flex items-center gap-1 text-[11px]">
            <Clock className="h-3 w-3" />
            {order.order_time ? new Date(order.order_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
          </span>
          <span className="font-display text-base font-bold text-emerald-700 dark:text-emerald-400">
            {restaurantInfo.currency}{Number(order.total).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="border-t border-emerald-100/80 pt-2.5 dark:border-emerald-900/40">
        <Button variant="outline" size="sm" onClick={onViewDetails} className="w-full gap-1.5 text-xs h-8 border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300">
          <Eye className="h-3.5 w-3.5" /> View Order Details
        </Button>
      </div>
    </Card>
  );
}