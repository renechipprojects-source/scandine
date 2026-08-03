import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { Card } from "@/admin/components/ui/card";
import { Button } from "@/admin/components/ui/button";
import { Avatar, AvatarFallback } from "@/admin/components/ui/avatar";
import { Truck, Plus, Phone, Star } from "lucide-react";
import { suppliers as mockSuppliers } from "@/admin/lib/mock-data";
import { useSupabaseTable, type Supplier } from "@/hooks/useSupabaseData";

export const Route = createFileRoute("/admin/_app/inventory/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — ScanDine" }, { name: "description", content: "Supplier directory and relationships." }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { data: suppliersList } = useSupabaseTable<Supplier>("suppliers", mockSuppliers);

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description={`${suppliersList.length} trusted vendors supplying your kitchen`}
        icon={<Truck className="h-5 w-5" />}
        actions={<Button size="sm"><Plus className="mr-2 h-4 w-4" />New supplier</Button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {suppliersList.map((s: any) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 font-display font-bold text-primary">
                  {(s.name || "S").split(" ").map((w: string) => w[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-display font-bold">{s.name}</div>
                  <div className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                    <Star className="h-3 w-3 fill-current" />
                    {s.rating || 4.8}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{s.address || s.contact || "Main Warehouse"}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {s.phone}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
              <div>
                <div className="text-muted-foreground">Items supplied</div>
                <div className="mt-0.5 font-display text-lg font-bold">{s.sku_count || s.items || 12}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last order</div>
                <div className="mt-0.5 font-semibold">{s.lastOrder || "Today"}</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">Contact</Button>
              <Button size="sm" className="flex-1">Order</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
