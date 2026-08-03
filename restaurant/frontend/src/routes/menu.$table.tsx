import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Label } from "@/admin/components/ui/label";
import { Badge } from "@/admin/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/admin/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/admin/components/ui/dialog";
import { Textarea } from "@/admin/components/ui/textarea";
import {
  Search, ShoppingBag, Star, Flame, Leaf, Plus, Minus, MapPin,
  Clock, Sparkles, ChevronRight, CheckCircle2, Droplet, Receipt, ConciergeBell, UserCheck, Loader2
} from "lucide-react";
import { categories, restaurantInfo } from "@/admin/lib/mock-data";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useSupabaseTable, markPaymentAndInvoiceAsPaid, type MenuItem, type Order, type Invoice, type PaymentTransaction } from "@/hooks/useSupabaseData";
import { useOrderCountdown } from "@/hooks/useOrderTimer";
import { useRealtimeTable } from "@/hooks/useRealtime";

export const Route = createFileRoute("/menu/$table")({
  head: () => ({
    meta: [
      { title: `${restaurantInfo.name} — Digital Menu` },
      { name: "description", content: "Scan, browse, order and pay — all from your table." },
    ],
  }),
  component: TopLevelCustomerMenu,
});

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

interface CustomerInfo {
  name: string;
  phone: string;
}

interface CustomerServiceRequest {
  id: string;
  type: string;
  label: string;
  status: "pending" | "accepted" | "completed";
  time: string;
}

function TopLevelCustomerMenu() {
  const { table } = Route.useParams();
  const rawNum = table.replace(/\D/g, "");
  const tableNumber = parseInt(rawNum, 10) || 1;

  // Registration & Customer Info State
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");

  // Service Request State
  const [activeRequests, setActiveRequests] = useState<CustomerServiceRequest[]>([]);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Initialize & lock customer info and table number
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("savora.current_table", String(tableNumber));
        const savedInfo = localStorage.getItem("savora.customer_info");
        if (savedInfo) {
          const parsed = JSON.parse(savedInfo);
          if (parsed.name && parsed.phone) {
            setCustomerInfo(parsed);
            setIsRegistering(false);
          } else {
            setIsRegistering(true);
          }
        } else {
          setIsRegistering(true);
        }
      }
    } catch {
      setIsRegistering(true);
    }
  }, [tableNumber]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!regPhone.trim() || regPhone.trim().length < 7) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    const info: CustomerInfo = { name: regName.trim(), phone: regPhone.trim() };
    setCustomerInfo(info);
    try {
      localStorage.setItem("savora.customer_info", JSON.stringify(info));
    } catch {}
    setIsRegistering(false);
    toast.success(`Welcome ${info.name}! Table ${tableNumber} is ready for ordering.`);
  };

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

  // Supabase Realtime Subscription for Service Requests status updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`customer_service_requests_table_${tableNumber}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sd_notifications",
          filter: `table_number=eq.${tableNumber}`,
        },
        (payload) => {
          if (payload.new) {
            const rawStatus = (payload.new.status || "").toLowerCase();
            const reqId = String(payload.new.id);
            let nextStatus: "pending" | "accepted" | "completed" = "pending";

            if (rawStatus.includes("accept")) nextStatus = "accepted";
            else if (rawStatus.includes("complete")) nextStatus = "completed";

            setActiveRequests((prev) =>
              prev.map((r) => (r.id === reqId ? { ...r, status: nextStatus } : r))
            );

            if (nextStatus === "accepted") {
              toast.info(`👨‍🍳 Staff accepted your service request: ${payload.new.request_type || "Call Staff"}`);
            } else if (nextStatus === "completed") {
              toast.success(`✅ Service request completed: ${payload.new.request_type || "Call Staff"}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableNumber]);

  // Sync current order status from dbOrders
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

  const handleSendServiceRequest = async (label: string, serviceType: string) => {
    const custName = customerInfo?.name || `Table ${tableNumber} Guest`;
    setSendingRequest(true);
    const reqId = `SRV-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const newReq: CustomerServiceRequest = {
      id: reqId,
      type: serviceType,
      label,
      status: "pending",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    try {
      if (isSupabaseConfigured) {
        await supabase.from("sd_notifications").insert([
          {
            id: reqId,
            table_number: String(tableNumber),
            customer_name: custName,
            request_type: label,
            service_type: serviceType,
            status: "Pending",
            created_at: nowIso,
          },
        ]);
      }

      setActiveRequests((prev) => [newReq, ...prev]);
      toast.success(`Requested ${label}! Staff notified for Table ${tableNumber}.`);
    } catch (err) {
      console.error("Failed to send service request:", err);
      toast.error("Could not send service request.");
    } finally {
      setSendingRequest(false);
    }
  };

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

    const custName = customerInfo?.name ? `${customerInfo.name} (Table ${tableNumber})` : `Table ${tableNumber} Guest`;
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const invId = `INV-${Date.now().toString().slice(-6)}`;
    const grandTotal = total * 1.08;
    const isPaid = paymentMethod === "GPay";
    const txnId = isPaid ? `TXN-GPAY-${Date.now().toString().slice(-8)}` : undefined;
    const payStatus = isPaid ? "Paid" : "Pending";

    const orderPayload = {
      order_id: orderId,
      customer: custName,
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
        customer: custName,
        method: paymentMethod,
        amount: parseFloat(grandTotal.toFixed(2)),
        status: payStatus,
        date: new Date().toISOString(),
        transaction_id: txnId,
      });

      await addPayment({
        id: `PMT-${Date.now().toString().slice(-6)}`,
        invoiceId: invId,
        customer: custName,
        method: paymentMethod,
        amount: parseFloat(grandTotal.toFixed(2)),
        status: payStatus,
        date: new Date().toISOString(),
        transaction_id: txnId,
      });

      if (isPaid) {
        await markPaymentAndInvoiceAsPaid(invId, invId, custName, grandTotal, paymentMethod);
      }

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
      {/* Registration Modal Dialog */}
      <Dialog open={isRegistering} onOpenChange={() => {}}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
              <UserCheck className="h-6 w-6" /> Welcome to ScanDine
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegisterSubmit} className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Please enter your details to view the menu and place orders for <strong className="text-primary">Table {tableNumber}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reg-name">Your Full Name *</Label>
              <Input
                id="reg-name"
                placeholder="e.g. Alex Johnson"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-phone">Mobile Number *</Label>
              <Input
                id="reg-phone"
                type="tel"
                placeholder="e.g. 9876543210"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-bold bg-primary hover:bg-primary/90 mt-2">
              Continue to Table {tableNumber} Menu
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-destructive text-primary-foreground shadow">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold">{restaurantInfo.name}</div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />{restaurantInfo.branch} · Table <span className="font-semibold text-primary">{tableNumber}</span>
              {customerInfo && <span className="ml-1 text-foreground font-semibold">({customerInfo.name})</span>}
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
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight">
              Welcome {customerInfo?.name ? customerInfo.name : `to Table ${tableNumber}`}.
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/90">Order directly from your seat — no app, no wait.</p>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Avg 14 min</span>
              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-current" />4.9 (2.1k)</span>
            </div>
          </div>
        </section>

        {/* Quick Table Service Requests Bar */}
        <section className="mt-4 rounded-2xl border bg-card p-3 shadow-xs">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ConciergeBell className="h-3.5 w-3.5 text-primary" /> Table Service Requests
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Water", icon: Droplet, service: "water" },
              { label: "Bill", icon: Receipt, service: "bill" },
              { label: "Call Staff", icon: ConciergeBell, service: "waiter" },
              { label: "Clean Table", icon: Sparkles, service: "clean" },
            ].map((srv) => (
              <Button
                key={srv.label}
                variant="outline"
                size="sm"
                disabled={sendingRequest}
                onClick={() => handleSendServiceRequest(`Request ${srv.label}`, srv.service)}
                className="flex flex-col items-center justify-center h-14 p-1 text-xs gap-1 border-primary/20 hover:bg-primary/10 hover:border-primary"
              >
                <srv.icon className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-semibold">{srv.label}</span>
              </Button>
            ))}
          </div>

          {/* Active Service Requests Status Tracker */}
          {activeRequests.length > 0 && (
            <div className="mt-3 border-t pt-2 space-y-1.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Recent Request Status:</div>
              {activeRequests.slice(0, 3).map((req) => (
                <div key={req.id} className="flex items-center justify-between text-xs bg-muted/40 px-2.5 py-1 rounded-lg">
                  <span className="font-semibold">{req.label}</span>
                  <Badge
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      req.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : req.status === "accepted"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800 animate-pulse"
                    }`}
                  >
                    {req.status === "completed" ? "Completed ✅" : req.status === "accepted" ? "Accepted 👨‍🍳" : "Pending ⏳"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="sticky top-[68px] z-10 -mx-4 mt-4 bg-gradient-to-b from-background via-background to-transparent px-4 pb-3 pt-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search dishes…" className="pl-9 rounded-full bg-card shadow-sm" />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveCat("all")}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${activeCat === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
            >
              <span>🍽️</span>All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${activeCat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
              >
                <span>{c.icon}</span>{c.name}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            <h2 className="font-display text-lg font-bold">{activeCat === "all" ? "All dishes" : categories.find((c) => c.id === activeCat)?.name || "Menu"}</h2>
          </div>
          <div className="mt-3 space-y-3">
            {filtered.map((f) => (
              <div key={f.id} className="flex gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                <div className="min-w-0 flex-1">
                  <div className="mt-1 font-display text-base font-bold">{f.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{f.prepTime || f.preparation_time || 15}m</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.description}</p>
                  <div className="mt-2 font-display text-base font-bold text-primary">{restaurantInfo.currency}{f.price}</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-orange-100 to-red-100 shadow-inner">
                    {f.image
                      ? <img src={f.image} alt={f.name} className="h-full w-full object-cover" />
                      : <span className="text-4xl">🍽️</span>
                    }
                  </div>
                  <Button
                    disabled={!f.available}
                    onClick={() => addToCart(f)}
                    size="sm"
                    className="-mt-6 h-8 gap-1 rounded-full bg-white text-primary shadow-lg hover:bg-primary hover:text-primary-foreground border border-primary/20"
                  >
                    <Plus className="h-3.5 w-3.5" />{f.available ? "Add" : "Sold out"}
                  </Button>
                </div>
              </div>
            ))}
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
              <SheetTitle>Your order · Table {tableNumber}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto">
              {cart.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-orange-100 to-red-100">
                    {c.image
                      ? <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                      : <span className="text-2xl">🍽️</span>
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
      <Dialog open={placed} onOpenChange={setPlaced}>
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
              <span className="font-semibold">Table {tableNumber}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-warning">
                {currentOrderStatus}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPlaced(false)}>Order more</Button>
            <Button className="flex-1" onClick={() => setPlaced(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
