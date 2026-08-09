import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CustomerNav } from "@/components/customer-nav";
import { useNotifications, notificationStore, type AppNotification } from "@/lib/notification-store";
import { useTable, tableStore } from "@/lib/table-store";
import { useCustomer } from "@/lib/customer-store";
import { CustomerRegistration } from "@/components/customer-registration";
import { subscribeToOrdersBySession, type DbOrder } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Sparkles, Gift, Trash2, CheckCheck, Utensils } from "lucide-react";

export const Route = createFileRoute("/notifications")({ component: Notifs });

function Notifs() {
  const navigate = useNavigate();
  const notifs = useNotifications();
  const tableNumber = useTable();
  const customer = useCustomer(tableNumber);

  if (!customer) {
    return (
      <CustomerRegistration
        tableNumber={tableNumber}
        onSuccess={() => {
          navigate({ to: "/", replace: true });
        }}
      />
    );
  }

  useEffect(() => {
    if (!customer?.sessionId) return;

    // Listen for live updates on orders for this session
    const unsubscribe = subscribeToOrdersBySession(customer.sessionId, (updatedOrder: DbOrder) => {
      if (updatedOrder.status === "ready") {
        notificationStore.addNotification({
          title: `Order ${updatedOrder.order_number || updatedOrder.id} is READY! 🍽️`,
          desc: `Your food is ready and being served to ${tableNumber}. Enjoy!`,
          type: "success",
          category: "orders",
        });
      } else if (updatedOrder.status === "preparing") {
        notificationStore.addNotification({
          title: `Chef is Preparing Order ${updatedOrder.order_number || updatedOrder.id}`,
          desc: `Your order is now being cooked with love in the kitchen.`,
          type: "info",
          category: "orders",
        });
      } else if (updatedOrder.status === "completed" || updatedOrder.status === "served") {
        notificationStore.addNotification({
          title: `Order ${updatedOrder.order_number || updatedOrder.id} Completed ✨`,
          desc: `Thank you for dining with us! Hope you enjoyed your meal.`,
          type: "success",
          category: "orders",
        });
      }
    });

    return () => unsubscribe();
  }, [tableNumber, customer?.sessionId]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <CustomerNav />
      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{tableNumber} Alerts</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Notifications</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => notificationStore.markAllAsRead()}
              className="rounded-full border bg-card p-2 text-xs font-semibold hover:bg-muted text-muted-foreground"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
            <button
              onClick={() => notificationStore.clearAll()}
              className="rounded-full border bg-card p-2 text-xs font-semibold hover:bg-muted text-destructive"
              title="Clear all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="mt-6 space-y-3">
          {notifs.length === 0 ? (
            <div className="text-center py-16 glass rounded-3xl">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-2 opacity-50" />
              <div className="font-semibold text-sm">No notifications yet</div>
              <div className="text-xs text-muted-foreground">Order updates and service alerts will appear here.</div>
            </div>
          ) : (
            <AnimatePresence>
              {notifs.map((n, i) => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => notificationStore.markAsRead(n.id)}
                  className={`glass rounded-2xl p-4 flex gap-3 items-start cursor-pointer border transition ${
                    !n.read ? "border-primary/40 bg-primary/5" : ""
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-xl grid place-items-center text-white shrink-0 ${
                      n.type === "success"
                        ? "bg-emerald-500"
                        : n.type === "offer"
                        ? "gradient-primary"
                        : "gradient-accent"
                    }`}
                  >
                    {n.category === "orders" ? (
                      <Utensils className="h-4 w-4" />
                    ) : n.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : n.type === "offer" ? (
                      <Gift className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm truncate">{n.title}</div>
                      <div className="text-[10px] text-muted-foreground shrink-0">{n.time}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.desc}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
