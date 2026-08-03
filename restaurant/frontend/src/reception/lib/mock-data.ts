export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled";
export type PaymentStatus = "paid" | "unpaid" | "refunded" | "partial";
export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";

export const restaurantInfo = {
  name: "ScanDine",
  tagline: "QR Restaurant Management System",
  branch: "Downtown Flagship",
  address: "42 Riverside Ave, Suite 200",
  phone: "+1 (415) 555-0199",
  currency: "₹",
  gstNumber: "GST-99-XXAB1234",
  logoInitial: "S",
};

export const kpis = {
  todaysSales: 8342.5,
  todaysOrders: 187,
  activeTables: 14,
  availableTables: 10,
  pending: 6,
  preparing: 9,
  ready: 4,
  completed: 152,
  cancelled: 3,
  avgOrderValue: 44.6,
  monthlyRevenue: 214800,
  weeklyRevenue: 52340,
};

export const salesTrend = [
  { day: "Mon", sales: 6200, orders: 132 },
  { day: "Tue", sales: 7100, orders: 148 },
  { day: "Wed", sales: 8300, orders: 176 },
  { day: "Thu", sales: 7800, orders: 165 },
  { day: "Fri", sales: 10500, orders: 210 },
  { day: "Sat", sales: 12800, orders: 242 },
  { day: "Sun", sales: 9600, orders: 198 },
];

export const revenueTrend = [
  { month: "Jan", revenue: 148000 },
  { month: "Feb", revenue: 162000 },
  { month: "Mar", revenue: 178000 },
  { month: "Apr", revenue: 189000 },
  { month: "May", revenue: 195000 },
  { month: "Jun", revenue: 208000 },
  { month: "Jul", revenue: 214800 },
];

export const peakHours = [
  { hour: "10a", orders: 12 },
  { hour: "11a", orders: 22 },
  { hour: "12p", orders: 48 },
  { hour: "1p", orders: 62 },
  { hour: "2p", orders: 40 },
  { hour: "3p", orders: 18 },
  { hour: "4p", orders: 14 },
  { hour: "5p", orders: 22 },
  { hour: "6p", orders: 38 },
  { hour: "7p", orders: 68 },
  { hour: "8p", orders: 74 },
  { hour: "9p", orders: 55 },
];

export const categories = [
  { id: "c1", name: "Starters", items: 14, icon: "🥗", color: "bg-orange-100 text-orange-700" },
  { id: "c2", name: "Main Course", items: 26, icon: "🍛", color: "bg-red-100 text-red-700" },
  { id: "c3", name: "Pizza", items: 12, icon: "🍕", color: "bg-amber-100 text-amber-700" },
  { id: "c4", name: "Burgers", items: 8, icon: "🍔", color: "bg-yellow-100 text-yellow-700" },
  { id: "c5", name: "Pasta", items: 10, icon: "🍝", color: "bg-orange-100 text-orange-700" },
  { id: "c6", name: "Desserts", items: 9, icon: "🍰", color: "bg-pink-100 text-pink-700" },
  { id: "c7", name: "Beverages", items: 18, icon: "🥤", color: "bg-sky-100 text-sky-700" },
  { id: "c8", name: "Combos", items: 6, icon: "🍱", color: "bg-emerald-100 text-emerald-700" },
];

export type FoodItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  veg: boolean;
  spicy: 0 | 1 | 2 | 3;
  prepTime: number;
  available: boolean;
  popular?: boolean;
  featured?: boolean;
  description: string;
  emoji: string;
  stock: "in" | "low" | "out";
};

export const foodItems: FoodItem[] = [
  { id: "f1", name: "Truffle Mushroom Pizza", category: "Pizza", price: 18.5, veg: true, spicy: 0, prepTime: 18, available: true, popular: true, featured: true, description: "Wild mushrooms, black truffle oil, mozzarella on wood-fired crust.", emoji: "🍕", stock: "in" },
  { id: "f2", name: "Spicy Chipotle Burger", category: "Burgers", price: 14.0, veg: false, spicy: 2, prepTime: 14, available: true, popular: true, description: "Angus beef, chipotle mayo, pepper jack, brioche bun.", emoji: "🍔", stock: "in" },
  { id: "f3", name: "Butter Chicken", category: "Main Course", price: 16.75, veg: false, spicy: 1, prepTime: 22, available: true, popular: true, featured: true, description: "Tender chicken in creamy tomato gravy, served with basmati rice.", emoji: "🍛", stock: "in" },
  { id: "f4", name: "Caesar Salad", category: "Starters", price: 9.5, veg: true, spicy: 0, prepTime: 8, available: true, description: "Crisp romaine, shaved parmesan, garlic croutons.", emoji: "🥗", stock: "in" },
  { id: "f5", name: "Penne Arrabiata", category: "Pasta", price: 13.25, veg: true, spicy: 2, prepTime: 15, available: true, description: "Al dente penne in a fiery tomato and chili sauce.", emoji: "🍝", stock: "low" },
  { id: "f6", name: "Molten Chocolate Cake", category: "Desserts", price: 8.0, veg: true, spicy: 0, prepTime: 10, available: true, popular: true, description: "Warm dark chocolate cake with a molten center, vanilla ice cream.", emoji: "🍰", stock: "in" },
  { id: "f7", name: "Iced Hazelnut Latte", category: "Beverages", price: 5.25, veg: true, spicy: 0, prepTime: 4, available: true, description: "Cold-brewed espresso, hazelnut syrup, oat milk.", emoji: "🥤", stock: "in" },
  { id: "f8", name: "Paneer Tikka", category: "Starters", price: 11.0, veg: true, spicy: 2, prepTime: 12, available: true, description: "Cottage cheese cubes marinated in yogurt and tandoori spices.", emoji: "🧆", stock: "in" },
  { id: "f9", name: "Grilled Salmon Bowl", category: "Main Course", price: 21.5, veg: false, spicy: 1, prepTime: 20, available: true, featured: true, description: "Atlantic salmon, quinoa, avocado, citrus vinaigrette.", emoji: "🐟", stock: "in" },
  { id: "f10", name: "Margherita Pizza", category: "Pizza", price: 14.0, veg: true, spicy: 0, prepTime: 16, available: true, description: "Fresh basil, tomato, buffalo mozzarella.", emoji: "🍕", stock: "in" },
  { id: "f11", name: "BBQ Wings", category: "Starters", price: 12.5, veg: false, spicy: 2, prepTime: 14, available: false, description: "Slow-smoked chicken wings glazed with house BBQ.", emoji: "🍗", stock: "out" },
  { id: "f12", name: "Tiramisu", category: "Desserts", price: 8.5, veg: true, spicy: 0, prepTime: 5, available: true, description: "Classic Italian layered coffee dessert.", emoji: "🍮", stock: "in" },
];

export const topSelling = [
  { name: "Truffle Mushroom Pizza", sold: 142, revenue: 2627 },
  { name: "Butter Chicken", sold: 128, revenue: 2144 },
  { name: "Spicy Chipotle Burger", sold: 118, revenue: 1652 },
  { name: "Molten Chocolate Cake", sold: 96, revenue: 768 },
  { name: "Grilled Salmon Bowl", sold: 74, revenue: 1591 },
];

export type Order = {
  id: string;
  table: string;
  customer: string;
  items: { name: string; qty: number; price: number; note?: string }[];
  total: number;
  status: OrderStatus;
  payment: PaymentStatus;
  placedAt: string;
  waiter: string;
  channel: "QR" | "Counter" | "Waiter";
};

export const orders: Order[] = [
  { id: "#ORD-10248", table: "T-07", customer: "Amelia Chen", items: [{ name: "Truffle Mushroom Pizza", qty: 1, price: 18.5 }, { name: "Iced Hazelnut Latte", qty: 2, price: 5.25 }], total: 29.0, status: "preparing", payment: "unpaid", placedAt: "2 min ago", waiter: "Marco R.", channel: "QR" },
  { id: "#ORD-10247", table: "T-12", customer: "Jonah Patel", items: [{ name: "Butter Chicken", qty: 2, price: 16.75 }], total: 33.5, status: "ready", payment: "paid", placedAt: "6 min ago", waiter: "Sofia L.", channel: "QR" },
  { id: "#ORD-10246", table: "T-03", customer: "Walk-in", items: [{ name: "Spicy Chipotle Burger", qty: 1, price: 14.0 }, { name: "Molten Chocolate Cake", qty: 1, price: 8.0 }], total: 22.0, status: "pending", payment: "unpaid", placedAt: "8 min ago", waiter: "Marco R.", channel: "Counter" },
  { id: "#ORD-10245", table: "T-15", customer: "Priya Sharma", items: [{ name: "Grilled Salmon Bowl", qty: 1, price: 21.5 }, { name: "Caesar Salad", qty: 1, price: 9.5 }], total: 31.0, status: "served", payment: "paid", placedAt: "14 min ago", waiter: "Elena K.", channel: "Waiter" },
  { id: "#ORD-10244", table: "T-09", customer: "Diego Alvarez", items: [{ name: "Margherita Pizza", qty: 2, price: 14.0 }], total: 28.0, status: "completed", payment: "paid", placedAt: "28 min ago", waiter: "Sofia L.", channel: "QR" },
  { id: "#ORD-10243", table: "T-02", customer: "Nora Kim", items: [{ name: "Penne Arrabiata", qty: 1, price: 13.25 }, { name: "Tiramisu", qty: 1, price: 8.5 }], total: 21.75, status: "cancelled", payment: "refunded", placedAt: "42 min ago", waiter: "Marco R.", channel: "QR" },
  { id: "#ORD-10242", table: "T-11", customer: "Lucas Wright", items: [{ name: "Paneer Tikka", qty: 1, price: 11 }, { name: "Butter Chicken", qty: 1, price: 16.75 }], total: 27.75, status: "completed", payment: "paid", placedAt: "1 hr ago", waiter: "Elena K.", channel: "Waiter" },
  { id: "#ORD-10241", table: "T-05", customer: "Ines Moreau", items: [{ name: "Truffle Mushroom Pizza", qty: 1, price: 18.5 }], total: 18.5, status: "completed", payment: "paid", placedAt: "1 hr ago", waiter: "Sofia L.", channel: "QR" },
];

export const tables = Array.from({ length: 20 }, (_, i) => {
  const statuses: TableStatus[] = ["available", "occupied", "reserved", "cleaning"];
  const status = statuses[i % 4];
  return {
    id: `T-${String(i + 1).padStart(2, "0")}`,
    seats: [2, 4, 6, 8][i % 4],
    status,
    waiter: ["Marco R.", "Sofia L.", "Elena K.", "David N."][i % 4],
    currentOrder: status === "occupied" ? `#ORD-102${40 + i}` : null,
  };
});

export const customers = [
  { id: "cu1", name: "Amelia Chen", email: "amelia@example.com", phone: "+1 415 555 0123", visits: 24, spent: 892.5, lastVisit: "Today", tier: "Gold" },
  { id: "cu2", name: "Jonah Patel", email: "jonah@example.com", phone: "+1 415 555 0141", visits: 18, spent: 654.0, lastVisit: "Yesterday", tier: "Silver" },
  { id: "cu3", name: "Priya Sharma", email: "priya@example.com", phone: "+1 415 555 0187", visits: 32, spent: 1240.0, lastVisit: "2 days ago", tier: "Platinum" },
  { id: "cu4", name: "Diego Alvarez", email: "diego@example.com", phone: "+1 415 555 0192", visits: 9, spent: 312.75, lastVisit: "5 days ago", tier: "Silver" },
  { id: "cu5", name: "Nora Kim", email: "nora@example.com", phone: "+1 415 555 0155", visits: 41, spent: 1687.25, lastVisit: "Today", tier: "Platinum" },
  { id: "cu6", name: "Lucas Wright", email: "lucas@example.com", phone: "+1 415 555 0166", visits: 6, spent: 187.5, lastVisit: "1 week ago", tier: "Bronze" },
];

export const invoices = orders.map((o, i) => ({
  id: `INV-${2400 + i}`,
  orderId: o.id,
  customer: o.customer,
  table: o.table,
  subtotal: o.total,
  tax: +(o.total * 0.08).toFixed(2),
  discount: i % 3 === 0 ? 5 : 0,
  total: +(o.total * 1.08 - (i % 3 === 0 ? 5 : 0)).toFixed(2),
  status: o.payment,
  date: "Today, 12:24 PM",
  method: (["Cash", "UPI", "Credit Card", "Debit Card", "Wallet"] as const)[i % 5],
}));

export const payments = invoices.map((inv, i) => ({
  id: `PMT-${9000 + i}`,
  invoiceId: inv.id,
  amount: inv.total,
  method: inv.method,
  status: inv.status,
  date: inv.date,
  customer: inv.customer,
}));

export const refunds = [
  { id: "RFD-3021", invoiceId: "INV-2405", amount: 21.75, reason: "Wrong order dispatched", status: "processed", date: "Today, 11:42 AM", customer: "Nora Kim" },
  { id: "RFD-3020", invoiceId: "INV-2398", amount: 14.5, reason: "Cold food", status: "pending", date: "Yesterday", customer: "Ken Osei" },
  { id: "RFD-3019", invoiceId: "INV-2389", amount: 32.0, reason: "Duplicate charge", status: "processed", date: "2 days ago", customer: "Rafael Cruz" },
];

export const ingredients = [
  { id: "in1", name: "Mozzarella Cheese", unit: "kg", stock: 12, min: 5, expiry: "2026-08-02", supplier: "Alpine Dairy" },
  { id: "in2", name: "Basmati Rice", unit: "kg", stock: 45, min: 20, expiry: "2027-02-14", supplier: "Golden Grains" },
  { id: "in3", name: "Chicken Breast", unit: "kg", stock: 8, min: 10, expiry: "2026-07-22", supplier: "Prime Poultry" },
  { id: "in4", name: "Truffle Oil", unit: "L", stock: 2, min: 3, expiry: "2026-11-30", supplier: "Bella Italia" },
  { id: "in5", name: "Tomato Puree", unit: "L", stock: 24, min: 10, expiry: "2026-09-18", supplier: "Sunset Produce" },
  { id: "in6", name: "Espresso Beans", unit: "kg", stock: 6, min: 4, expiry: "2026-10-05", supplier: "Roast Republic" },
];

export const suppliers = [
  { id: "s1", name: "Alpine Dairy", contact: "Maria Bianchi", phone: "+1 415 555 0201", items: 14, rating: 4.8, lastOrder: "3 days ago" },
  { id: "s2", name: "Golden Grains", contact: "Ravi Kumar", phone: "+1 415 555 0212", items: 8, rating: 4.6, lastOrder: "1 week ago" },
  { id: "s3", name: "Prime Poultry", contact: "Anna Voss", phone: "+1 415 555 0223", items: 6, rating: 4.9, lastOrder: "Yesterday" },
  { id: "s4", name: "Bella Italia", contact: "Marco Ricci", phone: "+1 415 555 0234", items: 22, rating: 4.7, lastOrder: "2 weeks ago" },
  { id: "s5", name: "Roast Republic", contact: "Sam Ohara", phone: "+1 415 555 0245", items: 4, rating: 4.5, lastOrder: "5 days ago" },
];

export const purchaseOrders = [
  { id: "PO-8812", supplier: "Alpine Dairy", items: 6, total: 842.5, status: "delivered", date: "Jul 12, 2026" },
  { id: "PO-8813", supplier: "Prime Poultry", items: 3, total: 456.0, status: "in-transit", date: "Jul 14, 2026" },
  { id: "PO-8814", supplier: "Bella Italia", items: 9, total: 1240.75, status: "pending", date: "Jul 15, 2026" },
  { id: "PO-8815", supplier: "Golden Grains", items: 2, total: 320.0, status: "draft", date: "Jul 16, 2026" },
];

export const employees = [
  { id: "e1", name: "Marco Rossi", role: "Waiter", email: "marco@scandine.co", phone: "+1 415 555 0301", shift: "Morning", status: "on-duty", performance: 92, joined: "Jan 2024" },
  { id: "e2", name: "Sofia Lang", role: "Waiter", email: "sofia@scandine.co", phone: "+1 415 555 0302", shift: "Evening", status: "on-duty", performance: 88, joined: "Mar 2024" },
  { id: "e3", name: "Elena Kovács", role: "Manager", email: "elena@scandine.co", phone: "+1 415 555 0303", shift: "Full Day", status: "on-duty", performance: 95, joined: "Aug 2023" },
  { id: "e4", name: "David Nkomo", role: "Chef", email: "david@scandine.co", phone: "+1 415 555 0304", shift: "Evening", status: "on-duty", performance: 96, joined: "Feb 2023" },
  { id: "e5", name: "Ayaka Sato", role: "Chef", email: "ayaka@scandine.co", phone: "+1 415 555 0305", shift: "Morning", status: "off-duty", performance: 90, joined: "Nov 2024" },
  { id: "e6", name: "Ben Carter", role: "Cashier", email: "ben@scandine.co", phone: "+1 415 555 0306", shift: "Morning", status: "on-duty", performance: 85, joined: "May 2025" },
  { id: "e7", name: "Iris Wong", role: "Cashier", email: "iris@scandine.co", phone: "+1 415 555 0307", shift: "Evening", status: "on-duty", performance: 87, joined: "Sep 2024" },
  { id: "e8", name: "Omar Haddad", role: "Waiter", email: "omar@scandine.co", phone: "+1 415 555 0308", shift: "Morning", status: "leave", performance: 82, joined: "Jun 2025" },
];

export const reservations = [
  { id: "R-501", customer: "Ethan Wallace", guests: 4, table: "T-08", date: "Jul 16, 2026", time: "7:30 PM", status: "confirmed", phone: "+1 415 555 0410" },
  { id: "R-502", customer: "Mira Fahim", guests: 2, table: "T-14", date: "Jul 16, 2026", time: "8:00 PM", status: "seated", phone: "+1 415 555 0411" },
  { id: "R-503", customer: "The Nguyen Family", guests: 6, table: "T-06", date: "Jul 17, 2026", time: "6:45 PM", status: "confirmed", phone: "+1 415 555 0412" },
  { id: "R-504", customer: "Isabelle Renard", guests: 3, table: "T-11", date: "Jul 17, 2026", time: "8:30 PM", status: "waitlist", phone: "+1 415 555 0413" },
  { id: "R-505", customer: "Karim Habib", guests: 5, table: "T-04", date: "Jul 18, 2026", time: "7:00 PM", status: "confirmed", phone: "+1 415 555 0414" },
  { id: "R-506", customer: "Zoe Bennett", guests: 2, table: "T-02", date: "Jul 15, 2026", time: "9:00 PM", status: "cancelled", phone: "+1 415 555 0415" },
];

export const coupons = [
  { code: "SUMMER20", type: "percent", value: 20, minOrder: 25, uses: 342, limit: 1000, validTill: "Aug 31, 2026", status: "active" },
  { code: "WELCOME10", type: "flat", value: 10, minOrder: 20, uses: 1204, limit: 5000, validTill: "Dec 31, 2026", status: "active" },
  { code: "WEEKEND15", type: "percent", value: 15, minOrder: 30, uses: 189, limit: 500, validTill: "Jul 31, 2026", status: "active" },
  { code: "FREESHIP", type: "flat", value: 5, minOrder: 15, uses: 872, limit: 2000, validTill: "Sep 30, 2026", status: "paused" },
  { code: "BIRTHDAY25", type: "percent", value: 25, minOrder: 40, uses: 56, limit: 200, validTill: "Dec 31, 2026", status: "active" },
  { code: "EXPIRED5", type: "flat", value: 5, minOrder: 10, uses: 421, limit: 500, validTill: "Jun 15, 2026", status: "expired" },
];

export const notifications = [
  { id: "n1", type: "order", title: "New order on T-07", body: "Amelia Chen placed a $29.00 order via QR.", time: "2 min ago", read: false },
  { id: "n2", type: "kitchen", title: "Ready for pickup", body: "Order #ORD-10247 is ready at the pass.", time: "6 min ago", read: false },
  { id: "n3", type: "payment", title: "Payment received", body: "INV-2412 settled via credit card — $33.50.", time: "12 min ago", read: false },
  { id: "n4", type: "stock", title: "Low stock alert", body: "Truffle oil below reorder threshold (2L / 3L).", time: "38 min ago", read: true },
  { id: "n5", type: "reservation", title: "New reservation", body: "Ethan Wallace booked T-08 for 4 at 7:30 PM.", time: "1 hr ago", read: true },
  { id: "n6", type: "announcement", title: "Menu update pushed", body: "Summer specials are now live for all QR menus.", time: "3 hrs ago", read: true },
];
