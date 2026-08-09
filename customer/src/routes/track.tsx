import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { orderStatuses } from "@/lib/mock-data";
import { CheckCircle2, Circle, Clock, Utensils, Loader2 } from "lucide-react";
import { CustomerNav } from "@/components/customer-nav";
import { cart } from "@/lib/cart-store";
import { useTable } from "@/lib/table-store";
import { useCustomer } from "@/lib/customer-store";
import { CustomerRegistration } from "@/components/customer-registration";
import { getOrderById, getOrdersBySession, subscribeToOrdersBySession, type DbOrder } from "@/lib/supabase";

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: (search.orderId as string) || "",
  }),
  component: TrackOrder,
});

function getStepFromStatus(status?: string): number {
  switch (status?.toLowerCase().trim()) {
    case "pending":
    case "received":
      return 0;
    case "accepted":
      return 1;
    case "preparing":
      return 2;
    case "ready":
      return 3;
    case "served":
    case "completed":
      return 4;
    default:
      return 0;
  }
}

function TrackOrder() {
  const { orderId: activeId } = Route.useSearch();
  const tableNumber = useTable();
  const customer = useCustomer(tableNumber);

  const [order, setOrder] = useState<DbOrder | null>(null);
  const [loading, setLoading] = useState(true);

  if (!customer) {
    return (
      <CustomerRegistration
        tableNumber={tableNumber}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    );
  }

  useEffect(() => {
    let unsubscribe = () => {};

    async function loadOrder() {
      if (!customer?.sessionId) {
        console.log("[TRACK] Missing customer session");
        setOrder(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log("[TRACK] Customer session:", customer.sessionId);

      let fetchedOrder: DbOrder | null = null;

      // 1. Try URL orderId parameter or session-scoped active order ID
      const targetOrderId =
        activeId ||
        localStorage.getItem(`scandine_active_order_${customer.sessionId}`) ||
        localStorage.getItem("scandine_active_order_id");

      if (targetOrderId) {
        const byId = await getOrderById(targetOrderId);
        // Strict Session Isolation: ensure order belongs to current customer session
        if (byId && (byId.session_id === customer.sessionId || !byId.session_id)) {
          fetchedOrder = byId;
        }
      }

      // 2. If not found by ID, fetch latest active session order
      if (!fetchedOrder && customer?.sessionId) {
        const myOrders = await getOrdersBySession(customer.sessionId);
        if (myOrders && myOrders.length > 0) {
          const activeOrLatest =
            myOrders.find(
              (o) =>
                o.status !== "completed" &&
                o.status !== "served" &&
                o.status !== "cancelled"
            ) || myOrders[0];
          if (
            activeOrLatest &&
            (activeOrLatest.session_id === customer.sessionId || !activeOrLatest.session_id)
          ) {
            fetchedOrder = activeOrLatest;
          }
        }
      }

      if (fetchedOrder) {
        console.log("[TRACK] Initial order:", fetchedOrder.id, "Status:", fetchedOrder.status);
      } else {
        console.log("[TRACK] Initial order: null");
      }

      setOrder(fetchedOrder);
      setLoading(false);

      // 3. Realtime subscription for order updates
      unsubscribe = subscribeToOrdersBySession(customer.sessionId, (updatedOrder) => {
        console.log(
          "[TRACK] Realtime UPDATE:",
          updatedOrder.id,
          "Session:",
          updatedOrder.session_id,
          "Status:",
          updatedOrder.status
        );

        setOrder((prev) => {
          if (!prev) {
            if (!updatedOrder.session_id || updatedOrder.session_id === customer.sessionId) {
              console.log("[TRACK] Status changed:", updatedOrder.status);
              return updatedOrder;
            }
            console.log("[TRACK] Ignoring UPDATE - different customer session:", updatedOrder.session_id);
            return prev;
          }

          const isSameOrder =
            prev.id === updatedOrder.id || prev.order_number === updatedOrder.order_number;
          const isSameSession =
            !updatedOrder.session_id || updatedOrder.session_id === customer.sessionId;

          if (!isSameSession) {
            console.log("[TRACK] Ignoring UPDATE - different customer session:", updatedOrder.session_id);
            return prev;
          }

          if (!isSameOrder) {
            console.log("[TRACK] Ignoring UPDATE - different order:", updatedOrder.id);
            return prev;
          }

          console.log("[TRACK] Status changed:", prev.status, "->", updatedOrder.status);
          return updatedOrder;
        });
      });
      console.log("[TRACK] Realtime subscribed");
    }

    loadOrder();

    return () => {
      unsubscribe();
    };
  }, [activeId, customer?.sessionId]);

  const step = getStepFromStatus(order?.status);

  return (
    <div className="min-h-screen bg-background pb-32">
      <CustomerNav />
      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{tableNumber} Live Tracking</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          {order ? `Order ${order.order_number}` : "Order Tracking"}
        </h1>

        {loading ? (
          <div className="mt-12 text-center py-16 glass rounded-3xl">
            <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin mb-3" />
            <div className="font-semibold text-sm">Connecting to Kitchen...</div>
          </div>
        ) : !order ? (
          <div className="mt-6 glass rounded-3xl p-8 text-center">
            <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <div className="font-bold text-lg">No active order for {tableNumber}</div>
            <div className="text-xs text-muted-foreground mt-1 mb-4">Please place an order from the menu first.</div>
            <Link to="/menu" className="inline-flex rounded-full gradient-primary text-white text-sm font-semibold px-6 py-2.5 shadow-float">
              View Menu
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 glass rounded-3xl p-6 shadow-glass">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{order.table_number} · {order.items.length} Items</div>
                  <div className="font-display text-2xl font-bold mt-0.5">
                    {order.status === "completed"
                      ? "Order Completed"
                      : order.status === "ready"
                      ? "Ready to Serve!"
                      : "Cooking in Kitchen"}
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    Live Sync Active
                  </div>
                </div>
                <div className="h-16 w-16 rounded-2xl gradient-primary grid place-items-center text-white shadow-float animate-float">
                  <Utensils className="h-7 w-7" />
                </div>
              </div>

              {/* Items List */}
              <div className="mt-4 pt-4 border-t text-xs space-y-1 text-muted-foreground">
                <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2">Order Items</div>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.name} × {item.qty}</span>
                    <span className="font-medium text-foreground">₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>

              {/* Status Timeline */}
              <div className="mt-6 pt-4 border-t space-y-4">
                {orderStatuses.map((s, i) => {
                  const done = i <= step;
                  const current = i === step;
                  return (
                    <motion.div
                      key={s.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <motion.div
                          animate={current ? { scale: [1, 1.15, 1] } : {}}
                          transition={{ repeat: current ? Infinity : 0, duration: 1.4 }}
                          className={`h-10 w-10 rounded-full grid place-items-center ${done ? "gradient-primary text-white" : "bg-muted text-muted-foreground"}`}
                        >
                          {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </motion.div>
                        {i < orderStatuses.length - 1 && (
                          <div className={`w-0.5 flex-1 min-h-8 mt-1 ${done ? "bg-gradient-to-b from-primary to-secondary" : "bg-muted"}`} />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className={`font-semibold ${done ? "" : "text-muted-foreground"}`}>{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.desc}</div>
                        {current && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary font-semibold">
                            <Clock className="h-3 w-3 animate-pulse" /> Kitchen active step
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <Link to="/services" className="rounded-2xl border p-4 bg-card hover:shadow-float transition">
                <div className="font-semibold text-sm">Need something?</div>
                <div className="text-xs text-muted-foreground">Call waiter, request water, tissues…</div>
              </Link>
              <Link to="/payment" className="rounded-2xl gradient-primary text-white p-4 shadow-float">
                <div className="font-semibold text-sm">Ready to pay?</div>
                <div className="text-xs opacity-90">View invoice & pay online (Total: ₹{order.total})</div>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
