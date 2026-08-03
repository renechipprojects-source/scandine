import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { CustomerNav } from "@/components/customer-nav";
import { FoodCard } from "@/components/food-card";
import { foods as mockFoods, categories, combos, type FoodItem } from "@/lib/mock-data";
import { fetchDbMenuItems, subscribeToMenuItems } from "@/lib/supabase";
import { useLiveOrders } from "@/lib/live-order-store";
import { tableStore, useTable } from "@/lib/table-store";
import { useCustomer } from "@/lib/customer-store";
import { CustomerRegistration } from "@/components/customer-registration";
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
  if (str.includes("breakfast")) return "Breakfast";
  if (str.includes("lunch")) return "Lunch";
  if (str.includes("dinner")) return "Dinner";
  if (str.includes("starter") || str.includes("appetizer")) return "Starters";
  if (str.includes("dessert") || str.includes("sweet")) return "Desserts";
  if (str.includes("drink") || str.includes("beverage")) return "Drinks";

  return "Dinner";
}

function Menu() {
  const [cat, setCat] = useState("Breakfast");
  const [q, setQ] = useState("");
  const [itemList, setItemList] = useState<FoodItem[]>([]);

  const tableNumber = useTable();
  const customer = useCustomer(tableNumber);
  const allLiveOrders = useLiveOrders();

  const activeTableOrders = useMemo(() => {
    const normDigits = tableNumber.replace(/\D/g, "");
    const normStr = tableNumber.toLowerCase().replace(/\s+/g, "");
    return allLiveOrders.filter((o) => {
      const oDigits = o.table.replace(/\D/g, "");
      const oStr = o.table.toLowerCase().replace(/\s+/g, "");
      const isTableMatch = normDigits && oDigits ? normDigits === oDigits : normStr === oStr;
      return isTableMatch && o.status !== "completed";
    });
  }, [allLiveOrders, tableNumber]);

  useEffect(() => {
    async function loadMenu() {
      const dbItems = await fetchDbMenuItems();
      if (dbItems) {
        const mapped: FoodItem[] = dbItems.map((item: any) => {
          const normCat = normalizeCategory(item.category || item.category_name, item.category_id);
          const catId = item.category_id || CATEGORY_TO_ID[normCat];
          return {
            id: item.id,
            name: item.name,
            description: item.description || "Freshly prepared by our chef.",
            price: Number(item.price),
            image: item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
            category: normCat,
            category_id: catId,
            rating: item.rating || 4.8,
            reviews: item.reviews || 120,
            veg: item.veg ?? true,
            prepTime: item.prep_time || item.prepTime || 15,
            calories: item.calories || 350,
            spiceLevel: item.spiceLevel || 1,
            available: item.available ?? true,
            ingredients: item.ingredients || ["Fresh Produce", "Herbs", "Olive Oil"],
          };
        });

        setItemList(mapped);
      }
    }

    loadMenu();
    const unsubscribe = subscribeToMenuItems(() => loadMenu());
    return () => unsubscribe();
  }, []);

  const list = useMemo(() => {
    const selectedCategoryId = CATEGORY_TO_ID[cat];

    return itemList.filter((f) => {
      const itemCategoryId = f.category_id || CATEGORY_TO_ID[f.category];

      if (itemCategoryId !== selectedCategoryId) return false;
      if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [cat, q, itemList]);

  // If customer is not registered for this scanned table, show Customer Registration Page first
  if (!customer) {
    return (
      <CustomerRegistration
        tableNumber={tableNumber}
        onSuccess={() => {
          // Registration complete, state update triggers re-render of menu
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <CustomerNav />

      {/* Sticky Search Header Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 md:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dishes…"
              className="pl-9 rounded-full bg-card border h-10 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Sticky Horizontal Category Bar */}
      <div className="sticky top-[57px] z-20 bg-background/95 backdrop-blur border-b px-4 md:px-8 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar gap-2">
          {MENU_CATEGORIES.map((c) => {
            const active = cat.toLowerCase() === c.id.toLowerCase();
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`relative shrink-0 rounded-2xl border px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-all ${
                  active ? "text-white border-transparent shadow-md" : "bg-card text-foreground hover:bg-muted"
                }`}
              >
                {active && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-2xl gradient-primary" />}
                <span className="relative text-base">{c.icon}</span>
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
              <Link to="/track" className="text-xs font-semibold text-primary flex items-center hover:underline">
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
                        <div className="font-display text-base font-bold mt-0.5">{ord.table}</div>
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
  );
}
