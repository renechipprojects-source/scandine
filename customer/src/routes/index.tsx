import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { QrCode, Sparkles, ArrowRight, MapPin, Clock, Star, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { restaurant } from "@/lib/mock-data";
import { useTable } from "@/lib/table-store";
import { useCustomer } from "@/lib/customer-store";
import { CustomerRegistration } from "@/components/customer-registration";
import { getOrdersBySession, subscribeToOrdersBySession, type DbOrder } from "@/lib/supabase";

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
    <div className="min-h-screen relative overflow-hidden text-[#172033] flex flex-col items-center">
      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Cover Section */}
        <div className="relative w-full h-[45vh] min-h-[260px] max-h-[360px] overflow-hidden flex flex-col justify-center items-center">
          <img src={restaurant.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/20 pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-[440px] md:max-w-xl mx-auto gap-2"
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-3.5 py-1 text-xs font-semibold text-white shadow-xs">
              <QrCode className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
              <span>Verified • {tableNumber}</span>
            </div>
            <div className="flex items-center justify-center my-0.5">
              <img src="/scandine-customer-logo.png" alt="ScanDine" className="h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-xl" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-lg leading-tight">
              Welcome, {customer.fullName}!
            </h1>
            <p className="text-white/90 text-xs sm:text-sm font-semibold drop-shadow">
              Modern kitchen • Fire-cooked
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs text-white/90 pt-1">
              <span className="flex items-center gap-1.5 glass rounded-full px-3 py-1 font-medium"><MapPin className="h-3.5 w-3.5 shrink-0" />{restaurant.branch}</span>
              <span className="flex items-center gap-1.5 glass rounded-full px-3 py-1 font-medium"><Clock className="h-3.5 w-3.5 shrink-0" />{restaurant.timings}</span>
              <span className="flex items-center gap-1.5 glass rounded-full px-3 py-1 font-medium"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />4.8 • 2.1k</span>
            </div>
          </motion.div>
        </div>

        <div className="w-full max-w-[440px] md:max-w-2xl mx-auto px-4 sm:px-5 -mt-8 relative z-20 pb-20 md:pb-12">
          {/* Quick start card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="shadow-xl rounded-[28px] p-5 sm:p-6 flex flex-col gap-5"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-widest text-[#475569] font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" /> Welcome {customer.fullName}
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#172033] leading-snug">
                  {tableNumber} is ready for you.
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] font-semibold leading-relaxed">
                  Browse the menu, customise dishes and pay — all from your phone.
                </p>
              </div>
              <Link
                to="/menu"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-white font-bold px-6 py-3.5 shadow-float shrink-0 transition-transform active:scale-[0.98]"
              >
                <span>Start ordering</span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Active Live Order Tracker Widget */}
            {activeOrder && (
              <div className="pt-4 border-t border-slate-300/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/5 rounded-2xl p-4 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl gradient-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Utensils className="h-5 w-5 animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider">Live Order Status ({tableNumber})</div>
                    <div className="font-extrabold text-xs sm:text-sm text-[#172033]">
                      Order {activeOrder.order_number} · <span className="capitalize text-emerald-600">{activeOrder.status}</span>
                    </div>
                  </div>
                </div>
                <Link
                  to="/track"
                  search={{ orderId: activeOrder.id }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline self-start sm:self-center"
                >
                  <span>View Details & Progress</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
