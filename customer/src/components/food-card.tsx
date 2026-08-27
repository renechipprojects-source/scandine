import type { FoodItem } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Star, Plus, Heart, Clock, Flame, Utensils } from "lucide-react";
import { useState, useEffect } from "react";
import { cart } from "@/lib/cart-store";
import { toast } from "sonner";
import { fetchFoodRatingStats } from "@/lib/supabase";

export function getKitchenImageUrl(url?: string): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Exclude invalid localhost / 127.0.0.1 asset URLs in production
  if (trimmed.includes("localhost:") || trimmed.includes("127.0.0.1:")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname && parsed.pathname !== "/" && !parsed.pathname.endsWith("/")) {
        return parsed.pathname;
      }
    } catch {}
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    if (trimmed.includes("res.cloudinary.com") && !trimmed.includes("q_auto")) {
      return trimmed.replace("/upload/", "/upload/w_600,f_auto,q_auto,c_limit/");
    }
    return trimmed;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const cleanPath = trimmed.replace(/^\/+/, "");
  if (cleanPath.startsWith("storage/v1/object/public/")) {
    return `${supabaseUrl}/${cleanPath}`;
  }
  return `${supabaseUrl}/storage/v1/object/public/sd_menu_items/${cleanPath}`;
}

export function FoodCard({ food, layout = "grid" }: { food: FoodItem; layout?: "grid" | "row" }) {
  const [fav, setFav] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [ratingStats, setRatingStats] = useState({ avgRating: food.rating || 4.5, reviewCount: food.reviews || 0 });
  const rawUrl = getKitchenImageUrl(food.image);
  const showImage = Boolean(rawUrl && !imgError);

  useEffect(() => {
    let isMounted = true;
    fetchFoodRatingStats(String(food.id)).then((stats) => {
      if (isMounted && stats) {
        setRatingStats(stats);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [food.id]);

  if (layout === "row") {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="glass rounded-2xl p-3 flex gap-3 items-center shadow-soft"
      >
        <Link to="/food/$id" params={{ id: food.id }} className="shrink-0">
          {showImage ? (
            <img
              src={rawUrl}
              alt={food.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-20 w-20 rounded-xl object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-amber-500/15 to-primary/15 flex flex-col items-center justify-center text-muted-foreground p-1 text-center">
              <Utensils className="h-6 w-6 text-primary/40 mb-1" />
              <span className="text-[9px] font-semibold text-muted-foreground/70 truncate max-w-full">{food.name}</span>
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link to="/food/$id" params={{ id: food.id }} className="font-semibold text-sm truncate">{food.name}</Link>
            <VegDot veg={food.veg} />
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">{food.description}</div>
          <div className="flex items-center justify-between mt-1.5">
            <div className="text-sm font-bold">₹{food.price}</div>
            <AddBtn food={food} />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative overflow-hidden rounded-3xl bg-card shadow-soft border"
    >
      <Link to="/food/$id" params={{ id: food.id }} className="block relative">
        <div className="relative aspect-[4/3] overflow-hidden">
          {showImage ? (
            <img
              src={rawUrl}
              alt={food.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-primary/10 flex flex-col items-center justify-center text-muted-foreground p-3 text-center">
              <Utensils className="h-10 w-10 text-primary/40 mb-1" />
              <span className="text-xs font-semibold text-muted-foreground/70 truncate max-w-full px-2">{food.name}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {food.discount && (
            <div className="absolute top-3 left-3 rounded-full gradient-primary text-white text-[10px] font-bold px-2.5 py-1">
              {food.discount}% OFF
            </div>
          )}
          {food.chefRecommended && (
            <div className="absolute top-3 right-12 rounded-full glass text-[10px] font-semibold px-2.5 py-1 flex items-center gap-1">
              <Flame className="h-3 w-3 text-primary" /> Chef
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); setFav((f) => !f); }}
            className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full glass"
          >
            <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
          </button>
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <VegDot veg={food.veg} />
            <div className="flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px] font-semibold">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {ratingStats.avgRating}
            </div>
            <div className="flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px]">
              <Clock className="h-3 w-3" /> {food.prepTime}m
            </div>
          </div>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{food.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{food.description}</p>
          </div>
        </div>
        <div className="flex items-end justify-between mt-3">
          <div>
            <div className="text-lg font-bold text-gradient font-display">₹{food.price}</div>
            {food.originalPrice && (
              <div className="text-xs text-muted-foreground line-through">₹{food.originalPrice}</div>
            )}
          </div>
          <AddBtn food={food} />
        </div>
      </div>
    </motion.div>
  );
}

export function VegDot({ veg }: { veg: boolean }) {
  return (
    <div className={`h-4 w-4 rounded-sm border-2 grid place-items-center ${veg ? "border-emerald-600" : "border-red-600"}`}>
      <div className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-emerald-600" : "bg-red-600"}`} />
    </div>
  );
}

function AddBtn({ food }: { food: FoodItem }) {
  const [added, setAdded] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      disabled={!food.available}
      onClick={(e) => {
        e.preventDefault();
        cart.add(food);
        setAdded(true);
        toast.success(`${food.name} added`);
        setTimeout(() => setAdded(false), 900);
      }}
      className={`relative overflow-hidden rounded-full px-4 py-2 text-xs font-semibold shadow-float transition ${food.available ? "gradient-primary text-white" : "bg-muted text-muted-foreground"}`}
    >
      <motion.span
        key={added ? "y" : "n"}
        initial={{ y: added ? -20 : 0, opacity: added ? 0 : 1 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-1"
      >
        <Plus className="h-3 w-3" /> {food.available ? (added ? "Added" : "Add") : "Out"}
      </motion.span>
    </motion.button>
  );
}
