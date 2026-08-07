import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/kitchen/components/layout/PageHeader";
import { Card, CardContent } from "@/kitchen/components/ui/card";
import { Button } from "@/kitchen/components/ui/button";
import { Input } from "@/kitchen/components/ui/input";
import { Switch } from "@/kitchen/components/ui/switch";
import { Badge } from "@/kitchen/components/ui/badge";
import { Textarea } from "@/kitchen/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kitchen/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kitchen/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/kitchen/components/ui/dialog";
import { UtensilsCrossed, Plus, Search, Trash2, Clock, LayoutGrid, List, Loader2, Image as ImageIcon, Upload, X } from "lucide-react";
import { restaurantInfo } from "@/kitchen/lib/mock-data";
import { useState, useCallback } from "react";
import { useSupabaseTable, type MenuItem } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen/_app/menu/items")({
  head: () => ({ meta: [{ title: "Food Items — Kitchen" }, { name: "description", content: "Manage kitchen menu dishes, categories, and live availability." }] }),
  component: KitchenItemsPage,
});

const mapCategory = (cat?: string): string => {
  if (!cat) return "Lunch";
  if (["Breakfast", "Lunch", "Dinner", "Starters", "Desserts", "Drinks"].includes(cat)) return cat;
  if (cat === "Main Course" || cat === "Pizza" || cat === "Burgers" || cat === "Pasta") return "Lunch";
  if (cat === "Beverages") return "Drinks";
  return cat;
};

const initialMenuItemsList: MenuItem[] = [];

function KitchenItemsPage() {
  const { data: dbMenuItems, addItem, updateItem, deleteItem, fetchData } = useSupabaseTable<MenuItem>("sd_menu_items", []);

  const handleRealtime = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeTable("sd_menu_items", handleRealtime);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Popup Modal Add Item Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Lunch");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [available, setAvailable] = useState(true);
  const [prepTime, setPrepTime] = useState("15");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; category?: string; price?: string; description?: string; image?: string }>({});

  const resetForm = () => {
    setName("");
    setCategory("Lunch");
    setPrice("");
    setDescription("");
    setImageUrl("");
    setSelectedFile(null);
    setAvailable(true);
    setPrepTime("15");
    setErrors({});
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (errors.image) setErrors((prev) => ({ ...prev, image: undefined }));

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      if (url && !url.startsWith("blob:") && !url.startsWith("file:")) {
        setImageUrl(url);
        toast.success("Image uploaded successfully!");
      } else {
        throw new Error("Upload did not return a valid public image URL.");
      }
    } catch (err: any) {
      console.error("Image upload error:", err);
      toast.error(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFoodItem = async (e: React.FormEvent) => {
    e.preventDefault();

    // Required Field Validation
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "Food Name is required";
    if (!category.trim()) newErrors.category = "Category is required";
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) newErrors.price = "Valid Price is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!imageUrl.trim() && !selectedFile) newErrors.image = "Image is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields accurately.");
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      let finalImgUrl = imageUrl.trim();
      if (selectedFile) {
        if (!finalImgUrl || finalImgUrl.startsWith("blob:") || finalImgUrl.startsWith("file:")) {
          try {
            const uploaded = await uploadToCloudinary(selectedFile);
            if (uploaded && !uploaded.startsWith("blob:") && !uploaded.startsWith("file:")) {
              finalImgUrl = uploaded;
            } else {
              throw new Error("Invalid URL returned after upload.");
            }
          } catch (uploadErr: any) {
            toast.error(`Image upload failed: ${uploadErr.message || "Could not upload image"}`);
            setSubmitting(false);
            return;
          }
        }
      }

      if (finalImgUrl.startsWith("blob:") || finalImgUrl.startsWith("file:")) {
        toast.error("Invalid image path detected. Please re-upload the image.");
        setSubmitting(false);
        return;
      }

      const CATEGORY_MAP: Record<string, string> = {
        Breakfast: "cat_1",
        Lunch: "cat_2",
        Dinner: "cat_3",
        Starters: "cat_4",
        Desserts: "cat_5",
        Drinks: "cat_6",
      };
      const categoryId = CATEGORY_MAP[category] || "cat_2";

      const newItem: Partial<MenuItem> = {
        name: name.trim(),
        category: category,
        category_name: category,
        category_id: categoryId,
        price: Number(price),
        description: description.trim(),
        image: finalImgUrl || "",
        image_url: finalImgUrl || "",
        available: available,
        status: available ? "Available" : "Unavailable",
        preparation_time: parseInt(prepTime, 10) || 15,
        prep_time_minutes: parseInt(prepTime, 10) || 15,
      };

      await addItem(newItem);
      toast.success(`Food item "${name.trim()}" added to menu! 🍽️`);

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("aura_dine_sync_channel");
          bc.postMessage({ type: "MENU_UPDATED" });
        }
      } catch {}

      resetForm();
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error("Failed to create food item:", err);
      toast.error(err.message || "Failed to add food item to menu.");
    } finally {
      setSubmitting(false);
    }
  };

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
    const itemToUpdate = dbMenuItems.find((item) => item.id === id);
    try {
      await updateItem(id, {
        available: nextVal,
        status: nextVal ? "Available" : "Unavailable",
        category: itemToUpdate?.category,
        category_name: itemToUpdate?.category_name || itemToUpdate?.category,
        category_id: itemToUpdate?.category_id,
      });
      toast.success(nextVal ? "Item marked as Available" : "Item marked as Unavailable");

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("aura_dine_sync_channel");
          bc.postMessage({ type: "MENU_UPDATED" });
        }
      } catch {}
    } catch (err) {
      console.error("Failed to update availability:", err);
      toast.error("Failed to update availability");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const itemToDelete = dbMenuItems.find((item) => item.id === id);
      const imgUrl = itemToDelete?.image || (itemToDelete as any)?.image_url;

      await deleteItem(id);

      if (imgUrl && (imgUrl.includes("cloudinary.com") || imgUrl.includes("res.cloudinary"))) {
        deleteFromCloudinary(imgUrl).catch((err) => {
          console.warn("Cloudinary image delete notice:", err);
        });
      }

      toast.success("Food item and associated image deleted successfully 🗑️");
    } catch (err) {
      console.error("Failed to delete menu item:", err);
      toast.error("Failed to delete food item");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Food items"
        icon={<UtensilsCrossed className="h-5 w-5" />}
        actions={
          <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add new item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto pr-2 sm:pr-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <UtensilsCrossed className="h-5 w-5 text-primary" /> Add New Food Item
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateFoodItem} className="space-y-4 mt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Food Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder="e.g. Truffle Mushroom Pasta"
                    className={`mt-1 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {errors.name && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                    <Select value={category} onValueChange={(val) => {
                      setCategory(val);
                      if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
                    }}>
                      <SelectTrigger className={`mt-1 ${errors.category ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Breakfast">Breakfast</SelectItem>
                        <SelectItem value="Lunch">Lunch</SelectItem>
                        <SelectItem value="Dinner">Dinner</SelectItem>
                        <SelectItem value="Starters">Starters</SelectItem>
                        <SelectItem value="Desserts">Desserts</SelectItem>
                        <SelectItem value="Drinks">Drinks</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.category}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Price (₹) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
                      }}
                      placeholder="e.g. 450"
                      className={`mt-1 ${errors.price ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {errors.price && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.price}</p>}
                  </div>
                </div>

                {/* Image Upload & Uniform Aspect Ratio Preview Section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Food Image *</label>
                  <div className="flex gap-2">
                    <Input
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        if (errors.image) setErrors((prev) => ({ ...prev, image: undefined }));
                      }}
                      placeholder="Paste Image URL or upload below…"
                      className={`flex-1 text-xs ${errors.image ? "border-destructive" : ""}`}
                    />
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold hover:bg-muted transition">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} disabled={uploading} />
                    </label>
                  </div>
                  {errors.image && <p className="text-[11px] text-destructive font-medium">{errors.image}</p>}

                  {/* Uniform Aspect Ratio Preview Box */}
                  {imageUrl ? (
                    <div className="relative mt-2 overflow-hidden rounded-lg border bg-muted/30">
                      <img
                        src={imageUrl}
                        alt="Food Preview"
                        className="h-36 w-full object-cover rounded-md"
                        onError={() => toast.error("Failed to load image preview")}
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute top-2 right-2 rounded-full bg-background/80 p-1 text-foreground hover:bg-destructive hover:text-white transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground">
                      <ImageIcon className="h-6 w-6 mb-1 text-muted-foreground/50" />
                      <span className="text-xs">No image selected (Preview area)</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Description *</label>
                  <Textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                    }}
                    placeholder="Brief description of ingredients & preparation…"
                    rows={2}
                    className={`mt-1 text-xs ${errors.description ? "border-destructive" : ""}`}
                  />
                  {errors.description && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.description}</p>}
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={available} onCheckedChange={setAvailable} id="availability-switch" />
                    <label htmlFor="availability-switch" className="text-xs font-semibold text-foreground cursor-pointer">
                      Available for Ordering
                    </label>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Prep time:</span>
                    <Input
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      className="w-16 h-8 text-xs font-mono"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-3 mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || uploading} className="gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Food Item"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground font-medium bg-muted/60 text-center">No img</div>
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
                    <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/60 flex-col gap-1">
                      <UtensilsCrossed className="h-6 w-6 text-muted-foreground/40" />
                      <span className="text-xs">No image uploaded</span>
                    </div>
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
