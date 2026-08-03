import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { StatusBadge } from "@/admin/components/layout/StatusBadge";
import { Card } from "@/admin/components/ui/card";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Progress } from "@/admin/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/admin/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/admin/components/ui/dialog";
import { Boxes, Plus, Search, AlertTriangle, Trash2 } from "lucide-react";
import { ingredients as mockIngredients } from "@/admin/lib/mock-data";
import { useState, useCallback } from "react";
import { useSupabaseTable, type Ingredient } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";

export const Route = createFileRoute("/admin/_app/inventory/ingredients")({
  head: () => ({ meta: [{ title: "Ingredients — ScanDine" }, { name: "description", content: "Ingredient inventory, stock levels and expiry tracking." }] }),
  component: IngredientsPage,
});

function IngredientsPage() {
  const { data: dbIngredients, addItem, deleteItem, fetchData } = useSupabaseTable<Ingredient>("ingredients");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // New Ingredient form
  const [ingredient, setIngredient] = useState("");
  const [supplier, setSupplier] = useState("");
  const [stock, setStock] = useState(10);
  const [level, setLevel] = useState("Normal");
  const [expiryStatus, setExpiryStatus] = useState("Fresh");

  const handleRealtime = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeTable("ingredients", handleRealtime);

  const ingredientsList = dbIngredients.length > 0
    ? dbIngredients
    : mockIngredients.map((m) => ({
        id: m.id,
        ingredient: m.name,
        supplier: m.supplier,
        stock: m.stock,
        level: m.stock < m.min ? "Low Stock" : "Normal",
        expiry_status: m.expiry,
      }));

  const lowStock = ingredientsList.filter((i) => i.stock < 10 || i.level === "Low Stock");

  const filtered = ingredientsList.filter((i) => {
    const q = searchQuery.toLowerCase();
    return (
      (i.ingredient && i.ingredient.toLowerCase().includes(q)) ||
      (i.supplier && i.supplier.toLowerCase().includes(q))
    );
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredient) return;
    try {
      await addItem({ ingredient, supplier, stock: Number(stock), level, expiry_status: expiryStatus });
      setIngredient("");
      setSupplier("");
      setStock(10);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to add ingredient:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
    } catch (err) {
      console.error("Failed to delete ingredient:", err);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ingredients"
        description={`${ingredientsList.length} SKUs tracked · ${lowStock.length} low-stock alerts`}
        icon={<Boxes className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm">Stock movement</Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />New ingredient</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Ingredient</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-3 mt-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Ingredient Name</label>
                    <Input required value={ingredient} onChange={(e) => setIngredient(e.target.value)} placeholder="Truffle Butter" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Supplier</label>
                    <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Napa Valley Dairy" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Stock Quantity</label>
                    <Input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className="mt-1" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit">Save Ingredient</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {lowStock.length > 0 && (
        <Card className="mb-5 border-warning/40 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-display font-semibold">Low stock alert</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{lowStock.map((l) => l.ingredient).join(", ")} are below reorder threshold.</div>
            </div>
            <Button size="sm" variant="outline">Create PO</Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ingredients…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="-mx-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Ingredient</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => {
                const pct = Math.min(100, (i.stock / 30) * 100);
                const isLow = i.stock < 10 || i.level === "Low Stock";
                return (
                  <TableRow key={i.id} className="hover:bg-muted/40">
                    <TableCell><div className="font-semibold">{i.ingredient}</div></TableCell>
                    <TableCell className="text-sm">{i.supplier}</TableCell>
                    <TableCell className="font-semibold">{i.stock} units</TableCell>
                    <TableCell className="w-40"><Progress value={pct} className="h-2" /></TableCell>
                    <TableCell className="text-xs">{i.expiry_status}</TableCell>
                    <TableCell><StatusBadge status={isLow ? "cleaning" : "available"} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(i.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
