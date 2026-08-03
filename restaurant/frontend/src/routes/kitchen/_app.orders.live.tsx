import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/kitchen/components/layout/PageHeader";
import { StatusBadge } from "@/kitchen/components/layout/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/kitchen/components/ui/card";
import { Button } from "@/kitchen/components/ui/button";
import { Input } from "@/kitchen/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/kitchen/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kitchen/components/ui/select";
import { Radio, Search, Filter, Bell, Clock, Utensils, User, StickyNote, ArrowRight, CheckCircle2, Timer, Check } from "lucide-react";
import { orders as mockOrdersRaw, restaurantInfo } from "@/kitchen/lib/mock-data";
import { useCallback, useState, useEffect } from "react";
import { useSupabaseTable, type Order, type MenuItem } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { calculateOrderPrepTime, useOrderCountdown } from "@/hooks/useOrderTimer";
import { ServiceRequestsSection } from "@/kitchen/components/ServiceRequestsSection";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen/_app/orders/live")({
  head: () => ({ meta: [{ title: "Live Orders — ScanDine" }, { name: "description", content: "Real-time order queue across all tables and channels." }] }),
  component: LiveOrdersPage,
});

type LaneStatus = Order["status"];

const lanes: { key: LaneStatus; label: string; tone: string }[] = [
  { key: "pending",   label: "New Orders",  tone: "border-t-warning" },
  { key: "accepted",  label: "Accepted", tone: "border-t-amber-500" },
  { key: "preparing", label: "Preparing", tone: "border-t-info" },
  { key: "ready",     label: "Ready", tone: "border-t-primary" },
  { key: "completed", label: "Completed", tone: "border-t-success" },
  { key: "cancelled", label: "Cancelled", tone: "border-t-destructive" },
];

function formatOrderTime(timeStr?: string): string {
  if (!timeStr) return "Just now";
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return timeStr;
  }
}

function OrderLiveCardItem({
  order,
  onAccept,
  onAdvance,
  onAutoReady,
}: {
  order: Order;
  onAccept: (order: Order) => void;
  onAdvance: (order: Order) => void;
  onAutoReady: (order: Order) => void;
}) {
  const handleComplete = useCallback(() => {
    onAutoReady(order);
  }, [order, onAutoReady]);

  const { formattedTime, remainingSeconds } = useOrderCountdown(
    order.estimated_ready_at,
    order.status,
    handleComplete
  );

  const items = Array.isArray(order.item) ? order.item : [];

  return (
    <Card className="p-3 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">{order.order_id || order.id}</div>
          <div className="mt-0.5 flex items-center gap-1.5 font-display font-bold">
            <Utensils className="h-3.5 w-3.5 text-primary" /> T-{order.table_number}
          </div>
        </div>
        <StatusBadge status={order.payment} />
      </div>

      <div className="mt-2 space-y-1 border-t pt-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="truncate">
              <span className="mr-1 text-muted-foreground">{it.qty}×</span>
              {it.name}
            </span>
            <span className="text-muted-foreground">{restaurantInfo.currency}{(it.qty * it.price).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><User className="h-3 w-3" />{order.customer}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatOrderTime(order.order_time)}</span>
      </div>

      {/* Preparation Timer Display */}
      {(order.status === "accepted" || order.status === "preparing") && (
        <div className="mt-3 rounded-lg border border-info/30 bg-info/10 p-2 text-center">
          <div className="flex items-center justify-center gap-1.5 font-mono text-xs font-bold text-info-foreground">
            <Timer className="h-3.5 w-3.5 animate-pulse text-info" />
            <span>Prep Countdown: {formattedTime}</span>
          </div>
          {order.prep_time_minutes && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Total prep time: {order.prep_time_minutes} min
            </div>
          )}
        </div>
      )}

      {/* Workflow Controls */}
      <div className="mt-3 border-t pt-2">
        {order.status === "pending" && (
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-xs"
            onClick={() => onAccept(order)}
          >
            <Check className="mr-1 h-3.5 w-3.5" /> Accept Order
          </Button>
        )}

        {(order.status === "accepted" || order.status === "preparing") && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => onAdvance(order)}
          >
            Mark Ready Early <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}

        {order.status === "ready" && (
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={() => onAdvance(order)}
          >
            Mark Complete <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}

        {order.status === "completed" && (
          <div className="text-center text-xs font-semibold text-emerald-600 py-1">
            Completed ✅
          </div>
        )}

        {order.status === "cancelled" && (
          <div className="text-center text-xs font-semibold text-destructive py-1">
            Cancelled ❌
          </div>
        )}
      </div>
    </Card>
  );
}

function LiveOrdersPage() {
  const { data: dbOrders, updateItem, fetchData } = useSupabaseTable<Order>("sd_orders");
  const { data: dbMenuItems } = useSupabaseTable<MenuItem>("sd_menu_items");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [timeTab, setTimeTab] = useState("today");

  const handleRealtimePayload = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeTable("sd_orders", handleRealtimePayload);

  // Mapped display orders fallback
  const allOrders: Order[] = dbOrders.length > 0
    ? dbOrders
    : mockOrdersRaw.map((m) => ({
        id: m.id,
        order_id: m.id,
        customer: m.customer,
        table_number: typeof m.table === "string" ? parseInt(m.table.replace(/\D/g, ""), 10) || 1 : (m.table as number),
        item: m.items as Order["item"],
        total: m.total,
        status: (m.status === "served" ? "ready" : m.status) as Order["status"],
        payment: m.payment as Order["payment"],
        order_time: m.placedAt,
      }));

  // Filter orders by search, channel, time
  const displayOrders = allOrders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.order_id && o.order_id.toLowerCase().includes(q)) ||
      (o.customer && o.customer.toLowerCase().includes(q)) ||
      (o.table_number && o.table_number.toString().includes(q)) ||
      (Array.isArray(o.item) && o.item.some((it) => it.name.toLowerCase().includes(q)))
    );

    const matchesChannel = channelFilter === "all" || (
      channelFilter === "qr" ? o.table_number > 0 : true
    );

    let matchesTime = true;
    if (o.order_time) {
      const orderDate = new Date(o.order_time);
      if (!isNaN(orderDate.getTime())) {
        const now = new Date();
        const diffMin = (now.getTime() - orderDate.getTime()) / (1000 * 60);
        if (timeTab === "15") matchesTime = diffMin <= 15;
        else if (timeTab === "hour") matchesTime = diffMin <= 60;
      }
    }

    return matchesSearch && matchesChannel && matchesTime;
  });

  const handleAcceptOrder = async (order: Order) => {
    const maxPrepMinutes = calculateOrderPrepTime(order.item, dbMenuItems);
    const nowMs = Date.now();
    const estimatedReadyMs = nowMs + maxPrepMinutes * 60 * 1000;

    const acceptedAtISO = new Date(nowMs).toISOString();
    const estimatedReadyISO = new Date(estimatedReadyMs).toISOString();

    try {
      await updateItem(order.id, {
        status: "preparing",
        accepted_at: acceptedAtISO,
        prep_time_minutes: maxPrepMinutes,
        estimated_ready_at: estimatedReadyISO,
      });

      toast.success(`Order ${order.order_id || order.id} accepted! Timer started (${maxPrepMinutes} min) 👨‍🍳`);

      window.dispatchEvent(
        new CustomEvent("order-status-changed", {
          detail: {
            orderId: order.order_id || order.id,
            tableNumber: order.table_number,
            status: "preparing",
            estimatedReadyAt: estimatedReadyISO,
            prepTimeMinutes: maxPrepMinutes,
          },
        })
      );
    } catch (err) {
      console.error("Failed to accept order:", err);
      toast.error("Failed to accept order");
    }
  };

  const handleAutoReady = async (order: Order) => {
    if (order.status !== "preparing" && order.status !== "accepted") return;
    try {
      await updateItem(order.id, { status: "ready" });
      toast.success(`🚀 Order ${order.order_id || order.id} preparation timer completed! Marked as Ready.`);

      window.dispatchEvent(
        new CustomEvent("order-status-changed", {
          detail: {
            orderId: order.order_id || order.id,
            tableNumber: order.table_number,
            status: "ready",
          },
        })
      );
    } catch (err) {
      console.error("Failed to auto update status to ready:", err);
    }
  };

  const handleStageAdvance = async (order: Order) => {
    let nextStatus: LaneStatus = order.status;
    let toastMessage = "";

    if (order.status === "pending") {
      await handleAcceptOrder(order);
      return;
    } else if (order.status === "accepted" || order.status === "preparing") {
      nextStatus = "ready";
      toastMessage = `Order ${order.order_id || order.id} marked Ready! 🚀`;
    } else if (order.status === "ready") {
      nextStatus = "completed";
      toastMessage = `Order ${order.order_id || order.id} marked Completed ✅`;
    }

    if (nextStatus !== order.status) {
      try {
        await updateItem(order.id, { status: nextStatus });
        toast.success(toastMessage);

        window.dispatchEvent(
          new CustomEvent("order-status-changed", {
            detail: {
              orderId: order.order_id || order.id,
              tableNumber: order.table_number,
              status: nextStatus,
            },
          })
        );
      } catch (err) {
        console.error("Failed to advance order stage:", err);
        toast.error("Failed to update order status");
      }
    }
  };

  return (
    <div>
      <PageHeader
        title="Live orders"
        description="Real-time board of active orders with automatic preparation timer countdowns."
        icon={<Radio className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm">
            <Bell className="mr-2 h-4 w-4" />
            Sound alerts
          </Button>
        }
      />

      <ServiceRequestsSection />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search order, table or customer…"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="qr">QR Order</SelectItem>
            <SelectItem value="counter">Counter</SelectItem>
            <SelectItem value="waiter">Waiter</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={timeTab} onValueChange={setTimeTab}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="hour">Last hour</TabsTrigger>
            <TabsTrigger value="15">15 min</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {lanes.map((lane) => {
          const laneOrders = displayOrders.filter((o) => o.status === lane.key);
          return (
            <div key={lane.key} className={`min-w-0 rounded-2xl border-t-4 bg-card p-3 shadow-sm ${lane.tone}`}>
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold">{lane.label}</span>
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-muted px-1.5 text-[10px] font-semibold">{laneOrders.length}</span>
                </div>
              </div>
              <div className="space-y-3">
                {laneOrders.length === 0 && (
                  <div className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">No orders</div>
                )}
                {laneOrders.map((o) => (
                  <OrderLiveCardItem
                    key={o.id}
                    order={o}
                    onAccept={handleAcceptOrder}
                    onAdvance={handleStageAdvance}
                    onAutoReady={handleAutoReady}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Order timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayOrders.slice(0, 4).map((o, i) => (
              <div key={o.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </div>
                  {i < 3 && <div className="mt-1 h-full w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{o.order_id || o.id}</span>
                    <StatusBadge status={o.status} />
                    <span className="text-xs text-muted-foreground">· {formatOrderTime(o.order_time)}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {o.customer} · T-{o.table_number} · {Array.isArray(o.item) ? o.item.length : 0} items · {restaurantInfo.currency}{Number(o.total).toFixed(2)}
                  </div>
                  {i === 0 && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-warning/10 p-2 text-xs text-warning-foreground">
                      <StickyNote className="h-3.5 w-3.5 shrink-0 text-warning" />
                      <span>Extra napkins requested; birthday candle for dessert.</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
