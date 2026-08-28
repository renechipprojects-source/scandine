import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { CustomerNav } from "@/components/customer-nav";
import { FoodCard } from "@/components/food-card";
import { categories, combos, type FoodItem } from "@/lib/mock-data";
import { fetchDbMenuItems, getCategoryDisplayName, getOrdersBySession, subscribeToOrdersBySession, subscribeToMenuItems, type DbOrder } from "@/lib/supabase";
import { tableStore, useTable } from "@/lib/table-store";
import { useCustomer } from "@/lib/customer-store";
import { CustomerRegistration } from "@/components/customer-registration";
import { InvalidQrScreen } from "@/components/invalid-qr";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/menu")({
  component: Menu,
  head: () => ({ meta: [{ title: "Menu · ScanDine" }] }),
});

const statusProgress: Record<string, number> = {
  pending: 25,
  preparing: 55,
  ready: 85,
  served: 100,
  completed: 100,
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Received by Kitchen", color: "bg-amber-500/20 text-amber-600" },
  preparing: { label: "Chef is Cooking 🍳", color: "bg-blue-500/20 text-blue-600 animate-pulse" },
  ready: { label: "Ready to Serve 🍽️", color: "bg-purple-500/20 text-purple-600" },
  served: { label: "Served to Table ✨", color: "bg-emerald-500/20 text-emerald-600" },
  completed: { label: "Order Completed", color: "bg-emerald-500/20 text-emerald-600" },
};

const MENU_CATEGORIES = [
  { id: "Breakfast", label: "Breakfast", icon: "🥐" },
  { id: "Lunch", label: "Lunch", icon: "🍕" },
  { id: "Dinner", label: "Dinner", icon: "🍝" },
  { id: "Starters", label: "Starters", icon: "🥗" },
  { id: "Desserts", label: "Desserts", icon: "🍰" },
  { id: "Drinks", label: "Drinks", icon: "🍹" },
];

const CATEGORY_TO_ID: Record<string, string> = {
  Breakfast: "cat_1",
  Lunch: "cat_2",
  Dinner: "cat_3",
  Starters: "cat_4",
  Desserts: "cat_5",
  Drinks: "cat_6",
};

const ID_TO_CATEGORY: Record<string, "Breakfast" | "Lunch" | "Dinner" | "Starters" | "Desserts" | "Drinks"> = {
  cat_1: "Breakfast",
  cat_2: "Lunch",
  cat_3: "Dinner",
  cat_4: "Starters",
  cat_5: "Desserts",
  cat_6: "Drinks",
};

function normalizeCategory(catStr?: string, catId?: string): "Breakfast" | "Lunch" | "Dinner" | "Starters" | "Desserts" | "Drinks" {
  const id = (catId || "").toLowerCase();
  if (id && ID_TO_CATEGORY[id]) {
    return ID_TO_CATEGORY[id];
  }

  const str = (catStr || "").toLowerCase();
  if (str.includes("breakfast") || str.includes("morning")) return "Breakfast";
  if (str.includes("lunch") || str.includes("main course") || str.includes("pizza") || str.includes("burger") || str.includes("pasta")) return "Lunch";
  if (str.includes("dinner") || str.includes("supper") || str.includes("night")) return "Dinner";
  if (str.includes("starter") || str.includes("appetizer") || str.includes("snack") || str.includes("side")) return "Starters";
  if (str.includes("dessert") || str.includes("sweet") || str.includes("cake") || str.includes("ice cream")) return "Desserts";
  if (str.includes("drink") || str.includes("beverage") || str.includes("juice") || str.includes("coffee") || str.includes("tea")) return "Drinks";

  return "Lunch";
}

function Menu() {
  const navigate = useNavigate();
  const [cat, setCat] = useState("Breakfast");
  const [q, setQ] = useState("");
  const [itemList, setItemList] = useState<FoodItem[]>([]);
  const [sessionOrders, setSessionOrders] = useState<DbOrder[]>([]);

  const tableNumber = useTable();
  const customer = useCustomer(tableNumber);

  useEffect(() => {
    let unsubscribe = () => {};
    async function loadSessionOrders() {
      if (!customer?.sessionId) return;
      const data = await getOrdersBySession(customer.sessionId);
      setSessionOrders(data);

      unsubscribe = subscribeToOrdersBySession(customer.sessionId, (updated) => {
        setSessionOrders((prev) => {
          const exists = prev.some((o) => o.id === updated.id);
          if (exists) return prev.map((o) => (o.id === updated.id ? updated : o));
          return [updated, ...prev];
        });
      });
    }
    loadSessionOrders();
    return () => unsubscribe();
  }, [customer?.sessionId]);

  const activeTableOrders = useMemo(() => {
    return sessionOrders.filter(
      (o) => o.status !== "completed" && o.status !== "served" && o.status !== "cancelled"
    );
  }, [sessionOrders]);

  useEffect(() => {
    async function loadMenu(force = false) {
      const dbItems = await fetchDbMenuItems(force);
      const itemsToMap = dbItems || [];

      const availableDbItems = itemsToMap.filter(
        (item: any) => item.available !== false && item.status !== "Unavailable"
      );

      const mapped: FoodItem[] = availableDbItems.map((item: any) => {
        const normCat = (getCategoryDisplayName(item) || "Lunch") as any;
        const catId = item.category_id || CATEGORY_TO_ID[normCat] || "cat_2";
        const rawImg = item.image || item.image_url || item.photo || item.imageUrl || item.img || "";
        return {
          id: String(item.id),
          name: item.name,
          description: item.description || "Freshly prepared by our chef.",
          price: Number(item.price),
          image: rawImg,
          category: normCat,
          category_id: catId,
          rating: item.rating || 4.8,
          reviews: item.reviews || 120,
          veg: item.veg ?? true,
          prepTime: item.prep_time || item.preparation_time || item.prepTime || 15,
          calories: item.calories || 350,
          spiceLevel: item.spiceLevel || 1,
          available: true,
          ingredients: item.ingredients || ["Fresh Produce", "Herbs", "Olive Oil"],
        };
      });

      setItemList(mapped);
    }

    loadMenu(true);

    const unsubscribe = subscribeToMenuItems(() => loadMenu(true));

    const handleLocalSync = () => {
      loadMenu(true);
    };

    window.addEventListener("local-table-updated", handleLocalSync);
    window.addEventListener("storage", handleLocalSync);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("aura_dine_sync_channel");
        bc.onmessage = (msg) => {
          if (msg.data?.type === "MENU_UPDATED" || msg.data?.tableName === "sd_menu_items") {
            loadMenu(true);
          }
        };
      }
    } catch {}

    return () => {
      unsubscribe();
      window.removeEventListener("local-table-updated", handleLocalSync);
      window.removeEventListener("storage", handleLocalSync);
      if (bc) bc.close();
    };
  }, []);

  const list = useMemo(() => {
    const selectedCategoryId = CATEGORY_TO_ID[cat];

    return itemList.filter((f) => {
      const itemCategoryId = f.category_id || CATEGORY_TO_ID[f.category];

      const matchesCat = f.category === cat || itemCategoryId === selectedCategoryId;
      if (!matchesCat) return false;
      if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [cat, q, itemList]);

  return (
    <>
      <Outlet />
      {!customer ? (
        <CustomerRegistration
          tableNumber={tableNumber}
          onSuccess={() => {
            navigate({ to: "/", replace: true });
          }}
        />
      ) : (
        <div className="min-h-screen bg-background pb-32">
      <CustomerNav />

      {/* Sticky Search Header Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-3.5 sm:px-4 md:px-8 py-2.5 sm:py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="menu-search-input"
              name="menuSearch"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dishes…"
              aria-label="Search dishes"
              className="pl-9 rounded-full bg-card border h-10 text-xs sm:text-sm min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Sticky Horizontal Category Bar */}
      <div className="sticky top-[53px] sm:top-[57px] z-20 bg-background/95 backdrop-blur border-b px-3.5 sm:px-4 md:px-8 py-2 sm:py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar gap-1.5 sm:gap-2">
          {MENU_CATEGORIES.map((c) => {
            const active = cat.toLowerCase() === c.id.toLowerCase();
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`relative shrink-0 rounded-2xl border px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-all min-h-[40px] ${
                  active ? "text-white border-transparent shadow-md" : "bg-card text-foreground hover:bg-muted"
                }`}
              >
                {active && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-2xl gradient-primary" />}
                <span className="relative text-sm sm:text-base">{c.icon}</span>
                <span className="relative">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-7xl mx-auto pt-6">
        {/* Live Active Table Orders Banner */}
        {activeTableOrders.length > 0 && (
          <div className="mb-8 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <Flame className="h-5 w-5 text-primary animate-pulse" /> Live Orders for {tableNumber} ({activeTableOrders.length})
              </div>
              <Link to="/track" search={{ orderId: "" }} className="text-xs font-semibold text-primary flex items-center hover:underline">
                View Tracking <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {activeTableOrders.map((ord) => {
                const info = statusLabels[ord.status] || { label: ord.status, color: "bg-muted text-foreground" };
                const pct = statusProgress[ord.status] || 25;

                return (
                  <motion.div
                    key={ord.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl p-5 border bg-card/90 backdrop-blur shadow-float"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{ord.id}</div>
                        <div className="font-display text-base font-bold mt-0.5">{(ord as any).table || ord.table_number}</div>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${info.color}`}>
                        {info.label}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground line-clamp-1">
                      {ord.items.map((it) => `${it.qty}× ${it.name}`).join(", ")}
                    </div>

                    {/* Live Progress Bar */}
                    <div className="mt-3">
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full gradient-primary transition-all duration-500 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Header & Item Grid */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <span>{MENU_CATEGORIES.find((c) => c.id.toLowerCase() === cat.toLowerCase())?.icon}</span>
            <span>{cat}</span>
            <span className="text-sm font-normal text-muted-foreground">({list.length} items)</span>
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((f) => (
            <FoodCard key={f.id} food={f} />
          ))}
        </div>
        {list.length === 0 && (
          <div className="text-center py-16 bg-card/50 rounded-3xl border border-dashed mt-2">
            <div className="text-6xl mb-2">🍽️</div>
            <div className="font-semibold text-lg">No {cat} items found</div>
            <div className="text-xs text-muted-foreground mt-1">Try clearing filters or search query.</div>
          </div>
        )}
      </div>
    </div>
      )}
    </>
  );
}

