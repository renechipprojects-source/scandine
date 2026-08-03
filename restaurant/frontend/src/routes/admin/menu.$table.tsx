import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Badge } from "@/admin/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/admin/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/admin/components/ui/dialog";
import { Textarea } from "@/admin/components/ui/textarea";
import {
  Search, ShoppingBag, Star, Flame, Leaf, Plus, Minus, MapPin,
  Clock, Sparkles, ChevronRight, CheckCircle2,
} from "lucide-react";
import { foodItems as mockFoodItems, categories, restaurantInfo } from "@/admin/lib/mock-data";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useSupabaseTable, type MenuItem, type Order, type Invoice, type PaymentTransaction } from "@/hooks/useSupabaseData";
import { useOrderCountdown } from "@/hooks/useOrderTimer";
import { useRealtimeTable } from "@/hooks/useRealtime";

export const Route = createFileRoute("/admin/menu/$table")({
  head: () => ({
    meta: [
      { title: `${restaurantInfo.name} — Digital Menu` },
      { name: "description", content: "Scan, browse, order and pay — all from your table." },
    ],
  }),
  component: CustomerMenu,
});

// Unified display type that works for both DB items and mock items
type DisplayItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  image?: string;
  emoji?: string;
  prepTime?: number;
  preparation_time?: number;
  spicy?: number;
  veg?: boolean;
  popular?: boolean;
  featured?: boolean;
  category?: string;
};

type CartItem = DisplayItem & { qty: number; notes?: string };

function CustomerMenu() {
  const { table } = Route.useParams();
  const tableNumber = parseInt(table.replace(/\D/g, ""), 10) || 1;

  const { data: dbMenuItems, fetchData: fetchMenuItems } = useSupabaseTable<MenuItem>("sd_menu_items");
  const { data: dbOrders, fetchData: fetchOrders } = useSupabaseTable<Order>("sd_orders");
  const { addItem: addInvoice } = useSupabaseTable<Invoice>("invoices");
  const { addItem: addPayment } = useSupabaseTable<PaymentTransaction>("payments");

  const handleRealtimeItems = useCallback(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  useRealtimeTable("sd_menu_items", handleRealtimeItems);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [placed, setPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [currentOrderStatus, setCurrentOrderStatus] = useState("pending");
  const [estimatedReadyAt, setEstimatedReadyAt] = useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "GPay" | "Card">("GPay");

  const handleRealtimeOrders = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useRealtimeTable("sd_orders", handleRealtimeOrders);

  // Sync current order status from dbOrders when updated
  useEffect(() => {
    if (placedOrderId) {
      const activeOrd = dbOrders.find((o) => o.order_id === placedOrderId || o.id === placedOrderId);
      if (activeOrd) {
        if (activeOrd.status !== currentOrderStatus) {
          setCurrentOrderStatus(activeOrd.status);
          if (activeOrd.status === "preparing" || activeOrd.status === "accepted") {
            toast.info("👨‍🍳 Kitchen accepted your order and started preparation!", { duration: 5000 });
          } else if (activeOrd.status === "ready") {
            toast.success("🚀 Your order is Ready & Out for Delivery!", { duration: 8000 });
          } else if (activeOrd.status === "completed") {
            toast.success("✅ Order served! Enjoy your meal.");
          }
        }
        if (activeOrd.estimated_ready_at) {
          setEstimatedReadyAt(activeOrd.estimated_ready_at);
        }
      }
    }
  }, [dbOrders, placedOrderId, currentOrderStatus]);

  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail) {
        const { orderId, tableNumber: evTable, status, estimatedReadyAt: estAt } = customEv.detail;
        if (evTable === tableNumber || orderId === placedOrderId) {
          setCurrentOrderStatus(status);
          if (estAt) setEstimatedReadyAt(estAt);

          if (status === "ready") {
            toast.success("🚀 Your order is Ready! Arriving at your table shortly.", { duration: 8000 });
          } else if (status === "preparing" || status === "accepted") {
            toast.info("👨‍🍳 Kitchen has accepted and started preparing your order!");
          } else if (status === "completed") {
            toast.success("✅ Order served and completed! Enjoy your meal.");
          }
        }
      }
    };

    window.addEventListener("order-status-changed", handleStatusChange);
    return () => window.removeEventListener("order-status-changed", handleStatusChange);
  }, [tableNumber, placedOrderId]);

  // Use DB items loaded from Supabase
  const allItems: DisplayItem[] = dbMenuItems.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    price: Number(m.price),
    available: m.available,
    image: m.image,
    preparation_time: m.preparation_time,
    prepTime: m.preparation_time,
    spicy: 0,
    veg: false,
    popular: false,
    featured: false,
  }));

  const filtered = activeCat === "all"
    ? allItems
    : allItems.filter((f) => {
        if ("category" in f && f.category) {
          return f.category === categories.find((c) => c.id === activeCat)?.name;
        }
        return true;
      });

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = (f: DisplayItem) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === f.id);
      if (existing) return prev.map((p) => p.id === f.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { ...f, qty: 1 }];
    });
    toast.success(`Added ${f.name}`);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((p) => p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p).filter((p) => p.qty > 0));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || placingOrder) return;
    setPlacingOrder(true);

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const invId = `INV-${Date.now().toString().slice(-6)}`;
    const grandTotal = total * 1.08;
    const isPaid = paymentMethod === "GPay";
    const txnId = isPaid ? `TXN-GPAY-${Date.now().toString().slice(-8)}` : undefined;
    const payStatus = isPaid ? "Paid" : "Pending";

    const orderPayload = {
      order_id: orderId,
      customer: `Table ${tableNumber} Guest`,
      table_number: tableNumber,
      item: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price })),
      total: parseFloat(grandTotal.toFixed(2)),
      status: "pending" as const,
      payment: isPaid ? ("paid" as const) : ("unpaid" as const),
      order_time: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured) {
        await supabase.from("sd_orders").insert([orderPayload]);
      }

      await addInvoice({
        id: invId,
        transition: orderId,
        invoice: invId,
        customer: `Table ${tableNumber} Guest`,
        method: paymentMethod,
        amount: parseFloat(grandTotal.toFixed(2)),
        status: payStatus,
        date: new Date().toISOString(),
        transaction_id: txnId,
      });

      await addPayment({
        id: `PMT-${Date.now().toString().slice(-6)}`,
        invoiceId: invId,
        customer: `Table ${tableNumber} Guest`,
        method: paymentMethod,
        amount: parseFloat(grandTotal.toFixed(2)),
        status: payStatus,
        date: new Date().toISOString(),
        transaction_id: txnId,
      });

      setPlacedOrderId(orderId);
      setPlaced(true);
      setCart([]);
      toast.success(
        isPaid
          ? `GPay Payment Successful (${txnId})! Order placed.`
          : `Order placed! Pay via ${paymentMethod} at counter or table.`
      );
    } catch (err) {
      toast.error("Something went wrong placing the order.");
      console.error(err);
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-background to-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-destructive text-primary-foreground shadow">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold">{restaurantInfo.name}</div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />{restaurantInfo.branch} · Table <span className="font-semibold text-primary">{table}</span>
            </div>
          </div>
          <div className="hidden items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[11px] font-medium text-success sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />Open now
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-32">
        <section className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-destructive to-orange-500 p-6 text-primary-foreground shadow-lg">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <Badge className="bg-white/20 text-primary-foreground backdrop-blur">🔥 Today's specials</Badge>
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight">Welcome to your table.</h1>
            <p className="mt-1 text-sm text-primary-foreground/90">Order directly from your seat — no app, no wait.</p>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Avg 14 min</span>
              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-current" />4.9 (2.1k)</span>
            </div>
          </div>
        </section>

        <div className="sticky top-[68px] z-10 -mx-4 mt-4 bg-gradient-to-b from-background via-background to-transparent px-4 pb-3 pt-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search dishes…" className="pl-9 rounded-full bg-card shadow-sm" />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
            <CatChip label="All" active={activeCat === "all"} onClick={() => setActiveCat("all")} icon="🍽️" />
            {categories.map((c) => (
              <CatChip key={c.id} label={c.name} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} icon={c.icon} />
            ))}
          </div>
        </div>

        <section className="mt-2">
          <SectionTitle title="Popular right now" icon="🔥" />
          <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
            {allItems.filter((f) => f.popular).map((f) => (
              <button key={f.id} onClick={() => addToCart(f)} className="min-w-[160px] max-w-[160px] shrink-0 overflow-hidden rounded-2xl bg-card text-left shadow-sm transition-all active:scale-95">
                <div className="relative grid h-24 place-items-center overflow-hidden bg-gradient-to-br from-orange-100 to-red-100">
                  {f.image
                    ? <img src={f.image} alt={f.name} className="h-full w-full object-cover" />
                    : <span className="text-4xl">{"emoji" in f ? f.emoji : "🍽️"}</span>
                  }
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 text-sm font-semibold">{f.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-display text-base font-bold text-primary">{restaurantInfo.currency}{f.price}</span>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-3 w-3" /></span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle title={activeCat === "all" ? "All dishes" : categories.find((c) => c.id === activeCat)?.name || "Menu"} icon="🍽️" />
          <div className="mt-3 space-y-3">
            {filtered.map((f) => <FoodRow key={f.id} f={f} onAdd={() => addToCart(f)} />)}
          </div>
        </section>
      </main>

      {itemCount > 0 && !placed && (
        <Sheet>
          <SheetTrigger asChild>
            <div className="fixed inset-x-0 bottom-4 z-30 mx-auto max-w-lg px-4">
              <button className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-destructive p-4 text-primary-foreground shadow-2xl transition-transform active:scale-[0.98]">
                <div className="relative">
                  <ShoppingBag className="h-6 w-6" />
                  <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-bold text-primary">{itemCount}</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs opacity-90">{itemCount} items in cart</div>
                  <div className="font-display text-base font-bold">View cart · {restaurantInfo.currency}{total.toFixed(2)}</div>
                </div>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[90vh] rounded-t-3xl">
            <SheetHeader className="text-left">
              <SheetTitle>Your order · Table {table}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto">
              {cart.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-orange-100 to-red-100">
                    {c.image
                      ? <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                      : <span className="text-2xl">{"emoji" in c ? c.emoji : "🍽️"}</span>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{restaurantInfo.currency}{c.price}</div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border p-0.5">
                    <button onClick={() => updateQty(c.id, -1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"><Minus className="h-3 w-3" /></button>
                    <span className="w-5 text-center text-sm font-semibold">{c.qty}</span>
                    <button onClick={() => updateQty(c.id, 1)} className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex gap-2">
                <Input placeholder="Coupon code" className="flex-1" />
                <Button variant="outline">Apply</Button>
              </div>
              <Textarea placeholder="Special instructions for the chef…" rows={2} />
              <div className="space-y-1.5 border-t pt-3">
                <div className="text-xs font-semibold text-muted-foreground">Payment Method</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["GPay", "Cash", "Card"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 text-xs font-semibold transition-all ${
                        paymentMethod === method
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <span>{method === "GPay" ? "📱 GPay" : method === "Cash" ? "💵 Cash" : "💳 Card"}</span>
                      <span className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                        {method === "GPay" ? "Instant Paid" : "Pending Pay"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">Estimated preparation: 14–18 minutes</div>
            </div>
            <SheetFooter className="mt-4">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-destructive text-primary-foreground"
                onClick={handlePlaceOrder}
                disabled={placingOrder}
              >
                {placingOrder ? "Placing order…" : `Pay & Place Order (${paymentMethod}) · ${restaurantInfo.currency}${(total * 1.08).toFixed(2)}`}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Order confirmation dialog */}
      <CustomerOrderTrackingDialog
        open={placed}
        onOpenChange={setPlaced}
        placedOrderId={placedOrderId}
        table={table}
        status={currentOrderStatus}
        estimatedReadyAt={estimatedReadyAt}
      />
    </div>
  );
}

function CustomerOrderTrackingDialog({
  open,
  onOpenChange,
  placedOrderId,
  table,
  status,
  estimatedReadyAt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placedOrderId: string;
  table: string;
  status: string;
  estimatedReadyAt?: string;
}) {
  const { formattedTime } = useOrderCountdown(estimatedReadyAt, status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-center font-display text-2xl font-bold">Order placed!</p>
        </DialogHeader>
        <div className="text-center text-sm text-muted-foreground">
          Your order <span className="font-semibold text-foreground">#{placedOrderId}</span> is now sent to the kitchen.
        </div>
        <div className="rounded-2xl bg-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Table</span>
            <span className="font-semibold">Table {table}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Status</span>
            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-warning">
              {status === "preparing" || status === "accepted" ? "Preparing 👨‍🍳" : status}
            </span>
          </div>

          {(status === "preparing" || status === "accepted") && (
            <div className="rounded-xl border border-info/30 bg-info/10 p-2.5 text-center">
              <div className="text-[11px] font-semibold text-info-foreground">Live Preparation Countdown</div>
              <div className="mt-1 flex items-center justify-center gap-1.5 font-mono text-lg font-bold text-info">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>{formattedTime}</span>
              </div>
            </div>
          )}

          {status === "ready" && (
            <div className="rounded-xl bg-primary/10 p-2.5 text-center text-xs font-bold text-primary">
              🚀 Order Ready! Arriving at your table shortly.
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Order more</Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CatChip({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/40"}`}>
      <span>{icon}</span>{label}
    </button>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <h2 className="font-display text-lg font-bold">{title}</h2>
    </div>
  );
}

function FoodRow({ f, onAdd }: { f: DisplayItem; onAdd: () => void }) {
  return (
    <div className="flex gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {("veg" in f) && (
            <span className={`grid h-4 w-4 place-items-center rounded-sm border-2 ${f.veg ? "border-emerald-600" : "border-red-600"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${f.veg ? "bg-emerald-600" : "bg-red-600"}`} />
            </span>
          )}
          {f.popular && <Badge variant="secondary" className="h-4 gap-0.5 px-1.5 text-[9px]">🔥 Popular</Badge>}
          {f.featured && <Badge className="h-4 gap-0.5 bg-primary px-1.5 text-[9px]"><Star className="h-2 w-2" />Featured</Badge>}
        </div>
        <div className="mt-1 font-display text-base font-bold">{f.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{f.prepTime || f.preparation_time || 15}m</span>
          {("spicy" in f) && Array.from({ length: f.spicy ?? 0 }).map((_, i) => <Flame key={i} className="h-2.5 w-2.5 text-destructive" />)}
          {("veg" in f) && f.veg && <Leaf className="h-2.5 w-2.5 text-emerald-600" />}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.description}</p>
        <div className="mt-2 font-display text-base font-bold text-primary">{restaurantInfo.currency}{f.price}</div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-orange-100 to-red-100 shadow-inner">
          {f.image
            ? <img src={f.image} alt={f.name} className="h-full w-full object-cover" />
            : <span className="text-4xl">{"emoji" in f ? f.emoji : "🍽️"}</span>
          }
        </div>
        <Button
          disabled={!f.available}
          onClick={onAdd}
          size="sm"
          className="-mt-6 h-8 gap-1 rounded-full bg-white text-primary shadow-lg hover:bg-primary hover:text-primary-foreground border border-primary/20"
        >
          <Plus className="h-3.5 w-3.5" />{f.available ? "Add" : "Sold out"}
        </Button>
      </div>
    </div>
  );
}
