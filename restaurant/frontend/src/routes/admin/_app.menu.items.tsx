import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { StatusBadge } from "@/admin/components/layout/StatusBadge";
import { Card } from "@/admin/components/ui/card";
import { Input } from "@/admin/components/ui/input";
import { Salad, Search, Timer } from "lucide-react";
import { restaurantInfo } from "@/admin/lib/mock-data";
import { useState, useCallback } from "react";
import { useSupabaseTable, type MenuItem } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";

export const Route = createFileRoute("/admin/_app/menu/items")({
  head: () => ({ meta: [{ title: "Food Items — ScanDine" }, { name: "description", content: "View every dish on your menu." }] }),
  component: ItemsPage,
});

function ItemsPage() {
  const { data: dbMenuItems, fetchData } = useSupabaseTable<MenuItem>("sd_menu_items", []);

  const handleRealtime = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeTable("sd_menu_items", handleRealtime);

  const [searchQuery, setSearchQuery] = useState("");
  const itemsList = dbMenuItems;

  const filtered = itemsList.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <PageHeader
        title="All food items"
        description={`${itemsList.length} dishes available on your menu (Read-only)`}
        icon={<Salad className="h-5 w-5" />}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search dishes…"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((f) => (
          <Card key={f.id} className="group overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-orange-100 via-amber-50 to-red-100 text-7xl overflow-hidden">
              <img src={f.image || f.image_url} alt={f.name} className="w-full h-full object-cover" />
              {!f.available && (
                <div className="absolute inset-0 grid place-items-center bg-black/50 text-white">
                  <StatusBadge status="expired" />
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-display text-base font-bold">{f.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-bold text-primary">
                    {restaurantInfo.currency}{Number(f.price).toFixed(2)}
                  </div>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{f.description}</p>
              <div className="mt-3 flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {f.preparation_time || 15}m
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  f.available ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                }`}>
                  {f.available ? "Available" : "Unavailable"}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
