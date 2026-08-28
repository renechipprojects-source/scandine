import { Link, useRouterState } from "@tanstack/react-router";
import { Home, UtensilsCrossed, ShoppingBag, User, Bell, ConciergeBell, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-store";
import { useTable, tableStore } from "@/lib/table-store";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/menu", icon: UtensilsCrossed, label: "Menu" },
  { to: "/services", icon: ConciergeBell, label: "Serve" },
  { to: "/notifications", icon: Bell, label: "Alerts" },
  { to: "/profile", icon: User, label: "Me" },
] as const;

export function CustomerNav() {
  const [mounted, setMounted] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const state = useCart();
  const tableNumber = useTable();
  const count = state.items.reduce((s, i) => s + i.qty, 0);

  useEffect(() => {
    setMounted(true);
    tableStore.initFromUrl();
  }, []);

  return (
    <>
      {/* Top Mobile Bar with Table Badge */}
      <div className="md:hidden sticky top-0 z-40 glass border-b px-4 py-2 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/scandine-customer-logo.png" alt="ScanDine" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-bold tracking-tight">
            <span className="text-[#111827] dark:text-white">Scan</span>
            <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-red-600 bg-clip-text text-transparent">Dine</span>
          </span>
        </Link>
        <div className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
          <MapPin className="h-3 w-3 text-primary animate-pulse" />
          <span>{mounted ? tableNumber : ""}</span>
        </div>
      </div>

      {/* Bottom mobile bar */}
      <nav className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 max-w-[calc(100vw-16px)] md:hidden">
        <div className="glass shadow-glass rounded-full px-1.5 py-1.5 flex items-center gap-0.5 sm:gap-1">
          {tabs.map((t) => {
            const active = path === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="relative flex flex-col items-center justify-center rounded-full px-2 sm:px-3 py-1.5 text-[9px] sm:text-[10px] font-medium min-h-[44px] min-w-[44px]"
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-full gradient-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <t.icon className={`relative h-4 w-4 sm:h-4.5 sm:w-4.5 ${active ? "text-white" : "text-foreground"}`} />
                <span className={`relative ${active ? "text-white" : "text-muted-foreground"}`}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating cart pill */}
      {count > 0 && (
        <Link
          to="/cart"
          className="fixed bottom-20 right-3 z-50 md:bottom-6 md:right-6 flex items-center gap-2 rounded-full gradient-primary text-white px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-float animate-pulse-glow max-w-[calc(100vw-24px)] min-h-[44px]"
        >
          <ShoppingBag className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm font-semibold">{count} in cart</span>
        </Link>
      )}

      {/* Top desktop bar */}
      <header className="hidden md:flex sticky top-0 z-40 items-center justify-between px-8 py-3 glass border-b">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/scandine-customer-logo.png" alt="ScanDine" className="h-10 w-10 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-[#111827] dark:text-white">Scan</span>
            <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-red-600 bg-clip-text text-transparent">Dine</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {tabs.map((t) => {
            const active = path === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`relative rounded-full px-4 py-2 text-sm font-medium ${active ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                {active && (
                  <motion.span layoutId="tab-pill-desktop" className="absolute inset-0 rounded-full gradient-primary" />
                )}
                <span className="relative">{t.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
            <MapPin className="h-3.5 w-3.5" />
            <span>{tableNumber}</span>
          </div>
        </div>
      </header>
    </>
  );
}

