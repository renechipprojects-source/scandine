import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/kitchen/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/kitchen/components/ui/card";
import { Button } from "@/kitchen/components/ui/button";
import { Input } from "@/kitchen/components/ui/input";
import { Label } from "@/kitchen/components/ui/label";
import { Textarea } from "@/kitchen/components/ui/textarea";
import { Switch } from "@/kitchen/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kitchen/components/ui/select";
import { PlusSquare, Upload, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { foodItems as mockFoodItems } from "@/kitchen/lib/mock-data";
import { useSupabaseTable, type MenuItem } from "@/hooks/useSupabaseData";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const Route = createFileRoute("/kitchen/_app/menu/add")({
  head: () => ({ meta: [{ title: "Add Menu Item — Kitchen" }, { name: "description", content: "Add a new dish to the kitchen menu." }] }),
  component: KitchenAddItemPage,
});

function KitchenAddItemPage() {
  const navigate = useNavigate();
  const { addItem } = useSupabaseTable<MenuItem>("sd_menu_items", []);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [preparationTime, setPreparationTime] = useState("15");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"Available" | "Unavailable">("Available");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1541529086526-db283c563270?w=600&auto=format&fit=crop");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a food item name");
      return;
    }
    if (!price || isNaN(Number(price))) {
      toast.error("Please enter a valid price");
      return;
    }
    if (!category) {
      toast.error("Please select a category");
      return;
    }

    setIsUploading(true);
    let finalImageUrl = imageUrl || "https://images.unsplash.com/photo-1541529086526-db283c563270?w=600&auto=format&fit=crop";

    try {
      if (selectedFile) {
        toast.info("Uploading image to Cloudinary...");
        finalImageUrl = await uploadToCloudinary(selectedFile);
      } else if (imageUrl && !imageUrl.startsWith("blob:")) {
        try {
          finalImageUrl = await uploadToCloudinary(imageUrl);
        } catch {
          // Fallback to provided URL if direct upload fails
        }
      }

      const CATEGORY_MAP: Record<string, string> = {
        Breakfast: "cat_1",
        Lunch: "cat_2",
        Dinner: "cat_3",
        Starters: "cat_4",
        Desserts: "cat_5",
        Drinks: "cat_6",
      };

      const categoryId = CATEGORY_MAP[category] || "cat_1";

      await addItem({
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        preparation_time: Number(preparationTime) || 15,
        category: category,
        category_name: category,
        category_id: categoryId,
        status: status,
        available: status === "Available",
        image: finalImageUrl,
        image_url: finalImageUrl,
      });

      toast.success("Food item published and saved to database successfully!");
      window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName: "sd_menu_items" } }));
      navigate({ to: "/kitchen/menu/items" });
    } catch (err: any) {
      console.error("Failed to publish menu item:", err);
      const errorMsg = err?.message || err?.error_description || String(err);
      toast.error(`Database insert error: ${errorMsg}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Add menu item"
        description="Create a new dish for your restaurant menu."
        icon={<PlusSquare className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Publish item"
            )}
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Basic details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="item-name">Item name *</Label>
                <Input
                  id="item-name"
                  placeholder="e.g. Truffle Mushroom Risotto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="Describe ingredients, flavor profile, dietary callouts..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Pricing & Timing</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Base price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="24.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prep-time">Est. prep time (minutes)</Label>
                <Input
                  id="prep-time"
                  type="number"
                  placeholder="15"
                  value={preparationTime}
                  onChange={(e) => setPreparationTime(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-file">Upload item image</Label>
                <Input
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-url">Or item image URL</Label>
                <Input
                  id="image-url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setSelectedFile(null);
                  }}
                />
              </div>
              {imageUrl && (
                <div className="relative h-48 w-full overflow-hidden rounded-lg border bg-muted">
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7"
                    onClick={() => {
                      setImageUrl("");
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Category & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category *" />
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
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={(val: "Available" | "Unavailable") => setStatus(val)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
