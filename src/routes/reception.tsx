import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Receipt,
  CheckCircle2,
  Clock,
  Banknote,
  CreditCard,
  Smartphone,
  Search,
  Filter,
  Download,
  Building2,
  DollarSign,
  UserCheck,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { CustomerNav } from "@/components/customer-nav";
import { paymentStore, useLivePayments, type PaymentRecord } from "@/lib/payment-store";
import { verifyPaymentRecordInDb, getAllPaymentsFromDb, supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/reception")({ component: ReceptionDashboard });

function ReceptionDashboard() {
  const livePayments = useLivePayments();
  const [dbPayments, setDbPayments] = useState<PaymentRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "cash" | "card" | "upi">("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function load() {
      const data = await getAllPaymentsFromDb();
      if (data && data.length > 0) {
        setDbPayments(data as PaymentRecord[]);
      }
    }
    load();

    // Subscribe to Realtime payment updates
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured()) {
      channel = supabase.channel("scandine_reception_admin_channel");
      channel
        .on("broadcast", { event: "reception_admin_billing" }, (evt) => {
          if (evt.payload?.record) {
            const rec = evt.payload.record as PaymentRecord;
            paymentStore.addPaymentRecord(rec);
            toast.info(`🔔 New Payment Request: Table ${rec.table_number} (${rec.payment_method})`);
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

  // Merge live store and DB records with deduplication
  const mergedPayments: PaymentRecord[] = (() => {
    const map = new Map<string, PaymentRecord>();

    dbPayments.forEach((p) => map.set(p.id, p));
    livePayments.forEach((lp) => map.set(lp.id, lp));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })();

  const pendingPayments = mergedPayments.filter((p) => p.status === "pending_verification");
  const paidPayments = mergedPayments.filter((p) => p.status === "paid");
  const totalRevenue = paidPayments.reduce((acc, p) => acc + (p.total || 0), 0);

  const filteredPayments = mergedPayments.filter((p) => {
    if (filter === "pending" && p.status !== "pending_verification") return false;
    if (filter === "paid" && p.status !== "paid") return false;
    if (filter === "cash" && p.payment_category !== "cash") return false;
    if (filter === "card" && p.payment_category !== "card") return false;
    if (filter === "upi" && p.payment_category !== "upi") return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        p.table_number.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        p.order_number.toLowerCase().includes(q) ||
        p.invoice_id.toLowerCase().includes(q) ||
        p.transaction_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleVerify = async (payment: PaymentRecord) => {
    // Update local store
    paymentStore.verifyPayment(payment.id, "Reception Staff");
    // Update Supabase DB and broadcast to Customer & Admin
    await verifyPaymentRecordInDb(payment.id, "Reception Staff");
    toast.success(`Payment verified for Table ${payment.table_number}! Status: PAID`);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <CustomerNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl gradient-primary grid place-items-center text-white shadow-float">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold">Reception Billing Desk</h1>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Real-time Billing
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manual Cash/Card payment approvals, invoice generation, and real-time counter settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Today's Collections</div>
              <div className="font-display font-bold text-2xl text-gradient">₹{totalRevenue}</div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending Verification</div>
              <div className="font-display font-bold text-2xl text-amber-500">{pendingPayments.length}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 grid place-items-center font-bold">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Verified Paid Invoices</div>
              <div className="font-display font-bold text-2xl text-emerald-500">{paidPayments.length}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 grid place-items-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Invoices</div>
              <div className="font-display font-bold text-2xl">{mergedPayments.length}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold">
              <Receipt className="h-5 w-5" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Kitchen Status</div>
              <div className="font-display font-bold text-xs text-emerald-600 mt-1">
                Strict Isolation (No Payment Data Sent to Kitchen)
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 grid place-items-center font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* PENDING APPROVALS QUEUE SECTION */}
        {pendingPayments.length > 0 && (
          <div className="mb-8 glass rounded-3xl p-6 border border-amber-500/40 bg-amber-500/5">
            <div className="flex items-center justify-between mb-4 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500 animate-ping" />
                <h2 className="font-display text-xl font-bold text-amber-900 dark:text-amber-300">
                  Pending Cash & Card Verification Queue ({pendingPayments.length})
                </h2>
              </div>
              <span className="text-xs font-semibold bg-amber-500/20 text-amber-700 px-3 py-1 rounded-full">
                Action Required by Reception
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingPayments.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-card border-2 border-amber-500/50 rounded-2xl p-4 shadow-float flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display font-bold text-lg text-foreground">
                        Table {p.table_number}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider bg-amber-500 text-white px-2.5 py-0.5 rounded-full">
                        {p.payment_category} Pending
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      <div>Customer: <span className="font-semibold text-foreground">{p.customer_name}</span></div>
                      <div>Order: <span className="font-semibold text-foreground">{p.order_number}</span></div>
                      <div>Invoice: <span className="font-semibold text-foreground">{p.invoice_id}</span></div>
                      <div>Txn ID: <span className="font-mono text-foreground">{p.transaction_id}</span></div>
                      <div>Method: <span className="font-bold text-amber-600">{p.payment_method}</span></div>
                      <div>Time: <span>{new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                    </div>

                    <div className="text-right border-t pt-2 mb-3">
                      <span className="text-xs text-muted-foreground">Total Payable: </span>
                      <span className="font-display font-bold text-xl text-gradient">₹{p.total}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleVerify(p)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-3 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
                  >
                    <UserCheck className="h-4 w-4" /> Mark Paid (Verify {p.payment_category.toUpperCase()})
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* INVOICES & BILLING LIST SECTION */}
        <div className="glass rounded-3xl p-6 border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-xl font-bold">Billing & Invoices Register</h2>
              <p className="text-xs text-muted-foreground">Real-time payment history and tax invoice records</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search table, customer, invoice..."
                  className="w-full rounded-full border bg-background pl-9 pr-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full text-xs">
                {(["all", "pending", "paid", "cash", "card", "upi"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-3 py-1 rounded-full font-semibold capitalize transition ${
                      filter === tab
                        ? "gradient-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Invoices Table */}
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
                  <th className="p-3 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No invoices found matching criteria.
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
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          {p.payment_category === "cash" ? (
                            <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                          ) : p.payment_category === "card" ? (
                            <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <Smartphone className="h-3.5 w-3.5 text-purple-600" />
                          )}
                          {p.payment_method}
                        </span>
                      </td>
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
                          {p.status === "paid" ? "✓ Paid" : "Pending Verification"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {p.status === "pending_verification" ? (
                          <button
                            onClick={() => handleVerify(p)}
                            className="bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg hover:bg-emerald-600 transition"
                          >
                            Verify & Mark Paid
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Verified by {p.verified_by || "Staff"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
