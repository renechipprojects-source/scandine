import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { QrCode, Sparkles, ArrowRight, MapPin, Clock, Star, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { restaurant } from "@/lib/mock-data";
import { useTable } from "@/lib/table-store";
import { useCustomer } from "@/lib/customer-store";
import { CustomerRegistration } from "@/components/customer-registration";
import { getOrdersBySession, subscribeToOrdersBySession, type DbOrder } from "@/lib/supabase";
import diningBgImage from "@/assets/customer-dining-bg.jpg";

export const Route = createFileRoute("/")({
  component: Welcome,
  head: () => ({
    meta: [
      { title: "Welcome · ScanDine" },
      { name: "description", content: "Scan the QR at your table and dive into a premium ordering experience with ScanDine." },
    ],
  }),
});

function Welcome() {
  const tableNumber = useTable();
  const customer = useCustomer(tableNumber);
  const navigate = useNavigate();
  const [activeOrder, setActiveOrder] = useState<DbOrder | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};

    async function loadActiveOrder() {
      if (!customer?.sessionId) {
        setActiveOrder(null);
        return;
      }
      const myOrders = await getOrdersBySession(customer.sessionId);
      if (myOrders && myOrders.length > 0) {
        const latest = myOrders.find(
          (o) => o.status !== "completed" && o.status !== "served" && o.status !== "cancelled"
        ) || null;
        setActiveOrder(latest);
      } else {
        setActiveOrder(null);
      }

      unsubscribe = subscribeToOrdersBySession(customer.sessionId, (updated) => {
        if (updated.status === "completed" || updated.status === "served" || updated.status === "cancelled") {
          setActiveOrder(null);
        } else {
          setActiveOrder(updated);
        }
      });
    }

    loadActiveOrder();
    return () => unsubscribe();
  }, [customer?.sessionId]);

  // If customer details are not saved for the active table, show Customer Registration Page first
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

  return (
    <div className="min-h-screen relative overflow-hidden text-[#172033]">
      {/* Full-screen Restaurant Background Layer */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden"
        style={{
          zIndex: 0,
          backgroundImage: `url(${diningBgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <img
          src={diningBgImage}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/customer-dining-bg.jpg";
          }}
          alt="ScanDine Restaurant Atmosphere"
          className="w-full h-full object-cover object-center brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-amber-950/20 to-black/40 pointer-events-none" />
      </div>

      <div className="relative z-10">
        {/* Cover */}
        <div className="relative h-[48vh] md:h-[56vh] overflow-hidden">
          <img src={restaurant.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/20" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pt-4 pb-8"
          >
            <div className="glass rounded-full px-4 py-1.5 text-xs font-medium flex items-center gap-2 mb-4 text-white">
              <QrCode className="h-3.5 w-3.5 text-primary" /> Verified • {tableNumber}
            </div>
            <div className="flex justify-center mb-3">
              <img src="/scandine-customer-logo.png" alt="ScanDine" className="h-20 w-20 md:h-24 md:w-24 object-contain drop-shadow-xl" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-lg mb-1">
              Welcome, {customer.fullName}!
            </h1>
            <p className="text-white/90 text-sm md:text-base font-medium drop-shadow mb-4">
              Modern kitchen • Fire-cooked
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs text-white/90">
              <span className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5"><MapPin className="h-3.5 w-3.5" />{restaurant.branch}</span>
              <span className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5"><Clock className="h-3.5 w-3.5" />{restaurant.timings}</span>
              <span className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />4.8 • 2.1k</span>
            </div>
          </motion.div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-14 relative pb-32 md:pb-16">
          {/* Quick start card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="shadow-xl rounded-3xl p-6 md:p-8"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.72)",
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#475569] font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Welcome {customer.fullName}
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-extrabold mt-1 text-[#172033]">
                  {tableNumber} is ready for you.
                </h2>
                <p className="text-sm text-[#475569] font-semibold mt-1">
                  Browse the menu, customise dishes and pay — all from your phone.
                </p>
              </div>
              <Link
                to="/menu"
                className="group inline-flex items-center gap-2 rounded-full gradient-primary text-white font-semibold px-6 py-4 shadow-float"
              >
                Start ordering
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Active Live Order Tracker Widget */}
            {activeOrder && (
              <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/5 rounded-2xl p-4 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl gradient-primary text-white grid place-items-center shrink-0">
                    <Utensils className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-primary uppercase tracking-wider">Live Order Status ({tableNumber})</div>
                    <div className="font-bold text-sm text-[#172033]">
                      Order {activeOrder.order_number} · <span className="capitalize text-emerald-600">{activeOrder.status}</span>
                    </div>
                  </div>
                </div>
                <Link
                  to="/track"
                  search={{ orderId: activeOrder.id }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  View Details & Stage Progress <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
