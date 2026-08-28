import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import {
  UtensilsCrossed,
  Bell,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  ChefHat,
  ConciergeBell,
  RefreshCw,
  User,
  Hash,
  AlertCircle,
  Play,
  Flame,
  Check,
  XCircle,
  BookOpen,
  Tag,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { CustomerNav } from "@/components/customer-nav";
import {
  supabase,
  isSupabaseConfigured,
  type DbOrder,
  type ServiceRequest,
  type DbMenuItem,
  fetchDbMenuItems,
  mapRowToDbOrder,
  mapNotificationToServiceRequest,
  getAllServiceRequests,
  notifyCustomerServiceRequestStatus,
} from "@/lib/supabase";
import { foods } from "@/lib/mock-data";
import { liveOrderStore, useLiveOrders, useLiveServiceRequests, type LiveOrder, type LiveServiceRequest } from "@/lib/live-order-store";
import { soundManager, playOrderNotificationSound, playServiceNotificationSound } from "@/lib/audio-notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen")({ component: KitchenDashboard });

type CombinedOrder = {
  id: string;
  order_number: string;
  table_number: string;
  customer_name: string;
  items: Array<{ name: string; qty: number; price?: number; note?: string }>;
  total: number;
  status: string;
  created_at: string;
};

type CombinedService = {
  id: string;
  table_number: string;
  service_type: string;
  label: string;
  status: "pending" | "dispatched" | "accepted" | "rejected" | "completed";
  created_at: string;
};

function KitchenDashboard() {
  const [activeTab, setActiveTab] = useState<"all" | "orders" | "services" | "menu">("all");
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [dbOrders, setDbOrders] = useState<DbOrder[]>([]);
  const [dbServices, setDbServices] = useState<ServiceRequest[]>([]);
  const [kitchenMenuItems, setKitchenMenuItems] = useState<DbMenuItem[]>([]);
  const [menuFilterCat, setMenuFilterCat] = useState<string>("All");
  const [isLive, setIsLive] = useState(true);

  const liveOrders = useLiveOrders();
  const liveServices = useLiveServiceRequests();

  const processedOrderIds = useRef(new Set<string>());
  const processedServiceIds = useRef(new Set<string>());

  const toggleMute = () => {
    soundManager.enableAudio();
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
    if (!next) {
      toast.success("Kitchen sound notifications unmuted");
    } else {
      toast.info("Kitchen sound notifications muted");
    }
  };

  // Enable audio context on any user click
  useEffect(() => {
    const handleUserInteraction = () => {
      soundManager.enableAudio();
    };
    window.addEventListener("click", handleUserInteraction);
    return () => window.removeEventListener("click", handleUserInteraction);
  }, []);

  // Fetch initial Supabase data & set up subscriptions
  useEffect(() => {
    let orderChannel: ReturnType<typeof supabase.channel> | null = null;
    let kitchenBroadcastChannel: ReturnType<typeof supabase.channel> | null = null;
    let serviceChannel: ReturnType<typeof supabase.channel> | null = null;

    async function loadData() {
      if (isSupabaseConfigured()) {
        try {
          const { data: oData } = await supabase
            .from("sd_orders")
            .select("*")
            .order("created_at", { ascending: false });

          if (oData) {
            const mapped = oData.map(mapRowToDbOrder);
            setDbOrders(mapped);
            mapped.forEach((o) => processedOrderIds.current.add(o.id));
          }
        } catch (e) {
          console.warn("Kitchen orders fetch error:", e);
        }

        try {
          const sData = await getAllServiceRequests();
          setDbServices(sData);
          sData.forEach((s) => processedServiceIds.current.add(s.id));
        } catch (e) {
          console.warn("Kitchen service requests fetch error:", e);
        }

        try {
          const mData = await fetchDbMenuItems();
          if (mData && mData.length > 0) {
            setKitchenMenuItems(mData);
          } else {
            const mapped: DbMenuItem[] = foods.map((f) => ({
              id: f.id,
              name: f.name,
              description: f.description,
              price: f.price,
              category: f.category,
              image: f.image,
              veg: f.veg,
              available: f.available,
              prepTime: f.prepTime,
            }));
            setKitchenMenuItems(mapped);
          }
        } catch (e) {
          console.warn("Kitchen menu items fetch error:", e);
        }

        // Subscriptions for Postgres Changes
        orderChannel = supabase
          .channel("kitchen-orders-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "sd_orders" },
            (payload) => {
              if (payload.eventType === "INSERT" && payload.new) {
                const newOrd = mapRowToDbOrder(payload.new);
                setDbOrders((prev) => [newOrd, ...prev.filter((o) => o.id !== newOrd.id)]);
                if (!processedOrderIds.current.has(newOrd.id)) {
                  processedOrderIds.current.add(newOrd.id);
                  playOrderNotificationSound();
                  toast.success(`🔔 NEW ORDER: Table ${newOrd.table_number}`, {
                    description: `${newOrd.customer_name} placed ${newOrd.items.length} items`,
                  });
                }
              } else if (payload.eventType === "UPDATE" && payload.new) {
                const updated = mapRowToDbOrder(payload.new);
                setDbOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
              }
            }
          )
          .subscribe();

        serviceChannel = supabase
          .channel("kitchen-services-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "sd_notifications" },
            (payload) => {
              if (payload.new && (payload.new as any).request_type) {
                const newSrv = mapNotificationToServiceRequest(payload.new);
                if (payload.eventType === "INSERT") {
                  setDbServices((prev) => [newSrv, ...prev.filter((s) => s.id !== newSrv.id)]);
                  if (!processedServiceIds.current.has(newSrv.id)) {
                    processedServiceIds.current.add(newSrv.id);
                    playServiceNotificationSound();
                    toast.info(`🔔 SERVICE REQUEST: Table ${newSrv.table_number}`, {
                      description: `Request: ${newSrv.label}`,
                    });
                  }
                } else if (payload.eventType === "UPDATE") {
                  setDbServices((prev) => prev.map((s) => (s.id === newSrv.id ? newSrv : s)));
                }
              }
            }
          )
          .subscribe();

        // Broadcast channel dedicated to Kitchen
        kitchenBroadcastChannel = supabase.channel("scandine_kitchen_channel");
        kitchenBroadcastChannel
          .on("broadcast", { event: "kitchen_new_order" }, (evt) => {
            if (evt.payload?.order) {
              const newOrd = evt.payload.order as DbOrder;
              setDbOrders((prev) => [newOrd, ...prev.filter((o) => o.id !== newOrd.id)]);
              if (!processedOrderIds.current.has(newOrd.id)) {
                processedOrderIds.current.add(newOrd.id);
                playOrderNotificationSound();
                toast.success(`🔔 NEW ORDER: Table ${newOrd.table_number}`);
              }
            }
          })
          .on("broadcast", { event: "kitchen_service_request" }, (evt) => {
            if (evt.payload?.service && evt.payload.target === "kitchen") {
              const srv = evt.payload.service as ServiceRequest;
              setDbServices((prev) => [srv, ...prev.filter((s) => s.id !== srv.id)]);
              if (!processedServiceIds.current.has(srv.id)) {
                processedServiceIds.current.add(srv.id);
                playServiceNotificationSound();
                toast.info(`🔔 SERVICE REQUEST: Table ${srv.table_number} - ${srv.label}`);
              }
            }
          })
          .subscribe();
      }
    }

    loadData();

    return () => {
      if (orderChannel) supabase.removeChannel(orderChannel);
      if (serviceChannel) supabase.removeChannel(serviceChannel);
      if (kitchenBroadcastChannel) supabase.removeChannel(kitchenBroadcastChannel);
    };
  }, []);

  // Listen to Local Sync Channel & Stores
  useEffect(() => {
    const unsubOrder = liveOrderStore.onNewOrder((newOrd) => {
      if (!processedOrderIds.current.has(newOrd.id)) {
        processedOrderIds.current.add(newOrd.id);
        playOrderNotificationSound();
        toast.success(`🔔 NEW ORDER: Table ${newOrd.table}`);
      }
    });

    const unsubService = liveOrderStore.onNewServiceRequest((newReq) => {
      if (!processedServiceIds.current.has(newReq.id)) {
        processedServiceIds.current.add(newReq.id);
        playServiceNotificationSound();
        toast.info(`🔔 SERVICE REQUEST: Table ${newReq.table_number} - ${newReq.label}`);
      }
    });

    return () => {
      unsubOrder();
      unsubService();
    };
  }, []);

  // Combine DB & Live state for Orders
  const mergedOrders: CombinedOrder[] = (() => {
    const map = new Map<string, CombinedOrder>();

    // Put DB orders first
    dbOrders.forEach((o) => {
      map.set(o.id, {
        id: o.id,
        order_number: o.order_number,
        table_number: o.table_number,
        customer_name: o.customer_name || `Table ${o.table_number} Guest`,
        items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, note: i.note })),
        total: o.total,
        status: o.status,
        created_at: o.created_at,
      });
    });

    // Put Live store orders
    liveOrders.forEach((lo) => {
      const existingKey = Array.from(map.keys()).find((k) => k === lo.id || map.get(k)?.order_number === lo.id);
      if (!existingKey) {
        map.set(lo.id, {
          id: lo.id,
          order_number: lo.id,
          table_number: lo.table,
          customer_name: lo.customer || `Table ${lo.table} Guest`,
          items: lo.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, note: i.note })),
          total: lo.total,
          status: lo.status,
          created_at: lo.createdAt || new Date().toISOString(),
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })();

  // Combine DB & Live state for Services
  const mergedServices: CombinedService[] = (() => {
    const map = new Map<string, CombinedService>();

    dbServices.forEach((s) => {
      map.set(s.id, {
        id: s.id,
        table_number: s.table_number,
        service_type: s.service_type,
        label: s.label,
        status: s.status,
        created_at: s.created_at,
      });
    });

    liveServices.forEach((ls) => {
      if (!map.has(ls.id)) {
        map.set(ls.id, {
          id: ls.id,
          table_number: ls.table_number,
          service_type: ls.service_type,
          label: ls.label,
          status: ls.status,
          created_at: ls.created_at,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })();

  const pendingOrders = mergedOrders.filter((o) => o.status !== "served" && o.status !== "completed");
  const pendingServices = mergedServices.filter((s) => s.status !== "completed" && s.status !== "rejected");

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: "preparing" | "ready" | "served") => {
    liveOrderStore.updateOrderStatus(orderId, nextStatus);
    setDbOrders((prev) =>
      prev.map((o) => (o.id === orderId || o.order_number === orderId ? { ...o, status: nextStatus } : o))
    );

    if (isSupabaseConfigured()) {
      try {
        const cleanId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, "");
        if (cleanId) {
          await supabase
            .from("sd_orders")
            .update({ status: nextStatus })
            .or(`id.eq.${cleanId},order_id.eq.${cleanId}`);
        }
      } catch (err) {
        console.warn("Failed to update order status in Supabase:", err);
      }
    }
    toast.success(`Order ${orderId} updated to ${nextStatus.toUpperCase()}`);
  };

  const handleUpdateServiceStatus = async (serviceId: string, nextStatus: "accepted" | "rejected" | "completed" | "dispatched") => {
    liveOrderStore.updateServiceRequestStatus(serviceId, nextStatus);
    setDbServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, status: nextStatus } : s))
    );

    const targetService = mergedServices.find((s) => s.id === serviceId);

    if (isSupabaseConfigured()) {
      try {
        const dbStatus = nextStatus === "accepted" ? "Accepted" : nextStatus === "rejected" ? "Rejected" : nextStatus === "completed" ? "Completed" : nextStatus;
        await supabase
          .from("sd_notifications")
          .update({ status: dbStatus })
          .eq("id", serviceId);
      } catch (err) {
        console.warn("Failed to update service request status in Supabase notifications table:", err);
      }
    }

    if (targetService) {
      notifyCustomerServiceRequestStatus({
        id: serviceId,
        table_number: targetService.table_number,
        service_type: targetService.service_type,
        label: targetService.label,
        status: nextStatus,
      });
    }

    toast.success(`Service request updated to ${nextStatus.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <CustomerNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl gradient-primary grid place-items-center text-white shadow-float">
              <ChefHat className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold">Kitchen Display System (KDS)</h1>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Live Realtime
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time queue management for New Orders & Table Service Requests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mute/Unmute audio button */}
            <button
              onClick={toggleMute}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition border ${
                isMuted
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              }`}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {isMuted ? "Audio Muted" : "Audio Active"}
            </button>

            {/* Test Order Sound */}
            <button
              onClick={() => {
                soundManager.enableAudio();
                playOrderNotificationSound();
                toast.success("Testing Order Sound 🔔");
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-medium bg-card border hover:bg-muted"
              title="Test Order Sound"
            >
              <Play className="h-3.5 w-3.5 text-primary" /> Order Sound
            </button>

            {/* Test Service Sound */}
            <button
              onClick={() => {
                soundManager.enableAudio();
                playServiceNotificationSound();
                toast.info("Testing Service Sound 🔔");
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-medium bg-card border hover:bg-muted"
              title="Test Service Request Sound"
            >
              <Play className="h-3.5 w-3.5 text-accent" /> Service Sound
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Active Orders</div>
              <div className="font-display font-bold text-2xl text-primary">{pendingOrders.length}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Service Requests</div>
              <div className="font-display font-bold text-2xl text-amber-500">{pendingServices.length}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 grid place-items-center font-bold">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Orders</div>
              <div className="font-display font-bold text-2xl">{mergedOrders.length}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 grid place-items-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Sound Alert</div>
              <div className="font-display font-bold text-sm text-emerald-600 mt-1">
                {isMuted ? "Disabled" : "Order & Service Chimes"}
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 grid place-items-center font-bold">
              <Volume2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Queues Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "all"
                ? "gradient-primary text-white shadow-float"
                : "bg-card border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Queues ({pendingOrders.length + pendingServices.length})
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "orders"
                ? "gradient-primary text-white shadow-float"
                : "bg-card border text-muted-foreground hover:text-foreground"
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            New Orders Queue ({pendingOrders.length})
          </button>

          <button
            onClick={() => setActiveTab("services")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "services"
                ? "bg-amber-500 text-white shadow-float"
                : "bg-card border text-muted-foreground hover:text-foreground"
            }`}
          >
            <ConciergeBell className="h-3.5 w-3.5" />
            Service Requests Queue ({pendingServices.length})
          </button>

          <button
            onClick={() => setActiveTab("menu")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "menu"
                ? "gradient-primary text-white shadow-float"
                : "bg-card border text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Menu Management ({kitchenMenuItems.length})
          </button>
        </div>

        {/* Queues Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QUEUE 1: NEW ORDERS QUEUE */}
          {(activeTab === "all" || activeTab === "orders") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                  <h2 className="font-display text-xl font-bold">New Orders Queue</h2>
                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {pendingOrders.length} Pending
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Auto-updates via Supabase Realtime</span>
              </div>

              {mergedOrders.length === 0 ? (
                <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
                  <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <div className="font-semibold text-base">No orders yet</div>
                  <div className="text-xs mt-1">New customer orders will appear here automatically with sound alerts.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {mergedOrders.map((o) => {
                      const isPending = o.status === "pending";
                      const isPreparing = o.status === "preparing";
                      const isReady = o.status === "ready";
                      const isServed = o.status === "served" || o.status === "completed";

                      return (
                        <motion.div
                          key={o.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`glass rounded-3xl p-5 border transition-all ${
                            isPending
                              ? "border-primary/50 shadow-float bg-primary/5"
                              : isPreparing
                              ? "border-amber-500/50 bg-amber-500/5"
                              : isReady
                              ? "border-emerald-500/50 bg-emerald-500/5"
                              : "opacity-60"
                          }`}
                        >
                          {/* Order Card Header */}
                          <div className="flex items-start justify-between border-b border-border/50 pb-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-2xl gradient-primary text-white grid place-items-center font-display font-bold text-lg">
                                {o.table_number}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-display font-bold text-lg">Table {o.table_number}</span>
                                  <span className="text-xs text-muted-foreground">({o.order_number})</span>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <span className="flex items-center gap-1 font-medium text-foreground">
                                    <User className="h-3 w-3 text-primary" /> {o.customer_name}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                isPending
                                  ? "bg-primary text-white animate-pulse"
                                  : isPreparing
                                  ? "bg-amber-500 text-white"
                                  : isReady
                                  ? "bg-emerald-500 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {o.status}
                            </span>
                          </div>

                          {/* Ordered Items List */}
                          <div className="space-y-2 mb-4">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                              Ordered Items ({o.items.reduce((acc, i) => acc + i.qty, 0)})
                            </div>
                            {o.items.map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm glass rounded-xl px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="h-6 w-6 rounded-lg gradient-accent text-white font-bold text-xs grid place-items-center">
                                    {it.qty}x
                                  </span>
                                  <span className="font-semibold text-foreground">{it.name}</span>
                                  {it.note && (
                                    <span className="text-[11px] italic text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                                      Note: {it.note}
                                    </span>
                                  )}
                                </div>
                                {it.price && <span className="text-xs font-bold text-muted-foreground">₹{it.price * it.qty}</span>}
                              </div>
                            ))}
                          </div>

                          {/* Order Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <div className="text-xs text-muted-foreground">
                              Total: <span className="font-bold text-foreground">₹{o.total}</span>
                            </div>

                            <div className="flex gap-2">
                              {isPending && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(o.id, "preparing")}
                                  className="gradient-primary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 hover:opacity-90 transition"
                                >
                                  <Flame className="h-3.5 w-3.5" /> Start Preparing
                                </button>
                              )}

                              {isPreparing && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(o.id, "ready")}
                                  className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 hover:opacity-90 transition"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Ready
                                </button>
                              )}

                              {isReady && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(o.id, "served")}
                                  className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 hover:opacity-90 transition"
                                >
                                  <Check className="h-3.5 w-3.5" /> Mark Served
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* QUEUE 2: SERVICE REQUESTS QUEUE */}
          {(activeTab === "all" || activeTab === "services") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500 animate-ping" />
                  <h2 className="font-display text-xl font-bold">Service Requests Queue</h2>
                  <span className="bg-amber-500/10 text-amber-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {pendingServices.length} Active
                  </span>
                </div>
                <span className="text-xs text-amber-600 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                  Kitchen Only
                </span>
              </div>

              {mergedServices.length === 0 ? (
                <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
                  <ConciergeBell className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <div className="font-semibold text-base">No active service requests</div>
                  <div className="text-xs mt-1">Table requests like Water, Waiter, Bill will appear here with double chime.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {mergedServices.map((s) => {
                      const isPending = s.status === "pending";
                      const isAccepted = s.status === "accepted" || s.status === "dispatched";
                      const isRejected = s.status === "rejected";
                      const isCompleted = s.status === "completed";

                      return (
                        <motion.div
                          key={s.id}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`glass rounded-3xl p-5 border transition-all ${
                            isPending
                              ? "border-amber-500/60 shadow-float bg-amber-500/10"
                              : isAccepted
                              ? "border-blue-500/50 bg-blue-500/5"
                              : isRejected
                              ? "border-rose-500/40 bg-rose-500/5 opacity-75"
                              : "opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white grid place-items-center font-display font-bold text-lg">
                                {s.table_number}
                              </div>
                              <div>
                                <div className="font-display font-bold text-lg flex items-center gap-2">
                                  Table {s.table_number}
                                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                <div className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mt-0.5">
                                  <ConciergeBell className="h-4 w-4" /> Request: {s.label}
                                </div>
                              </div>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                isPending
                                  ? "bg-amber-500 text-white animate-bounce"
                                  : isAccepted
                                  ? "bg-blue-500 text-white animate-pulse"
                                  : isRejected
                                  ? "bg-rose-500 text-white"
                                  : "bg-emerald-500 text-white"
                              }`}
                            >
                              {isPending ? "Pending" : isAccepted ? "Accepted" : isRejected ? "Rejected" : "Completed"}
                            </span>
                          </div>

                          {/* Service Action Controls */}
                          <div className="flex items-center justify-between pt-3 border-t border-border/50">
                            <div className="text-xs text-muted-foreground">
                              Target: <span className="font-bold text-amber-600">Kitchen Display</span>
                            </div>

                            <div className="flex gap-2 flex-wrap justify-end">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleUpdateServiceStatus(s.id, "accepted")}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                                  </button>

                                  <button
                                    onClick={() => handleUpdateServiceStatus(s.id, "rejected")}
                                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition"
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                  </button>

                                  <button
                                    onClick={() => handleUpdateServiceStatus(s.id, "completed")}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition"
                                  >
                                    <Check className="h-3.5 w-3.5" /> Complete
                                  </button>
                                </>
                              )}

                              {isAccepted && (
                                <>
                                  <button
                                    onClick={() => handleUpdateServiceStatus(s.id, "completed")}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                                  </button>

                                  <button
                                    onClick={() => handleUpdateServiceStatus(s.id, "rejected")}
                                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition"
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>

        {/* QUEUE 3 / TAB: KITCHEN MENU MANAGEMENT */}
        {activeTab === "menu" && (
          <div className="space-y-6 mt-6">
            <div className="glass rounded-3xl p-6 border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-primary" /> Kitchen Menu & Stock Control
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage live dish availability and stock status for the customer ordering menu.
                </p>
              </div>
              <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 shrink-0">
                Kitchen Master Control
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="glass rounded-3xl p-6 border">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Filter By Category
              </div>
              <div className="flex flex-wrap gap-2">
                {["All", "Breakfast", "Lunch", "Dinner", "Starters", "Desserts", "Drinks"].map((cat) => {
                  const count = cat === "All" ? kitchenMenuItems.length : kitchenMenuItems.filter((i) => (i.category || "").toLowerCase() === cat.toLowerCase()).length;
                  const isSel = menuFilterCat === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setMenuFilterCat(cat)}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold border transition ${
                        isSel ? "gradient-primary text-white border-transparent shadow-sm" : "bg-card hover:bg-muted"
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Items Stock Toggle List */}
            <div className="glass rounded-3xl p-6 border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold">
                  Menu Items ({
                    menuFilterCat === "All"
                      ? kitchenMenuItems.length
                      : kitchenMenuItems.filter((i) => (i.category || "").toLowerCase() === menuFilterCat.toLowerCase()).length
                  })
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kitchenMenuItems
                  .filter((item) => menuFilterCat === "All" || (item.category || "").toLowerCase() === menuFilterCat.toLowerCase())
                  .map((item) => (
                    <div key={item.id} className="bg-card border rounded-2xl p-4 flex flex-col justify-between space-y-3">
                      <div className="flex gap-3 items-start">
                        {item.image && <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.category} · ₹{item.price}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${item.available ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"}`}>
                          {item.available ? "In Stock" : "Out of Stock"}
                        </span>

                        <button
                          onClick={() => {
                            setKitchenMenuItems((prev) =>
                              prev.map((i) => (i.id === item.id ? { ...i, available: !i.available } : i))
                            );
                            if (isSupabaseConfigured()) {
                              supabase
                                .from("sd_menu_items")
                                .update({ available: !item.available })
                                .eq("id", item.id)
                                .then(() => {});
                            }
                            toast.success(`${item.name} status updated to ${!item.available ? "IN STOCK" : "OUT OF STOCK"}`);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                            item.available
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                          }`}
                        >
                          {item.available ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          {item.available ? "Mark Out of Stock" : "Mark Available"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
