import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/kitchen/components/layout/PageHeader";
import { StatusBadge } from "@/kitchen/components/layout/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/kitchen/components/ui/card";
import { Button } from "@/kitchen/components/ui/button";
import { Input } from "@/kitchen/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/kitchen/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kitchen/components/ui/select";
import {
  Radio,
  Search,
  Clock,
  Utensils,
  User,
  StickyNote,
  ArrowRight,
  CheckCircle2,
  Timer,
  Check,
  X,
  Eye,
  ChevronUp,
} from "lucide-react";
import { orders as mockOrdersRaw, restaurantInfo } from "@/kitchen/lib/mock-data";
import { useCallback, useState } from "react";
import { useSupabaseTable, type Order, type MenuItem } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { calculateOrderPrepTime, useOrderCountdown } from "@/hooks/useOrderTimer";
import { ServiceRequestsSection } from "@/kitchen/components/ServiceRequestsSection";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/kitchen/_app/orders/live")({
  head: () => ({
    meta: [
      { title: "Live Orders — ScanDine Kitchen" },
      { name: "description", content: "Real-time 6-column order management KDS queue across all tables." },
    ],
  }),
  component: LiveOrdersPage,
});

type LaneStatus = Order["status"];

interface LaneConfig {
  key: LaneStatus;
  label: string;
  tone: string;
  badgeBg: string;
  dotColor: string;
}

const lanes: LaneConfig[] = [
  { key: "pending", label: "New Orders", tone: "border-t-amber-500", badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", dotColor: "bg-amber-500" },
  { key: "accepted", label: "Accepted", tone: "border-t-blue-500", badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", dotColor: "bg-blue-500" },
  { key: "preparing", label: "Preparing", tone: "border-t-indigo-500", badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", dotColor: "bg-indigo-500" },
  { key: "ready", label: "Ready", tone: "border-t-emerald-500", badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", dotColor: "bg-emerald-500" },
  { key: "completed", label: "Completed", tone: "border-t-slate-400", badgeBg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20", dotColor: "bg-slate-400" },
  { key: "cancelled", label: "Cancelled", tone: "border-t-rose-500", badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", dotColor: "bg-rose-500" },
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
  onCancel,
}: {
  order: Order;
  onAccept: (order: Order) => void;
  onAdvance: (order: Order) => void;
  onAutoReady: (order: Order) => void;
  onCancel: (order: Order) => void;
}) {
  const handleComplete = useCallback(() => {
    onAutoReady(order);
  }, [order, onAutoReady]);

  const { formattedTime } = useOrderCountdown(
    order.estimated_ready_at,
    order.status,
    handleComplete
  );

  const items = Array.isArray(order.item) ? order.item : [];

  return (
    <Card className="p-2.5 transition-all hover:shadow-md flex flex-col justify-between border shadow-xs w-full bg-card min-w-0 rounded-xl">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Card Header: Order ID & Payment Badge */}
        <div className="flex items-center justify-between gap-1 shrink-0 pb-1.5 border-b border-border/40">
          <div className="min-w-0 flex items-center gap-1">
            <span className="font-mono font-bold text-xs text-foreground truncate" title={order.order_id || order.id}>
              {order.order_id || order.id}
            </span>
          </div>
          <div className="shrink-0">
            <StatusBadge status={order.payment} />
          </div>
        </div>

        {/* Table Number, Customer & Placed Time Info */}
        <div className="flex flex-wrap items-center justify-between py-1 text-[11px] text-muted-foreground gap-x-2 gap-y-0.5 shrink-0">
          <div className="flex items-center gap-1 font-display font-bold text-xs text-foreground truncate min-w-0">
            <Utensils className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">Table {order.table_number}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-[10px] min-w-0">
            <span className="flex items-center gap-0.5 truncate max-w-[75px]" title={order.customer}>
              <User className="h-3 w-3 shrink-0 text-muted-foreground/80" />
              <span className="truncate font-medium">{order.customer || "Guest"}</span>
            </span>
            <span className="flex items-center gap-0.5 font-mono shrink-0">
              <Clock className="h-3 w-3 shrink-0 text-muted-foreground/80" />
              {formatOrderTime(order.order_time)}
            </span>
          </div>
        </div>

        {/* Items List Box (Scrollable max height) */}
        <div className="bg-muted/30 rounded-lg p-1.5 my-1 overflow-y-auto max-h-[120px] space-y-1 border border-border/30 shrink-0 scrollbar-thin">
          {items.length === 0 ? (
            <div className="text-[10px] text-muted-foreground italic text-center py-1">No item details</div>
          ) : (
            items.map((it, i) => (
              <div key={i} className="flex items-start justify-between gap-1 text-[11px] leading-tight">
                <span className="break-words min-w-0 flex-1 font-medium text-foreground">
                  <span className="mr-1 font-bold text-primary shrink-0">{it.qty}×</span>
                  {it.name}
                </span>
                <span className="text-muted-foreground font-mono text-[10px] shrink-0 ml-1">
                  {restaurantInfo.currency}{(it.qty * (it.price || 0)).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Order Total & Prep Countdown Banner */}
        <div className="mt-1 flex items-center justify-between text-xs font-semibold shrink-0">
          <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Total</span>
          <span className="font-mono text-foreground font-bold text-xs">{restaurantInfo.currency}{Number(order.total || 0).toFixed(2)}</span>
        </div>

        {(order.status === "accepted" || order.status === "preparing") && (
          <div className="mt-1 rounded-md border border-info/30 bg-info/10 py-0.5 px-1 text-center shrink-0">
            <div className="flex items-center justify-center gap-1 font-mono text-[10px] font-bold text-info-foreground">
              <Timer className="h-3 w-3 animate-pulse text-info shrink-0" />
              <span>Prep: {formattedTime}</span>
            </div>
          </div>
        )}
      </div>

      {/* Workflow Controls Footer */}
      <div className="mt-2 pt-1.5 border-t border-border/50 w-full shrink-0">
        {order.status === "pending" && (
          <div className="grid grid-cols-2 gap-1 items-center w-full">
            <Button
              size="sm"
              className="w-full h-7 text-[11px] bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs px-1 flex items-center justify-center gap-1"
              onClick={() => onAccept(order)}
            >
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>Accept</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/10 font-bold shadow-xs px-1 flex items-center justify-center gap-1"
              onClick={() => onCancel(order)}
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              <span>Reject</span>
            </Button>
          </div>
        )}

        {order.status === "accepted" && (
          <div className="grid grid-cols-2 gap-1 w-full">
            <Button
              size="sm"
              className="w-full h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs px-1 flex items-center justify-center gap-1"
              onClick={() => onAdvance(order)}
            >
              <Timer className="h-3.5 w-3.5 shrink-0" />
              <span>Preparing</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/10 font-bold shadow-xs px-1 flex items-center justify-center gap-1"
              onClick={() => onCancel(order)}
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              <span>Reject</span>
            </Button>
          </div>
        )}

        {order.status === "preparing" && (
          <Button
            size="sm"
            className="w-full h-7 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center justify-center gap-1 px-1"
            onClick={() => onAdvance(order)}
          >
            <span>Mark Ready</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Button>
        )}

        {order.status === "ready" && (
          <Button
            size="sm"
            className="w-full h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center justify-center gap-1 px-1"
            onClick={() => onAdvance(order)}
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Mark Complete</span>
          </Button>
        )}

        {order.status === "completed" && (
          <div className="w-full h-7 flex items-center justify-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
            Completed ✅
          </div>
        )}

        {order.status === "cancelled" && (
          <div className="w-full h-7 flex items-center justify-center text-[11px] font-bold text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            Cancelled ❌
          </div>
        )}
      </div>
    </Card>
  );
}

const initialOrdersList: Order[] = mockOrdersRaw.map((m) => ({
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

const emptyOrdersFallback: Order[] = [];

function LiveOrdersPage() {
  const { data: dbOrders, updateItem, fetchData } = useSupabaseTable<Order>(
    "sd_orders",
    isSupabaseConfigured ? emptyOrdersFallback : initialOrdersList
  );
  const { data: dbMenuItems } = useSupabaseTable<MenuItem>("sd_menu_items");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [timeTab, setTimeTab] = useState("today");

  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

  const toggleColumnExpanded = (laneKey: string) => {
    setExpandedColumns((prev) => ({ ...prev, [laneKey]: !prev[laneKey] }));
  };

  const handleRealtimePayload = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeTable("sd_orders", handleRealtimePayload);

  const allOrders: Order[] = dbOrders;

  const displayOrders = allOrders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.order_id && o.order_id.toLowerCase().includes(q)) ||
      (o.customer && o.customer.toLowerCase().includes(q)) ||
      (o.table_number && o.table_number.toString().includes(q)) ||
      (Array.isArray(o.item) && o.item.some((it) => it.name.toLowerCase().includes(q)));

    const matchesChannel =
      channelFilter === "all" || (channelFilter === "qr" ? o.table_number > 0 : true);

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

    const targetId = order.id || order.order_id;

    try {
      await updateItem(targetId, {
        status: "accepted",
        accepted_at: acceptedAtISO,
        prep_time_minutes: maxPrepMinutes,
        estimated_ready_at: estimatedReadyISO,
      });

      toast.success(`Order ${order.order_id || order.id} accepted! 👨‍🍳`);

      window.dispatchEvent(
        new CustomEvent("order-status-changed", {
          detail: {
            orderId: order.order_id || order.id,
            tableNumber: order.table_number,
            status: "accepted",
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
      const targetId = order.id || order.order_id;
      await updateItem(targetId, { status: "ready" });

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
    } else if (order.status === "accepted") {
      nextStatus = "preparing";
      toastMessage = `Order ${order.order_id || order.id} is now preparing! 🍳`;
    } else if (order.status === "preparing") {
      nextStatus = "ready";
      toastMessage = `Order ${order.order_id || order.id} marked Ready! 🚀`;
    } else if (order.status === "ready") {
      nextStatus = "completed";
      toastMessage = `Order ${order.order_id || order.id} marked Completed ✅`;
    }

    if (nextStatus !== order.status) {
      try {
        const targetId = order.id || order.order_id;
        await updateItem(targetId, { status: nextStatus });

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

  const handleCancelOrder = async (order: Order) => {
    const targetId = order.id || order.order_id;

    try {
      await updateItem(targetId, { status: "cancelled" });

      toast.error(`Order ${order.order_id || order.id} cancelled ❌`);

      window.dispatchEvent(
        new CustomEvent("order-status-changed", {
          detail: {
            orderId: order.order_id || order.id,
            tableNumber: order.table_number,
            status: "cancelled",
          },
        })
      );
    } catch (err) {
      console.error("Failed to cancel order:", err);
      toast.error("Failed to cancel order");
    }
  };

  const activeOrders = allOrders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status));
  const activePreps = allOrders.filter((o) => o.status === "preparing" || o.status === "accepted");
  const avgPrepMinutes =
    activePreps.length > 0
      ? Math.round(
          activePreps.reduce((acc, o) => acc + (o.prep_time_minutes || 15), 0) / activePreps.length
        )
      : 0;

  return (
    <div className="space-y-5 w-full">
      <PageHeader title="Live orders" icon={<Radio className="h-5 w-5 text-primary" />} />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 max-w-lg">
        {[
          { label: "Active orders", value: activeOrders.length, icon: <Utensils className="h-4 w-4" />, tone: "text-primary" },
          { label: "Avg prep time", value: `${avgPrepMinutes} min`, icon: <Timer className="h-4 w-4" />, tone: "text-info" },
        ].map((s) => (
          <Card key={s.label} className="p-4 border shadow-xs">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
              {s.label}
              <span className={s.tone}>{s.icon}</span>
            </div>
            <div className={`mt-1 font-display text-2xl font-bold ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <ServiceRequestsSection />

      {/* Search & Filters Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="kitchen-live-orders-search"
            name="searchQuery"
            aria-label="Search order, table or customer"
            placeholder="Search order, table or customer…"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger id="kitchen-live-orders-channel-filter" name="channelFilter" aria-label="Filter by order channel" className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
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

      {/* Responsive 6-Column KDS Queue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 w-full items-start">
        {lanes.map((lane) => {
          const laneOrders = displayOrders.filter((o) => o.status === lane.key);

          return (
            <div key={lane.key} className={`min-w-0 rounded-xl border-t-4 bg-card/80 p-2 shadow-xs border ${lane.tone} flex flex-col transition-all max-h-[calc(100vh-230px)]`}>
              {/* Column Header */}
              <div className="mb-2 flex items-center justify-between px-0.5 shrink-0 pb-1.5 border-b border-border/40 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${lane.dotColor}`} />
                  <span className="font-display text-xs font-bold text-foreground truncate">{lane.label}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${lane.badgeBg}`}>
                  {laneOrders.length}
                </span>
              </div>

              {/* Column Cards Container with Independent Vertical Scroll */}
              <div className="space-y-2 overflow-y-auto pr-0.5 scrollbar-thin flex-1 min-h-[140px] max-h-[calc(100vh-270px)]">
                {laneOrders.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1 bg-muted/10 my-auto">
                    <Utensils className="h-4 w-4 opacity-30" />
                    <span className="font-medium text-[10px]">No orders in {lane.label}</span>
                  </div>
                ) : (
                  laneOrders.map((o) => (
                    <OrderLiveCardItem
                      key={o.id}
                      order={o}
                      onAccept={handleAcceptOrder}
                      onAdvance={handleStageAdvance}
                      onAutoReady={handleAutoReady}
                      onCancel={handleCancelOrder}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
