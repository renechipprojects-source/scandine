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

export const foods: FoodItem[] = [
  {
    id: "f1",
    name: "Truffle Mushroom Risotto",
    description:
      "Slow-cooked arborio rice with wild mushrooms, black truffle shavings, aged parmesan and a drizzle of white truffle oil.",
    price: 480,
    originalPrice: 560,
    image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=800&q=80",
    category: "Dinner",
    rating: 4.8,
    reviews: 342,
    veg: true,
    prepTime: 22,
    calories: 620,
    spiceLevel: 1,
    available: true,
    popular: true,
    chefRecommended: true,
    todaysSpecial: true,
    ingredients: ["Arborio rice", "Wild mushrooms", "Black truffle", "Parmesan", "White wine"],
    addons: [{ name: "Extra truffle", price: 120 }, { name: "Grilled chicken", price: 180 }],
    discount: 15,
  },
  {
    id: "f2",
    name: "Wagyu Smash Burger",
    description: "A5 wagyu patty, aged cheddar, caramelised onions, brioche bun, house sauce.",
    price: 620,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    category: "Lunch",
    rating: 4.9,
    reviews: 512,
    veg: false,
    prepTime: 18,
    calories: 780,
    spiceLevel: 1,
    available: true,
    popular: true,
    chefRecommended: true,
    ingredients: ["Wagyu beef", "Cheddar", "Brioche", "House sauce"],
    addons: [{ name: "Bacon", price: 90 }, { name: "Fried egg", price: 60 }],
  },
  {
    id: "f3",
    name: "Avocado Sourdough Toast",
    description: "Smashed avocado, poached eggs, chili crunch, micro herbs on artisan sourdough.",
    price: 320,
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80",
    category: "Breakfast",
    rating: 4.7,
    reviews: 218,
    veg: true,
    prepTime: 10,
    calories: 480,
    spiceLevel: 2,
    available: true,
    popular: true,
    todaysSpecial: true,
    ingredients: ["Sourdough", "Avocado", "Poached egg", "Chili crunch"],
  },
  {
    id: "f4",
    name: "Miso Glazed Salmon",
    description: "Atlantic salmon with sweet miso glaze, seasonal greens, jasmine rice.",
    price: 720,
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80",
    category: "Dinner",
    rating: 4.8,
    reviews: 289,
    veg: false,
    prepTime: 25,
    calories: 680,
    spiceLevel: 1,
    available: true,
    chefRecommended: true,
    ingredients: ["Salmon", "White miso", "Ginger", "Jasmine rice"],
  },
  {
    id: "f5",
    name: "Berry Chia Bowl",
    description: "Coconut chia pudding, mixed berries, granola, honey drizzle.",
    price: 280,
    image: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=800&q=80",
    category: "Breakfast",
    rating: 4.6,
    reviews: 156,
    veg: true,
    prepTime: 5,
    calories: 380,
    spiceLevel: 0,
    available: true,
    ingredients: ["Chia seeds", "Coconut milk", "Berries", "Granola"],
  },
  {
    id: "f6",
    name: "Butter Chicken",
    description: "Tandoor-grilled chicken in silky tomato-cream sauce, kasoori methi, butter.",
    price: 420,
    originalPrice: 480,
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80",
    category: "Dinner",
    rating: 4.9,
    reviews: 892,
    veg: false,
    prepTime: 20,
    calories: 720,
    spiceLevel: 2,
    available: true,
    popular: true,
    ingredients: ["Chicken", "Tomato", "Cream", "Butter", "Spices"],
    discount: 12,
  },
  {
    id: "f7",
    name: "Pistachio Kunafa",
    description: "Crispy kataifi pastry, sweet cheese, saffron syrup, crushed pistachios.",
    price: 340,
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
    category: "Desserts",
    rating: 4.9,
    reviews: 421,
    veg: true,
    prepTime: 12,
    calories: 520,
    spiceLevel: 0,
    available: true,
    chefRecommended: true,
    ingredients: ["Kataifi", "Cheese", "Pistachios", "Saffron"],
  },
  {
    id: "f8",
    name: "Iced Matcha Latte",
    description: "Ceremonial matcha, oat milk, vanilla, ice.",
    price: 220,
    image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80",
    category: "Drinks",
    rating: 4.7,
    reviews: 178,
    veg: true,
    prepTime: 4,
    calories: 180,
    spiceLevel: 0,
    available: true,
    popular: true,
    ingredients: ["Matcha", "Oat milk", "Vanilla"],
  },
  {
    id: "f9",
    name: "Crispy Calamari",
    description: "Golden fried calamari rings, lemon aioli, smoked paprika.",
    price: 380,
    image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80",
    category: "Starters",
    rating: 4.6,
    reviews: 203,
    veg: false,
    prepTime: 14,
    calories: 460,
    spiceLevel: 1,
    available: true,
    ingredients: ["Calamari", "Flour", "Lemon", "Aioli"],
  },
  {
    id: "f10",
    name: "Margherita Napoletana",
    description: "72-hour cold-fermented dough, San Marzano tomato, fior di latte, basil.",
    price: 460,
    image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80",
    category: "Lunch",
    rating: 4.8,
    reviews: 634,
    veg: true,
    prepTime: 15,
    calories: 720,
    spiceLevel: 0,
    available: true,
    popular: true,
    ingredients: ["Sourdough", "San Marzano", "Mozzarella", "Basil"],
  },
  {
    id: "f11",
    name: "Peri Peri Chicken Wings",
    description: "Slow-marinated wings, house peri-peri, blue cheese dip.",
    price: 360,
    image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80",
    category: "Starters",
    rating: 4.7,
    reviews: 287,
    veg: false,
    prepTime: 16,
    calories: 540,
    spiceLevel: 3,
    available: true,
    ingredients: ["Chicken wings", "Peri peri", "Garlic"],
  },
  {
    id: "f12",
    name: "Dark Chocolate Fondant",
    description: "Molten 70% dark chocolate centre, vanilla bean ice cream, gold leaf.",
    price: 320,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80",
    category: "Desserts",
    rating: 4.9,
    reviews: 512,
    veg: true,
    prepTime: 14,
    calories: 620,
    spiceLevel: 0,
    available: false,
    todaysSpecial: true,
    ingredients: ["Dark chocolate", "Butter", "Eggs", "Vanilla ice cream"],
  },
];

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
  | "received"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "completed";

export const orderStatuses: { key: OrderStatus; label: string; desc: string }[] = [
  { key: "received", label: "Order Received", desc: "We got your order" },
  { key: "accepted", label: "Accepted", desc: "Chef confirmed" },
  { key: "preparing", label: "Preparing", desc: "Cooking with love" },
  { key: "ready", label: "Ready", desc: "Waiter is on the way" },
  { key: "served", label: "Served", desc: "Enjoy your meal" },
  { key: "completed", label: "Completed", desc: "Thanks for dining" },
];

export const notifications = [
  { id: "n1", title: "Order Confirmed", desc: "Order #4821 accepted by kitchen", time: "just now", type: "success" },
  { id: "n2", title: "Ready to Serve", desc: "Table 4 order ready for pickup", time: "2 min", type: "info" },
  { id: "n3", title: "New Offer", desc: "20% off on Chef's Table this week", time: "1 hr", type: "offer" },
  { id: "n4", title: "Payment Success", desc: "₹1,240 received for order #4820", time: "3 hr", type: "success" },
];
