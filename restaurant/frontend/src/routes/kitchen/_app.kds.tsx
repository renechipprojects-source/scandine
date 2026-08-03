import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/kitchen/components/layout/PageHeader";
import { StatusBadge } from "@/kitchen/components/layout/StatusBadge";
import { Card } from "@/kitchen/components/ui/card";
import { Button } from "@/kitchen/components/ui/button";
import { Checkbox } from "@/kitchen/components/ui/checkbox";
import { ChefHat, Clock, Timer, Flame, CheckCircle2, Check } from "lucide-react";
import { orders as mockOrders } from "@/kitchen/lib/mock-data";
import { useState, useCallback } from "react";
import { useSupabaseTable, type Order, type MenuItem } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { calculateOrderPrepTime, useOrderCountdown } from "@/hooks/useOrderTimer";
import { ServiceRequestsSection } from "@/kitchen/components/ServiceRequestsSection";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen/_app/kds")({
  head: () => ({ meta: [{ title: "Kitchen Display — ScanDine" }, { name: "description", content: "Kitchen Display System for real-time order preparation." }] }),
  component: KdsPage,
});

function KdsOrderCard({
  order,
  onAccept,
  onAdvance,
  onAutoReady,
}: {
  order: Order;
  onAccept: (order: Order) => void;
  onAdvance: (id: string, currentStatus: Order["status"]) => void;
  onAutoReady: (order: Order) => void;
}) {
  const handleComplete = useCallback(() => {
    onAutoReady(order);
  }, [order, onAutoReady]);

  const { formattedTime } = useOrderCountdown(
    order.estimated_ready_at,
    order.status,
    handleComplete
  );

  const tone =
    order.status === "pending"
      ? "border-warning bg-warning/5"
      : order.status === "accepted" || order.status === "preparing"
      ? "border-info bg-info/5"
      : "border-primary bg-primary/5";

  const itemsArr = Array.isArray(order.item) ? order.item : [];

  return (
    <Card className={`overflow-hidden border-l-4 p-4 ${tone}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-display text-lg font-bold">T-{order.table_number}</div>
          </div>
          <div className="text-xs text-muted-foreground">{order.order_id || order.id} · {order.customer}</div>
        </div>
        <div className="text-right">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {(order.status === "accepted" || order.status === "preparing") && (
        <div className="mt-2 flex items-center justify-between rounded bg-info/10 px-2 py-1 text-xs font-semibold text-info-foreground border border-info/20">
          <span className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5 animate-pulse text-info" /> Prep Countdown
          </span>
          <span className="font-mono text-sm">{formattedTime}</span>
        </div>
      )}

      <div className="mt-3 space-y-1.5 border-t pt-3">
        {itemsArr.map((it, j) => (
          <label key={j} className="flex items-start gap-2 rounded-lg p-1.5 text-sm transition-colors hover:bg-background">
            <Checkbox className="mt-0.5" />
            <span className="flex-1">
              <span className="mr-1 font-semibold text-primary">{it.qty}×</span>
              {it.name}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-3 flex gap-1.5 border-t pt-3">
        {order.status === "pending" ? (
          <Button
            size="sm"
            className="w-full text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold"
            onClick={() => onAccept(order)}
          >
            <Check className="mr-1 h-3.5 w-3.5" /> Accept Order
          </Button>
        ) : (
          <Button size="sm" className="w-full text-xs" onClick={() => onAdvance(order.id, order.status)}>
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            {order.status === "accepted" || order.status === "preparing" ? "Mark Ready" : "Complete & Serve"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function KdsPage() {
  const { data: dbOrders, updateItem, fetchData } = useSupabaseTable<Order>("sd_orders");
  const { data: dbMenuItems } = useSupabaseTable<MenuItem>("sd_menu_items");

  const handleRealtimePayload = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeTable("sd_orders", handleRealtimePayload);

  const displayOrders: Order[] = dbOrders.length > 0
    ? dbOrders
    : mockOrders.map((m) => ({
        id: m.id,
        order_id: m.id,
        customer: m.customer,
        table_number: typeof m.table === "string" ? parseInt(m.table.replace(/\D/g, ""), 10) || 1 : (m.table as number),
        item: m.items,
        total: m.total,
        status: m.status as Order["status"],
        payment: m.payment as Order["payment"],
        order_time: m.placedAt,
      }));

  const kitchenOrders = displayOrders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status));

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
      toast.success(`🚀 Order ${order.order_id || order.id} prep timer finished! Marked as Ready.`);

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

  const handleAdvanceStatus = async (id: string, currentStatus: Order["status"]) => {
    let nextStatus: Order["status"] = "preparing";
    if (currentStatus === "pending") {
      const targetOrder = displayOrders.find((o) => o.id === id);
      if (targetOrder) {
        await handleAcceptOrder(targetOrder);
        return;
      }
    } else if (currentStatus === "accepted" || currentStatus === "preparing") {
      nextStatus = "ready";
    } else if (currentStatus === "ready") {
      nextStatus = "completed";
    }

    try {
      await updateItem(id, { status: nextStatus });
    } catch (err) {
      console.error("Failed to advance order status:", err);
    }
  };

  return (
    <div>
      <PageHeader
        title="Kitchen display"
        description="Live cooking queue with automatic preparation timers and priority flags."
        icon={<ChefHat className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm">Full screen</Button>
            <Button variant="outline" size="sm">Sound on</Button>
          </>
        }
      />

      <ServiceRequestsSection />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Active orders", value: kitchenOrders.length, icon: <ChefHat className="h-4 w-4" />, tone: "text-primary" },
          { label: "Avg prep time", value: "14 min", icon: <Timer className="h-4 w-4" />, tone: "text-info" },
          { label: "Longest wait", value: "22 min", icon: <Clock className="h-4 w-4" />, tone: "text-warning" },
          { label: "New orders", value: kitchenOrders.filter(o => o.status === "pending").length, icon: <Flame className="h-4 w-4" />, tone: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
              {s.label}
              <span className={s.tone}>{s.icon}</span>
            </div>
            <div className={`mt-1 font-display text-2xl font-bold ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kitchenOrders.map((o) => (
          <KdsOrderCard
            key={o.id}
            order={o}
            onAccept={handleAcceptOrder}
            onAdvance={handleAdvanceStatus}
            onAutoReady={handleAutoReady}
          />
        ))}
      </div>
    </div>
  );
}
