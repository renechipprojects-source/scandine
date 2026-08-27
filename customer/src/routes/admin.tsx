import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  TrendingUp,
  DollarSign,
  PieChart,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Smartphone,
  CreditCard,
  Banknote,
  Users,
  Search,
  Filter,
  BarChart3,
  UserCheck,
  ChefHat,
  UtensilsCrossed,
  ConciergeBell,
  BookOpen,
  Tag,
  Lock,
} from "lucide-react";
import { CustomerNav } from "@/components/customer-nav";
import { paymentStore, useLivePayments, type PaymentRecord } from "@/lib/payment-store";
import { verifyPaymentRecordInDb, getAllPaymentsFromDb, fetchDbMenuItems, type DbMenuItem, supabase, isSupabaseConfigured } from "@/lib/supabase";
import { foods } from "@/lib/mock-data";
import { useLiveOrders, useLiveServiceRequests } from "@/lib/live-order-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminDashboard });

function AdminDashboard() {
  const livePayments = useLivePayments();
  const liveOrders = useLiveOrders();
  const liveServices = useLiveServiceRequests();
  const [dbPayments, setDbPayments] = useState<PaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "breakdown" | "reports" | "kitchen_view" | "menu_view">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [menuItems, setMenuItems] = useState<DbMenuItem[]>([]);
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>("All");

  useEffect(() => {
    async function load() {
      const data = await getAllPaymentsFromDb();
      if (data && data.length > 0) {
        setDbPayments(data as PaymentRecord[]);
      }

      const dbItems = await fetchDbMenuItems();
      if (dbItems && dbItems.length > 0) {
        setMenuItems(dbItems);
      } else {
        const mapped: DbMenuItem[] = foods.map((f) => ({
          id: f.id,
          name: f.name,
          description: f.description,
          price: f.price,
          category: f.category,
          image: f.image,
          veg: f.veg,
          available: f.available,
          prepTime: f.prepTime,
        }));
        setMenuItems(mapped);
      }
    }
    load();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured()) {
      channel = supabase.channel("scandine_reception_admin_channel");
      channel
        .on("broadcast", { event: "reception_admin_billing" }, (evt) => {
          if (evt.payload?.record) {
            paymentStore.addPaymentRecord(evt.payload.record as PaymentRecord);
          }
        })
        .on("broadcast", { event: "payment_status_update" }, (evt) => {
          if (evt.payload?.payment_id) {
            paymentStore.verifyPayment(evt.payload.payment_id, evt.payload.verified_by);
          }
        })
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const mergedPayments: PaymentRecord[] = (() => {
    const map = new Map<string, PaymentRecord>();
    dbPayments.forEach((p) => map.set(p.id, p));
    livePayments.forEach((lp) => map.set(lp.id, lp));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })();

  const paidPayments = mergedPayments.filter((p) => p.status === "paid");
  const pendingPayments = mergedPayments.filter((p) => p.status === "pending_verification");

  const totalRevenue = paidPayments.reduce((s, p) => s + (p.total || 0), 0);
  const upiPayments = paidPayments.filter((p) => p.payment_category === "upi");
  const cashPayments = paidPayments.filter((p) => p.payment_category === "cash");
  const cardPayments = paidPayments.filter((p) => p.payment_category === "card");

  const upiTotal = upiPayments.reduce((s, p) => s + (p.total || 0), 0);
  const cashTotal = cashPayments.reduce((s, p) => s + (p.total || 0), 0);
  const cardTotal = cardPayments.reduce((s, p) => s + (p.total || 0), 0);

  const avgOrderValue = paidPayments.length > 0 ? Math.round(totalRevenue / paidPayments.length) : 0;

  const filteredPayments = mergedPayments.filter((p) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        p.table_number.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        p.order_number.toLowerCase().includes(q) ||
        p.invoice_id.toLowerCase().includes(q) ||
        p.transaction_id.toLowerCase().includes(q) ||
        p.payment_method.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAdminVerify = async (payment: PaymentRecord) => {
    paymentStore.verifyPayment(payment.id, "Admin Executive");
    await verifyPaymentRecordInDb(payment.id, "Admin Executive");
    toast.success(`Admin verified payment for Table ${payment.table_number}! Status: PAID`);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <CustomerNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl gradient-accent grid place-items-center text-white shadow-float">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold">Admin Management & Analytics</h1>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  Full System Control
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Executive revenue overview, payment method breakdown, billing reports, and manual payment verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Gross Total Revenue</div>
              <div className="font-display font-bold text-3xl text-gradient">₹{totalRevenue}</div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Net Revenue</div>
              <div className="font-display font-bold text-2xl text-emerald-600">₹{totalRevenue}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 grid place-items-center font-bold">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Paid Transactions</div>
              <div className="font-display font-bold text-2xl text-primary">{paidPayments.length}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending Approvals</div>
              <div className="font-display font-bold text-2xl text-amber-500">{pendingPayments.length}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 grid place-items-center font-bold">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Average Order Value</div>
              <div className="font-display font-bold text-2xl">₹{avgOrderValue}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 grid place-items-center font-bold">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "overview"
                ? "gradient-primary text-white shadow-float"
                : "bg-card border text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Overview & Pending ({pendingPayments.length})
          </button>

          <button
            onClick={() => setActiveTab("breakdown")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "breakdown"
                ? "gradient-primary text-white shadow-float"
                : "bg-card border text-muted-foreground hover:text-foreground"
            }`}
          >
            <PieChart className="h-3.5 w-3.5" /> Method Breakdown (UPI/Cash/Card)
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "reports"
                ? "gradient-primary text-white shadow-float"
                : "bg-card border text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Daily Reports & Invoices
          </button>

          <button
            onClick={() => setActiveTab("kitchen_view")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "kitchen_view"
                ? "gradient-primary text-white shadow-float"
                : "bg-card border text-muted-foreground hover:text-foreground"
            }`}
          >
            <ChefHat className="h-3.5 w-3.5" /> Kitchen Management (View Only)
          </button>

          <button
            onClick={() => setActiveTab("menu_view")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "menu_view"
                ? "gradient-primary text-white shadow-float"
                : "bg-card border text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> Menu & Categories (View Only)
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Pending Approvals */}
            {pendingPayments.length > 0 && (
              <div className="glass rounded-3xl p-6 border border-amber-500/40 bg-amber-500/5">
                <div className="flex items-center justify-between mb-4 border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500 animate-ping" />
                    <h2 className="font-display text-xl font-bold">Admin Override: Pending Cash & Card Approvals</h2>
                  </div>
                  <span className="text-xs font-semibold bg-amber-500/20 text-amber-800 px-3 py-1 rounded-full">
                    {pendingPayments.length} Pending
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingPayments.map((p) => (
                    <div key={p.id} className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold font-display text-lg">Table {p.table_number}</span>
                          <span className="text-xs font-bold uppercase bg-amber-500 text-white px-2 py-0.5 rounded-full">
                            {p.payment_category}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 mb-3">
                          <div>Customer: <span className="font-semibold text-foreground">{p.customer_name}</span></div>
                          <div>Invoice: <span className="font-semibold text-foreground">{p.invoice_id}</span></div>
                          <div>Method: <span className="font-bold text-amber-600">{p.payment_method}</span></div>
                        </div>
                        <div className="text-right border-t pt-2 mb-3">
                          <span className="font-display font-bold text-lg text-gradient">₹{p.total}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAdminVerify(p)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="h-4 w-4" /> Admin Approve & Mark Paid
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass rounded-3xl p-6 border flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-600 grid place-items-center font-bold">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">UPI / GPay Auto-Paid</div>
                  <div className="font-display font-bold text-2xl">₹{upiTotal}</div>
                  <div className="text-xs text-emerald-600 font-semibold">{upiPayments.length} transactions</div>
                </div>
              </div>

              <div className="glass rounded-3xl p-6 border flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 grid place-items-center font-bold">
                  <Banknote className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Cash Collections</div>
                  <div className="font-display font-bold text-2xl">₹{cashTotal}</div>
                  <div className="text-xs text-emerald-600 font-semibold">{cashPayments.length} verified</div>
                </div>
              </div>

              <div className="glass rounded-3xl p-6 border flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 grid place-items-center font-bold">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Card POS Settlements</div>
                  <div className="font-display font-bold text-2xl">₹{cardTotal}</div>
                  <div className="text-xs text-emerald-600 font-semibold">{cardPayments.length} verified</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENT METHOD BREAKDOWN TAB */}
        {activeTab === "breakdown" && (
          <div className="glass rounded-3xl p-6 border">
            <h2 className="font-display text-xl font-bold mb-1">Payment Method Revenue Share</h2>
            <p className="text-xs text-muted-foreground mb-6">Distribution between Auto-Paid UPI, Verified Cash, and POS Card payments</p>

            <div className="space-y-6">
              {/* UPI Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-2 text-purple-600">
                    <Smartphone className="h-4 w-4" /> UPI / GPay / Online ({upiPayments.length} orders)
                  </span>
                  <span>₹{upiTotal} ({totalRevenue > 0 ? Math.round((upiTotal / totalRevenue) * 100) : 0}%)</span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${totalRevenue > 0 ? (upiTotal / totalRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Cash Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-2 text-emerald-600">
                    <Banknote className="h-4 w-4" /> Cash at Counter ({cashPayments.length} orders)
                  </span>
                  <span>₹{cashTotal} ({totalRevenue > 0 ? Math.round((cashTotal / totalRevenue) * 100) : 0}%)</span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalRevenue > 0 ? (cashTotal / totalRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Card Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-2 text-blue-600">
                    <CreditCard className="h-4 w-4" /> Credit / Debit Card Terminal ({cardPayments.length} orders)
                  </span>
                  <span>₹{cardTotal} ({totalRevenue > 0 ? Math.round((cardTotal / totalRevenue) * 100) : 0}%)</span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${totalRevenue > 0 ? (cardTotal / totalRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <div className="glass rounded-3xl p-6 border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-xl font-bold">Daily Billing & Settlement Report</h2>
                <p className="text-xs text-muted-foreground">Complete audit trail of all customer transactions</p>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="admin-billing-search"
                  name="adminBillingSearch"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search invoice, table, customer..."
                  aria-label="Search invoice, table, or customer"
                  className="w-full rounded-full border bg-background pl-9 pr-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3 rounded-l-xl">Invoice ID</th>
                    <th className="p-3">Order / Table</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Txn ID</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right rounded-r-xl">Verified By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition">
                        <td className="p-3 font-mono font-bold text-primary">{p.invoice_id}</td>
                        <td className="p-3 font-semibold">
                          {p.order_number} <span className="text-muted-foreground">(T-{p.table_number})</span>
                        </td>
                        <td className="p-3">{p.customer_name}</td>
                        <td className="p-3 font-semibold">{p.payment_method}</td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">{p.transaction_id}</td>
                        <td className="p-3 font-bold text-sm">₹{p.total}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                              p.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse"
                            }`}
                          >
                            {p.status === "paid" ? "✓ Paid" : "Pending Approval"}
                          </span>
                        </td>
                        <td className="p-3 text-right text-muted-foreground italic">
                          {p.verified_by || (p.status === "paid" ? "System" : "Awaiting Verification")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KITCHEN MANAGEMENT VIEW ONLY TAB */}
        {activeTab === "kitchen_view" && (
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 grid place-items-center">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold flex items-center gap-2">
                    Kitchen Management — View Only Mode
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Admin has view-only access to kitchen live queues. Queue management and order/service status updates are performed strictly in the Kitchen module.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-full border border-amber-500/20">
                View Only
              </span>
            </div>

            {/* Live Orders Queue (Read Only) */}
            <div className="glass rounded-3xl p-6 border">
              <h3 className="font-display text-base font-bold mb-4 flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-primary" /> Kitchen Orders Queue ({liveOrders.filter((o) => o.status !== "completed").length})
              </h3>
              {liveOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">No active kitchen orders found.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {liveOrders.map((ord) => (
                    <div key={ord.id} className="bg-card border rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm font-display">Table {ord.table}</span>
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {ord.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Order #{ord.id} · {ord.items.length} items · ₹{ord.total}
                      </div>
                      <div className="text-xs space-y-1 pt-2 border-t">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{it.qty}× {it.name}</span>
                            <span className="text-muted-foreground">₹{(it.price || 0) * it.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Service Requests Queue (Read Only) */}
            <div className="glass rounded-3xl p-6 border">
              <h3 className="font-display text-base font-bold mb-4 flex items-center gap-2">
                <ConciergeBell className="h-4 w-4 text-amber-500" /> Kitchen Service Requests Queue ({liveServices.filter((s) => s.status !== "completed").length})
              </h3>
              {liveServices.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">No active service requests found.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {liveServices.map((srv) => (
                    <div key={srv.id} className="bg-card border rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-sm font-display">Table {srv.table_number}</div>
                        <div className="text-xs text-amber-600 font-semibold">{srv.label}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        {srv.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MENU & CATEGORIES VIEW ONLY TAB */}
        {activeTab === "menu_view" && (
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 grid place-items-center">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold">Menu & Categories — View Only</h2>
                  <p className="text-xs text-muted-foreground">
                    Admin can view menu items, categories, and item availability/status. Menu modifications (Add/Edit/Delete food or category changes) are restricted to the Kitchen module.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-blue-500/10 text-blue-600 px-3 py-1.5 rounded-full border border-blue-500/20">
                View Only Mode
              </span>
            </div>

            {/* Category Summary Filters */}
            <div className="glass rounded-3xl p-6 border">
              <h3 className="font-display text-base font-bold mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" /> View Menu Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {["All", "Breakfast", "Lunch", "Dinner", "Starters", "Desserts", "Drinks"].map((catName) => {
                  const count = catName === "All" ? menuItems.length : menuItems.filter((i) => (i.category || "").toLowerCase() === catName.toLowerCase()).length;
                  const isSel = selectedCatFilter === catName;
                  return (
                    <button
                      key={catName}
                      onClick={() => setSelectedCatFilter(catName)}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold border transition ${
                        isSel ? "gradient-primary text-white border-transparent shadow-sm" : "bg-card hover:bg-muted"
                      }`}
                    >
                      {catName} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Items Table */}
            <div className="glass rounded-3xl p-6 border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold">
                  Menu Items & Availability Status ({
                    selectedCatFilter === "All"
                      ? menuItems.length
                      : menuItems.filter((i) => (i.category || "").toLowerCase() === selectedCatFilter.toLowerCase()).length
                  })
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3 rounded-l-xl">Dish Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Prep Time</th>
                      <th className="p-3 text-right rounded-r-xl">Availability Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {menuItems
                      .filter((item) => selectedCatFilter === "All" || (item.category || "").toLowerCase() === selectedCatFilter.toLowerCase())
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition">
                          <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                            {item.image && <img src={item.image} alt="" className="h-8 w-8 rounded-lg object-cover" />}
                            <div>
                              <div>{item.name}</div>
                              <div className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</div>
                            </div>
                          </td>
                          <td className="p-3 font-medium">{item.category}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.veg ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"}`}>
                              {item.veg ? "Veg" : "Non-Veg"}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-sm">₹{item.price}</td>
                          <td className="p-3 text-muted-foreground">{item.prepTime || 15} mins</td>
                          <td className="p-3 text-right">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${item.available ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"}`}>
                              {item.available ? "✓ Available" : "Out of Stock"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
