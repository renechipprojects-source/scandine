export type FoodItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Starters" | "Desserts" | "Drinks";
  category_id?: string;
  rating: number;
  reviews: number;
  veg: boolean;
  prepTime: number; // minutes
  calories: number;
  spiceLevel: 0 | 1 | 2 | 3;
  available: boolean;
  popular?: boolean;
  chefRecommended?: boolean;
  todaysSpecial?: boolean;
  ingredients: string[];
  addons?: { name: string; price: number }[];
  discount?: number;
};

const img = (q: string) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=1200&q=80`;

export const foods: FoodItem[] = [];

export const categories = [
  { id: "all", label: "All", icon: "🍽️" },
  { id: "Breakfast", label: "Breakfast", icon: "🥐" },
  { id: "Lunch", label: "Lunch", icon: "🍕" },
  { id: "Dinner", label: "Dinner", icon: "🍝" },
  { id: "Starters", label: "Starters", icon: "🥗" },
  { id: "Desserts", label: "Desserts", icon: "🍰" },
  { id: "Drinks", label: "Drinks", icon: "🍹" },
];

export const combos = [
  { id: "c1", name: "Family Feast", desc: "2 mains + 2 starters + 2 drinks", price: 1499, save: 320, image: img("photo-1555939594-58d7cb561ad1") },
  { id: "c2", name: "Date Night", desc: "2 mains + dessert + wine", price: 1899, save: 450, image: img("photo-1414235077428-338989a2e8c0") },
  { id: "c3", name: "Solo Treat", desc: "Main + drink + dessert", price: 799, save: 180, image: img("photo-1504674900247-0877df9cc836") },
];

export const restaurant = {
  name: "ScanDine",
  tagline: "Modern kitchen · Fire-cooked",
  branch: "Bandra West",
  table: 12,
  cover: img("photo-1517248135467-4c7edcad34c4"),
  logo: "🔥",
  address: "12 Turner Road, Bandra West, Mumbai",
  timings: "12:00 PM – 12:00 AM",
  phone: "+91 98200 12345",
};

export const offers = [
  { id: "o1", title: "20% OFF on Chef's Table", code: "CHEF20", color: "gradient-primary" },
  { id: "o2", title: "Free Dessert with Combos", code: "SWEET", color: "gradient-accent" },
];

export type OrderStatus =
  | "pending"
  | "received"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "completed";

export const orderStatuses: { key: OrderStatus; label: string; desc: string }[] = [
  { key: "pending", label: "Pending", desc: "Order received by kitchen" },
  { key: "accepted", label: "Accepted", desc: "Chef accepted order" },
  { key: "preparing", label: "Preparing", desc: "Cooking in kitchen" },
  { key: "ready", label: "Ready", desc: "Ready to serve" },
  { key: "completed", label: "Completed", desc: "Enjoy your meal!" },
];

export const notifications = [
  { id: "n1", title: "Order Confirmed", desc: "Order #4821 accepted by kitchen", time: "just now", type: "success" },
  { id: "n2", title: "Ready to Serve", desc: "Table 4 order ready for pickup", time: "2 min", type: "info" },
  { id: "n3", title: "New Offer", desc: "20% off on Chef's Table this week", time: "1 hr", type: "offer" },
  { id: "n4", title: "Payment Success", desc: "₹1,240 received for order #4820", time: "3 hr", type: "success" },
];
