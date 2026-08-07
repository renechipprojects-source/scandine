import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, Loader2 } from "lucide-react";
import { useState } from "react";
import { cart, useCart, cartTotals } from "@/lib/cart-store";
import { tableStore, useTable } from "@/lib/table-store";
import { customerStore, useCustomer } from "@/lib/customer-store";
import { CustomerRegistration } from "@/components/customer-registration";
import { createOrder, notifyKitchenNewOrder } from "@/lib/supabase";
import { liveOrderStore } from "@/lib/live-order-store";
import { toast } from "sonner";
import { CustomerNav } from "@/components/customer-nav";
import { InvalidQrScreen } from "@/components/invalid-qr";

export const Route = createFileRoute("/cart")({
  component: Cart,
});

function Cart() {
  const tableNumber = useTable();
  const customer = useCustomer(tableNumber);
  const state = useCart();
  const nav = useNavigate();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const totals = cartTotals(state.items);

  if (!tableNumber) {
    return <InvalidQrScreen />;
  }

  if (!customer) {
    return (
      <CustomerRegistration
        tableNumber={tableNumber}
        onSuccess={() => {
          nav({ to: "/", replace: true });
        }}
      />
    );
  }

  const handlePlaceOrder = async () => {
    if (state.items.length === 0 || isPlacingOrder) return;
    setIsPlacingOrder(true);
    try {
      const orderNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;
      const orderId = `ord_${Date.now()}`;
      const activeTable = tableStore.getTableNumber();
      const registeredCust = customerStore.getCustomer(activeTable);
      const custDisplayName = registeredCust ? registeredCust.fullName : `${activeTable} Guest`;

      const orderPayloadItems = state.items.map((i) => ({
        id: i.food.id,
        name: i.food.name,
        price: i.food.price,
        qty: i.qty,
        note: i.note,
        image: i.food.image,
      }));

      // Broadcast order to Kitchen live store
      liveOrderStore.addOrder({
        id: orderNumber,
        table: activeTable,
        customer: custDisplayName,
        items: orderPayloadItems.map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
        total: totals.total,
        status: "pending",
        payment: "unpaid",
        channel: "QR",
      });

      const created = await createOrder({
        id: orderId,
        order_number: orderNumber,
        table_number: activeTable,
        customer_name: custDisplayName,
        items: orderPayloadItems,
        subtotal: totals.subtotal,
        discount: totals.discount,
        gst: totals.gst,
        total: totals.total,
        status: "pending",
        payment_status: "unpaid",
      });

      await notifyKitchenNewOrder(created);

      cart.setActiveOrder(created.id);
      cart.clear();
      toast.success(`Order ${created.order_number} placed! Sent to Kitchen.`);
      nav({ to: "/track", search: { orderId: created.id } as any });
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-40">
      <CustomerNav />
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{tableNumber} Cart</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">Your Cart</h1>

        {state.items.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-3">🛒</div>
            <div className="font-semibold">Your cart is empty</div>
            <div className="text-xs text-muted-foreground">Browse the menu and add something delicious.</div>
            <Link to="/menu" className="mt-6 inline-flex rounded-full gradient-primary text-white px-6 py-3 text-sm font-semibold shadow-float">
              Explore menu
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              <AnimatePresence>
                {state.items.map((i) => (
                  <motion.div
                    key={i.food.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    className="glass rounded-2xl p-3 flex gap-3 items-center"
                  >
                    <img src={i.food.image} className="h-20 w-20 rounded-xl object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{i.food.name}</div>
                      <div className="text-xs text-muted-foreground">₹{i.food.price} each</div>
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => cart.setQty(i.food.id, i.qty - 1)} className="h-8 w-8 rounded-full border grid place-items-center"><Minus className="h-3 w-3" /></button>
                        <div className="text-sm font-bold w-6 text-center">{i.qty}</div>
                        <button onClick={() => cart.setQty(i.food.id, i.qty + 1)} className="h-8 w-8 rounded-full gradient-primary text-white grid place-items-center"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">₹{i.food.price * i.qty}</div>
                      <button onClick={() => cart.remove(i.food.id)} className="mt-2 text-xs text-destructive inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Bill */}
            <div className="mt-5 rounded-3xl border bg-card p-5">
              <Row label="Subtotal" value={`₹${totals.subtotal}`} />
              <Row label="GST (5%)" value={`₹${totals.gst}`} />
              <div className="h-px bg-border my-3" />
              <Row label="Grand total" value={`₹${totals.total}`} bold />
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
              className="mt-6 w-full rounded-2xl gradient-primary text-white font-semibold py-4 shadow-float flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending order to kitchen…
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" /> Place order · ₹{totals.total}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1.5">
      <span className={accent ? "text-emerald-600" : "text-muted-foreground"}>{label}</span>
      <span className={`${bold ? "font-bold text-lg text-gradient font-display" : ""} ${accent ? "text-emerald-600 font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
