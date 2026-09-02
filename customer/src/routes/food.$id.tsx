import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type FoodItem } from "@/lib/mock-data";
import {
  fetchDbMenuItems,
  getCategoryDisplayName,
  fetchFoodRatingStats,
  fetchFoodReviews,
  submitFoodRating,
  type FoodRating,
  type FoodRatingStats,
} from "@/lib/supabase";
import { cart } from "@/lib/cart-store";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Clock, Flame, Heart, Minus, Plus, ShoppingBag, Utensils, Send } from "lucide-react";
import { VegDot, getKitchenImageUrl } from "@/components/food-card";
import { toast } from "sonner";
import { useTable } from "@/lib/table-store";
import { useCustomer } from "@/lib/customer-store";
import { CustomerRegistration } from "@/components/customer-registration";

export const Route = createFileRoute("/food/$id")({
  component: FoodDetail,
});

function FoodDetail() {
  const tableNumber = useTable();
  const customer = useCustomer(tableNumber);
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [food, setFood] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState(1);
  const [addons, setAddons] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [fav, setFav] = useState(false);

  // Dynamic Rating State
  const [ratingStats, setRatingStats] = useState<FoodRatingStats>({ avgRating: 4.5, reviewCount: 0 });
  const [reviewsList, setReviewsList] = useState<FoodRating[]>([]);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);

  useEffect(() => {
    async function loadItem() {
      const dbItems = await fetchDbMenuItems();
      const item: any = dbItems.find((f: any) => String(f.id) === String(id));
      if (item) {
        const rawImg = item.image || item.image_url || item.photo || item.imageUrl || item.img || "";
        const catName = getCategoryDisplayName(item);
        setFood({
          id: String(item.id),
          name: item.name,
          description: item.description || "Freshly prepared by our chef.",
          price: Number(item.price),
          image: rawImg,
          category: catName as any,
          category_id: item.category_id || "cat_2",
          rating: 4.5,
          reviews: 0,
          veg: item.veg ?? true,
          prepTime: item.prep_time || item.preparation_time || item.prepTime || 15,
          calories: item.calories || 350,
          spiceLevel: item.spiceLevel || 1,
          available: item.available ?? true,
          ingredients: item.ingredients || ["Fresh Produce", "Herbs", "Olive Oil"],
        });

        // Load DB-backed dynamic rating stats & reviews
        const stats = await fetchFoodRatingStats(String(item.id));
        setRatingStats(stats);

        const revs = await fetchFoodReviews(String(item.id));
        setReviewsList(revs);
      }
    }
    loadItem();
  }, [id]);

  const handleSubmitRating = async () => {
    if (!food || !customer?.sessionId) return;
    setIsSubmittingRating(true);
    try {
      const newStats = await submitFoodRating({
        food_id: food.id,
        session_id: customer.sessionId,
        customer_name: customer.fullName,
        rating: selectedRating,
        review: reviewText.trim(),
      });
      setRatingStats(newStats);

      const updatedRevs = await fetchFoodReviews(food.id);
      setReviewsList(updatedRevs);

      setReviewText("");
      toast.success("Thank you for your rating!");
    } catch (err) {
      toast.error("Failed to submit rating");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (!customer) {
    return (
      <CustomerRegistration
        tableNumber={tableNumber}
        onSuccess={() => {
          nav({ to: "/", replace: true });
        }}
      />
    );
  }

  if (!food) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="text-center">
          <Utensils className="h-10 w-10 text-muted-foreground animate-pulse mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading dish details…</p>
        </div>
      </div>
    );
  }

  const addonTotal = (food.addons ?? []).filter((a) => addons.includes(a.name)).reduce((s, a) => s + a.price, 0);
  const total = (food.price + addonTotal) * qty;
  const headerImgUrl = getKitchenImageUrl(food.image);

  return (
    <div className="min-h-screen bg-transparent pb-32">
      <div className="relative h-[42vh] bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-primary/20 flex items-center justify-center">
        {headerImgUrl ? (
          <img src={headerImgUrl} alt={food.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6">
            <Utensils className="h-16 w-16 text-primary/40 mb-2" />
            <span className="text-sm font-semibold text-muted-foreground/80">{food.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
        <button onClick={() => nav({ to: "/menu" })} className="absolute top-4 left-4 h-10 w-10 grid place-items-center rounded-full glass">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button onClick={() => setFav((v) => !v)} className="absolute top-4 right-4 h-10 w-10 grid place-items-center rounded-full glass">
          <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
        </button>
      </div>

      <div className="relative -mt-16 max-w-3xl mx-auto px-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass rounded-3xl p-6 shadow-glass">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <VegDot veg={food.veg} />
                <div className="text-xs text-muted-foreground">{food.category}</div>
                {food.chefRecommended && (
                  <div className="rounded-full gradient-primary text-white text-[10px] font-semibold px-2 py-0.5 flex items-center gap-1"><Flame className="h-3 w-3" /> Chef</div>
                )}
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">{food.name}</h1>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gradient font-display">₹{food.price}</div>
              {food.originalPrice && <div className="text-xs line-through text-muted-foreground">₹{food.originalPrice}</div>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">{food.description}</p>

          <div className="grid grid-cols-4 gap-2 mt-5">
            <Stat icon={<Star className="h-4 w-4" />} label="Rating" value={`${food.rating}`} />
            <Stat icon={<Clock className="h-4 w-4" />} label="Prep" value={`${food.prepTime}m`} />
            <Stat icon={<Flame className="h-4 w-4" />} label="Cal" value={`${food.calories}`} />
            <Stat icon={<span>🌶️</span>} label="Spice" value={"•".repeat(food.spiceLevel) || "0"} />
          </div>

          <Section title="Ingredients">
            <div className="flex flex-wrap gap-2">
              {food.ingredients.map((i) => (
                <span key={i} className="rounded-full bg-muted px-3 py-1 text-xs">{i}</span>
              ))}
            </div>
          </Section>

          {food.addons && (
            <Section title="Add-ons">
              <div className="grid gap-2">
                {food.addons.map((a) => {
                  const on = addons.includes(a.name);
                  return (
                    <button
                      key={a.name}
                      onClick={() => setAddons((prev) => on ? prev.filter((n) => n !== a.name) : [...prev, a.name])}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${on ? "border-primary bg-primary/5" : ""}`}
                    >
                      <span>{a.name}</span>
                      <span className="font-semibold">+₹{a.price}</span>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Special instructions">
            <textarea
              id="food-special-instructions"
              name="specialInstructions"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Less spicy, no onions, etc."
              aria-label="Special instructions"
              className="w-full rounded-2xl border bg-background p-3 text-sm resize-none"
              rows={3}
            />
          </Section>

          {/* Qty + Add */}
          <div className="mt-6 flex items-center justify-between rounded-2xl border p-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-9 w-9 rounded-full border grid place-items-center"><Minus className="h-4 w-4" /></button>
              <div className="font-bold w-6 text-center">{qty}</div>
              <button onClick={() => setQty((q) => q + 1)} className="h-9 w-9 rounded-full gradient-primary text-white grid place-items-center"><Plus className="h-4 w-4" /></button>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                cart.add(food, qty);
                toast.success("Added to cart");
                nav({ to: "/cart" });
              }}
              className="flex items-center gap-2 rounded-full gradient-primary text-white font-semibold px-6 py-3 shadow-float"
            >
              <ShoppingBag className="h-4 w-4" /> Add · ₹{total}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background p-3 text-center">
      <div className="flex items-center justify-center text-primary">{icon}</div>
      <div className="mt-1 font-bold text-sm">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}
