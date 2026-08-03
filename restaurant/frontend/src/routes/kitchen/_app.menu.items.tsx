import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/kitchen/components/layout/PageHeader";
import { Card, CardContent } from "@/kitchen/components/ui/card";
import { Button } from "@/kitchen/components/ui/button";
import { Input } from "@/kitchen/components/ui/input";
import { Switch } from "@/kitchen/components/ui/switch";
import { Badge } from "@/kitchen/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kitchen/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kitchen/components/ui/table";
import { UtensilsCrossed, Plus, Search, Trash2, Clock, LayoutGrid, List } from "lucide-react";
import { foodItems as mockFoodItems, restaurantInfo } from "@/kitchen/lib/mock-data";
import { useState, useCallback } from "react";
import { useSupabaseTable, type MenuItem } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen/_app/menu/items")({
  head: () => ({ meta: [{ title: "Food Items — Kitchen" }, { name: "description", content: "Manage menu items availability." }] }),
  component: KitchenItemsPage,
});

const mapCategory = (cat?: string): string => {
  if (!cat) return "Lunch";
  if (["Breakfast", "Lunch", "Dinner", "Starters", "Desserts", "Drinks"].includes(cat)) return cat;
  if (cat === "Main Course" || cat === "Pizza" || cat === "Burgers" || cat === "Pasta") return "Lunch";
  if (cat === "Beverages") return "Drinks";
  return cat;
};

function KitchenItemsPage() {
  const { data: dbMenuItems, updateItem, deleteItem, fetchData } = useSupabaseTable<MenuItem>("sd_menu_items", []);

  const handleRealtime = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeTable("sd_menu_items", handleRealtime);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const itemsList = dbMenuItems;

  const filtered = itemsList.filter((f) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.category && f.category.toLowerCase().includes(q)) ||
      (f.status && f.status.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === "all" ||
      (f.category && f.category.toLowerCase() === selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const handleToggleAvailable = async (id: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    try {
      await updateItem(id, {
        available: nextVal,
        status: nextVal ? "Available" : "Unavailable",
      });
      toast.success(nextVal ? "Item marked as Available" : "Item marked as Unavailable");
    } catch (err) {
      console.error("Failed to update availability:", err);
      toast.error("Failed to update availability");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      toast.success("Food item deleted successfully");
    } catch (err) {
      console.error("Failed to delete menu item:", err);
      toast.error("Failed to delete food item");
    }
  };

  return (
    <div>
      <PageHeader
        title="Food items"
        description="Manage kitchen menu dishes, categories, and live availability."
        icon={<UtensilsCrossed className="h-5 w-5" />}
        actions={
          <Button asChild size="sm">
            <Link to="/kitchen/menu/add">
              <Plus className="mr-2 h-4 w-4" />
              Add new item
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search food items…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-[180px]">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Breakfast">Breakfast</SelectItem>
                <SelectItem value="Lunch">Lunch</SelectItem>
                <SelectItem value="Dinner">Dinner</SelectItem>
                <SelectItem value="Starters">Starters</SelectItem>
                <SelectItem value="Desserts">Desserts</SelectItem>
                <SelectItem value="Drinks">Drinks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/40">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4 mr-1" /> Table
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4 mr-1" /> Grid
          </Button>
        </div>
      </div>

      {viewMode === "table" ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Prep Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No menu items found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const itemStatus = item.status || (item.available ? "Available" : "Unavailable");
                  const itemCategory = item.category || "Lunch";
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="h-12 w-12 overflow-hidden rounded-md bg-muted">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No img</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{item.name}</div>
                        {item.description && (
                          <div className="line-clamp-1 text-xs text-muted-foreground">{item.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal capitalize">
                          {itemCategory}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {restaurantInfo.currency}{item.price}
                      </TableCell>
                      <TableCell>
                        {item.preparation_time ? (
                          <span className="flex items-center text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            {item.preparation_time}m
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.available ? "default" : "secondary"}>
                          {itemStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={item.available}
                            onCheckedChange={() => handleToggleAvailable(item.id, item.available)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const itemStatus = item.status || (item.available ? "Available" : "Unavailable");
            const itemCategory = item.category || "Lunch";
            return (
              <Card key={item.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative h-40 w-full overflow-hidden bg-muted">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
                  )}
                  <div className="absolute left-2 top-2">
                    <Badge variant="outline" className="bg-background/90 backdrop-blur font-normal">
                      {itemCategory}
                    </Badge>
                  </div>
                  <div className="absolute right-2 top-2">
                    <Badge variant={item.available ? "default" : "secondary"}>
                      {itemStatus}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-primary">{restaurantInfo.currency}{item.price}</span>
                    {item.preparation_time && (
                      <span className="flex items-center text-xs text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        {item.preparation_time}m
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.available}
                        onCheckedChange={() => handleToggleAvailable(item.id, item.available)}
                      />
                      <span className="text-xs text-muted-foreground">{itemStatus}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
