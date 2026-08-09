import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CustomerNav } from "@/components/customer-nav";
import { restaurant } from "@/lib/mock-data";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { MapPin, Phone, Clock, Moon, Sun, HelpCircle, Info, Globe, ChevronDown, Utensils, CheckCircle2, User, Mail } from "lucide-react";
import { tableStore, useTable } from "@/lib/table-store";
import { useCustomer, customerStore } from "@/lib/customer-store";
import { CustomerRegistration } from "@/components/customer-registration";
import { useTheme, themeStore } from "@/lib/theme-store";
import { useLanguage, languageStore, LANGUAGES } from "@/lib/language-store";
import { getOrdersBySession, subscribeToOrdersBySession, type DbOrder } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: Profile });

const FAQ_ITEMS = [
  {
    q: "How does ordering from QR work?",
    a: "Scanning your table's QR code connects your browser to that table. When you add items to your cart and place an order, it is immediately sent to the kitchen display in real time.",
  },
  {
    q: "How will I know when my food is ready?",
    a: "You can track the live progress under 'My Orders' or the Track tab. When the kitchen updates the status to 'Ready', you will get an instant notification alert on your screen.",
  },
  {
    q: "How do I request a waiter, water, or tissues?",
    a: "Go to the 'Serve' tab in the bottom navigation. Tap any service button like 'Call Waiter' or 'Need Water' to notify staff immediately.",
  },
  {
    q: "Which payment options are supported?",
    a: "We support UPI (GPay, PhonePe, Paytm), Credit & Debit Cards, Razorpay online checkout, and Cash at the counter.",
  },
  {
    q: "How is GST calculated on my bill?",
    a: "A standard 5% GST is applied to food items as per government restaurant guidelines.",
  },
];

function Profile() {
  const navigate = useNavigate();
  const tableNumber = useTable();
  const customer = useCustomer(tableNumber);
  const theme = useTheme();
  const lang = useLanguage();

  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [langModalOpen, setLangModalOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  if (!customer) {
    return (
      <CustomerRegistration
        tableNumber={tableNumber}
        onSuccess={() => {
          navigate({ to: "/", replace: true });
        }}
      />
    );
  }

  useEffect(() => {
    let unsubscribe = () => {};

    async function loadSessionOrders() {
      if (!customer?.sessionId) {
        setOrders([]);
        setLoadingOrders(false);
        return;
      }
      setLoadingOrders(true);
      const data = await getOrdersBySession(customer.sessionId);
      setOrders(data);
      setLoadingOrders(false);

      unsubscribe = subscribeToOrdersBySession(customer.sessionId, (updatedOrder) => {
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === updatedOrder.id);
          if (exists) {
            return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
          }
          return [updatedOrder, ...prev];
        });
      });
    }

    loadSessionOrders();
    return () => unsubscribe();
  }, [customer?.sessionId]);

  const historyOrders = orders.filter(
    (o) => o.status === "completed" || o.status === "served" || o.status === "cancelled"
  );
  const activeOrders = orders.filter(
    (o) => !["completed", "served", "cancelled"].includes(o.status.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <CustomerNav />
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-6">
        {/* Header Profile Card */}
        <div className="glass rounded-3xl p-6 shadow-glass flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl gradient-accent grid place-items-center text-white text-2xl font-bold">
            {tableNumber.replace(/\D/g, "") || "1"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl font-bold">{customer.fullName}</div>
            <div className="text-xs text-muted-foreground">{tableNumber} · {customer.phone} · {customer.email}</div>
            <div className="text-xs text-primary font-medium mt-0.5">Dining at {restaurant.name}</div>
          </div>
          <button
            onClick={() => themeStore.toggleTheme()}
            className="rounded-full border p-2.5 text-xs font-semibold hover:bg-muted"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </button>
        </div>

        {/* Active Orders */}
        <Section title="Active Orders & Live Status" icon={<Utensils className="h-4 w-4" />}>
          {loadingOrders ? (
            <div className="text-center py-6 glass rounded-2xl text-xs text-muted-foreground">
              Syncing your session orders...
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="text-center py-8 glass rounded-2xl border">
              <Utensils className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
              <div className="font-semibold text-sm">No active orders</div>
              <div className="text-xs text-muted-foreground mt-0.5">Explore the menu and place your first order!</div>
              <Link to="/menu" className="mt-3 inline-flex rounded-full gradient-primary text-white text-xs font-semibold px-4 py-2">
                View Menu
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((o) => (
                <div key={o.id} className="glass rounded-2xl p-4 border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">Order #{o.order_number || o.id}</div>
                      <div className="text-xs text-muted-foreground">
                        {tableNumber} · {o.items.length} items · ₹{o.total} · {o.payment_status === "paid" ? "✓ Paid" : "Unpaid"}
                      </div>
                    </div>
                    <Link
                      to="/track"
                      search={{ orderId: o.id }}
                      className="rounded-full gradient-primary text-white text-xs font-semibold px-3 py-1.5 shadow-sm"
                    >
                      Track Live
                    </Link>
                  </div>

                  {/* Stage Progress Bar */}
                  <div className="pt-2 border-t flex items-center justify-between text-[11px]">
                    {[
                      { key: "pending", label: "Pending" },
                      { key: "accepted", label: "Accepted" },
                      { key: "preparing", label: "Preparing" },
                      { key: "ready", label: "Ready" },
                      { key: "completed", label: "Served" },
                    ].map((step, idx) => {
                      const stages = ["pending", "received", "accepted", "preparing", "ready", "served", "completed"];
                      const currentIdx = stages.indexOf(o.status.toLowerCase());
                      const stepIdx = stages.indexOf(step.key);
                      const isDone = currentIdx >= stepIdx;

                      return (
                        <div key={step.key} className="flex flex-col items-center gap-1 text-center">
                          <div
                            className={`h-6 w-6 rounded-full grid place-items-center text-xs ${
                              isDone ? "gradient-primary text-white font-bold" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isDone ? "✓" : idx + 1}
                          </div>
                          <span className={`text-[10px] ${isDone ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Order History */}
        <Section title="Order History" icon={<CheckCircle2 className="h-4 w-4" />}>
          {historyOrders.length === 0 ? (
            <div className="text-center py-6 glass rounded-2xl text-xs text-muted-foreground border">
              No completed orders yet in this session.
            </div>
          ) : (
            <div className="space-y-3">
              {historyOrders.map((o) => (
                <div key={o.id} className="glass rounded-2xl p-4 border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm">Order #{o.order_number || o.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.items.length} items · ₹{o.total} · {o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    o.status === "completed" || o.status === "served"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                  }`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg gradient-primary text-white grid place-items-center">{icon}</div>
        <div className="font-display font-bold text-lg">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Item({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 flex items-center gap-3 text-sm">
      <span className="text-primary">{icon}</span>
      <span className="flex-1">{label}</span>
    </div>
  );
}
