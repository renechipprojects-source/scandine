import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Wallet, Smartphone, Banknote, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { CustomerNav } from "@/components/customer-nav";
import { cart } from "@/lib/cart-store";
import { tableStore, useTable } from "@/lib/table-store";
import { customerStore } from "@/lib/customer-store";
import {
  getOrderById,
  updateOrderPayment,
  notifyKitchenOrderPaid,
  notifyReceptionAdminPayment,
  subscribeToOrdersBySession,
  type DbOrder,
} from "@/lib/supabase";
import { paymentStore, useLivePayments } from "@/lib/payment-store";
import { toast } from "sonner";

const methods = [
  { id: "upi", label: "UPI / Online Payment", icon: Smartphone, sub: "Pay via GPay, PhonePe, Paytm, Cards & Netbanking" },
  { id: "cash", label: "Cash at Counter", icon: Banknote, sub: "Pay cash directly to restaurant staff" },
];

export const Route = createFileRoute("/payment")({ component: Payment });

import { CustomerRegistration } from "@/components/customer-registration";

function Payment() {
  const tableNumber = useTable();
  const search = useSearch({ strict: false }) as { orderId?: string };
  const activeId = search.orderId || cart.getActiveOrderId();

  const [order, setOrder] = useState<DbOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState("upi");
  const [gstRate, setGstRateState] = useState(5);
  
  const savedCustomer = customerStore.getCustomer(tableNumber);
  const [custName, setCustName] = useState(savedCustomer?.fullName || "");
  const [custPhone, setCustPhone] = useState(savedCustomer?.phone || "");
  const [custEmail, setCustEmail] = useState(savedCustomer?.email || "");

  const [state, setState] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const nav = useNavigate();

  useEffect(() => {
    const handleGstUpdate = () => {
      const stored = localStorage.getItem("sd_gst_rate");
      if (stored) {
        const val = Number(stored);
        if (!isNaN(val) && val >= 0) setGstRateState(val);
      }
    };
    handleGstUpdate();
    window.addEventListener("sd_gst_rate_updated", handleGstUpdate);
    return () => window.removeEventListener("sd_gst_rate_updated", handleGstUpdate);
  }, []);

  if (!savedCustomer) {
    return (
      <CustomerRegistration
        tableNumber={tableNumber}
        onSuccess={() => {}}
      />
    );
  }

  useEffect(() => {
    if (savedCustomer) {
      if (!custName && savedCustomer.fullName) setCustName(savedCustomer.fullName);
      if (!custPhone && savedCustomer.phone) setCustPhone(savedCustomer.phone);
      if (!custEmail && savedCustomer.email) setCustEmail(savedCustomer.email);
    }
  }, [savedCustomer]);

  useEffect(() => {
    let unsubscribe = () => {};

    async function load() {
      if (!activeId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await getOrderById(activeId, savedCustomer?.sessionId);
      if (data) {
        const items = data.items || [];
        const calcSubtotal = data.subtotal && data.subtotal > 0
          ? data.subtotal
          : (items.length > 0 ? items.reduce((s, i) => s + i.price * i.qty, 0) : 0);
        const calcGst = data.gst !== undefined && data.gst >= 0
          ? data.gst
          : Number((calcSubtotal * (gstRate / 100)).toFixed(2));
        const calcTotal = data.total !== undefined && data.total > 0
          ? data.total
          : Number((calcSubtotal + calcGst).toFixed(2));

        setOrder({
          ...data,
          subtotal: calcSubtotal,
          gst: calcGst,
          total: calcTotal,
        });
      } else {
        setOrder(null);
      }
      setLoading(false);

      if (savedCustomer?.sessionId) {
        unsubscribe = subscribeToOrdersBySession(
          savedCustomer.sessionId,
          (updatedOrder) => {
            setOrder((prev) => {
              if (!prev) return updatedOrder;
              const isMatch =
                prev.id === updatedOrder.id ||
                prev.order_number === updatedOrder.order_number ||
                prev.id === updatedOrder.order_number ||
                prev.order_number === updatedOrder.id;
              if (!isMatch) return prev;

              return {
                ...prev,
                ...updatedOrder,
                payment_status: updatedOrder.payment_status || prev.payment_status,
                payment_method: updatedOrder.payment_method || prev.payment_method,
              };
            });
          }
        );
      }
    }
    load();

    return () => {
      unsubscribe();
    };
  }, [activeId, gstRate, savedCustomer?.sessionId]);

  // Exact Order Calculations — order.total is single source of truth
  const invoiceItems = order?.items || [];

  const subtotal = order?.subtotal ?? (invoiceItems.length > 0 ? invoiceItems.reduce((s, i) => s + i.price * i.qty, 0) : 0);
  const gst = order?.gst !== undefined && order.gst >= 0
    ? order.gst
    : Number((subtotal * (gstRate / 100)).toFixed(2));
  const total = order?.total !== undefined && order.total > 0
    ? order.total
    : Number((subtotal + gst).toFixed(2));

  const tableName = order?.table_number ?? tableNumber;
  const orderNum = order?.order_number ?? (activeId ? `#${activeId.slice(-4)}` : "");

  const handlePaymentSubmission = async (
    payCategory: "upi" | "cash" | "card",
    payMethodName: string,
    transactionId: string,
    isAutoPaid: boolean
  ) => {
    const activeTable = order?.table_number || tableNumber;
    const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    if (isAutoPaid || payCategory === "cash") {
      if (order) {
        const updateSuccess = await updateOrderPayment(order.id, payMethodName, order.order_id);
        console.log("[PAYMENT DB UPDATE RESULT]", { orderId: order.id, secondaryId: order.order_id, updateSuccess });

        const freshOrder = await getOrderById(order.id);
        if (freshOrder) {
          setOrder(freshOrder);
        } else {
          setOrder((prev) => (prev ? { ...prev, payment: "paid", payment_status: "paid", payment_method: payMethodName } : null));
        }
      }
      await notifyKitchenOrderPaid(activeTable, orderNum || "#0000");
      setState("success");
      toast.success(`Payment Successful! Reference: ${invoiceId}`);
    } else {
      setState("pending_approval" as any);
      toast.info(`Payment submitted for Table ${activeTable}. Awaiting Reception verification.`);
    }
  };

  const pay = async () => {
    if (!custName.trim()) {
      toast.error("Please enter your Full Name.");
      return;
    }
    if (!custPhone.trim() || custPhone.trim().length < 10) {
      toast.error("Please enter a valid 10-digit Phone Number.");
      return;
    }

    // Cash at Counter Flow
    if (sel === "cash") {
      setState("processing");
      const transactionId = `TXN_CASH_${Date.now()}`;
      const payMethodName = "Cash at Counter";
      await handlePaymentSubmission("cash", payMethodName, transactionId, false);
      return;
    }

    // UPI / Online Payment Flow -> SECURE RAZORPAY CHECKOUT.JS (UPI INTENT FIRST)
    const finalTotal = Number(order?.total);

    if (!Number.isFinite(finalTotal) || finalTotal <= 0) {
      toast.error("Invalid order total. Cannot proceed with payment.");
      setState("idle");
      return;
    }

    setState("processing");
    toast.info("Initiating secure Razorpay checkout...");

    try {
      const backendBaseUrl = (
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_BACKEND_URL ||
        "http://localhost:5000"
      ).replace(/\/$/, "");

      // 1. Create Razorpay Order on Backend with order_id for server-side total validation
      const createOrderRes = await fetch(`${backendBaseUrl}/api/razorpay/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order?.id || activeId,
          amount: finalTotal, // in Rupees
          currency: "INR",
          receipt: `receipt_${orderNum ? orderNum.replace("#", "") : Date.now()}`,
        }),
      });

      const orderData = await createOrderRes.json();

      const formatError = (err: any): string => {
        if (!err) return "An unknown error occurred.";
        if (typeof err === "string") return err;
        if (typeof err.error === "string") return err.error;
        if (err.error && typeof err.error.description === "string") return err.error.description;
        if (err.description && typeof err.description === "string") return err.description;
        if (err.message && typeof err.message === "string") return err.message;
        try {
          return JSON.stringify(err);
        } catch {
          return String(err);
        }
      };

      if (!createOrderRes.ok || !orderData.success || !orderData.order_id) {
        const errorMsg = formatError(orderData.error || orderData);
        console.error("Razorpay order creation failed:", orderData);
        toast.error(`Order Creation Failed: ${errorMsg}`);
        setState("idle");
        return;
      }

      // 2. Critical Security Check: Verify returned amount in paise matches expected order total
      const expectedAmountPaise = Math.round(finalTotal * 100);
      if (orderData.amount !== expectedAmountPaise) {
        toast.error("Payment amount verification failed.");
        console.error("Amount Mismatch:", { expectedAmountPaise, receivedAmount: orderData.amount });
        setState("idle");
        return;
      }

      console.log("[RAZORPAY CHECKOUT INIT]", {
        orderNumber: orderNum,
        tableNumber: tableName,
        subtotal,
        gst,
        orderTotalInRupees: finalTotal,
        razorpayOrderId: orderData.order_id,
        razorpayAmountInPaise: orderData.amount,
        customerName: custName.trim(),
        customerPhone: custPhone.trim(),
        customerEmail: custEmail.trim() || undefined,
      });

      // Helper function to launch Razorpay Checkout modal
      const launchCheckout = () => {
        const keyId = orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TI7XNrxQP5GRTJ";

        const options = {
          key: keyId,
          amount: orderData.amount, // locked amount from backend order (paise)
          currency: orderData.currency || "INR",
          name: "ScanDine Restaurant",
          description: `Payment for Order ${orderNum || "#0000"} (${tableName})`,
          order_id: orderData.order_id,
          prefill: {
            name: custName.trim(),
            contact: custPhone.trim(),
            ...(custEmail.trim() ? { email: custEmail.trim() } : {}),
            method: "upi",
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: "Pay via UPI / QR",
                  instruments: [
                    {
                      method: "upi",
                    },
                  ],
                },
              },
              sequence: ["block.upi"],
              preferences: {
                show_default_blocks: true,
              },
            },
          },
          theme: {
            color: "#ea580c",
          },
          modal: {
            ondismiss: function () {
              toast.info("Payment process cancelled.");
              setState("idle");
            },
          },
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            try {
              setState("processing");
              toast.info("Verifying payment security signature...");

              // 3. Backend Signature Verification & Server-Side sd_orders Update
              const verifyRes = await fetch(`${backendBaseUrl}/api/razorpay/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  order_id: order?.id || activeId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();

              if (!verifyRes.ok || !verifyData.success) {
                const verifyErr = formatError(verifyData.message || verifyData.error || verifyData);
                toast.error(`Verification Failed: ${verifyErr}`);
                setState("failed");
                return;
              }

              // 4. Mark Order as Paid in Supabase DB & notify Kitchen/Reception
              const transactionId = response.razorpay_payment_id || `TXN_RZP_${Date.now()}`;
              const payMethodName = "Razorpay Online Payment (UPI / Cards)";
              await handlePaymentSubmission("upi", payMethodName, transactionId, true);
            } catch (err: any) {
              console.error("Verification error:", err);
              toast.error(`Error verifying payment signature: ${formatError(err)}`);
              setState("failed");
            }
          },
        };

        console.log("RAZORPAY CHECKOUT OPTIONS", {
          "order.total": finalTotal,
          "orderData.amount": orderData.amount,
          "orderData.order_id": orderData.order_id,
          "options.prefill": options.prefill,
          "options.config": options.config,
          fullOptions: options,
        });

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (resp: any) {
          const failReason = formatError(resp.error?.description || resp.error || "Transaction declined");
          toast.error(`Payment Failed: ${failReason}`);
          setState("failed");
        });
        rzp.open();
      };

      // Ensure Razorpay Checkout script is loaded
      if (typeof (window as any).Razorpay === "undefined") {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = launchCheckout;
        script.onerror = () => {
          toast.error("Failed to load Razorpay Checkout script. Check your connection.");
          setState("idle");
        };
        document.body.appendChild(script);
      } else {
        launchCheckout();
      }
    } catch (err: any) {
      console.error("Razorpay Checkout Error:", err);
      const catchErr = typeof err === "string" ? err : err?.message || JSON.stringify(err);
      toast.error(`Checkout Error: ${catchErr}`);
      setState("idle");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 overflow-x-hidden">
      <CustomerNav />
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{tableName} Checkout</div>
        <h1 className="font-display text-2.5xl sm:text-3xl md:text-4xl font-bold mt-0.5">Payment</h1>

        {loading ? (
          <div className="mt-8 text-center py-16 glass rounded-3xl">
            <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin mb-3" />
            <div className="font-semibold text-sm">Loading Order Invoice...</div>
          </div>
        ) : (
          <div className="mt-5 grid md:grid-cols-[1fr_320px] gap-5 md:gap-6">
            <div className="space-y-5">
              {/* Customer Contact Details Card */}
              <div className="glass rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm border border-primary/20">
                <div className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                  👤 Customer Contact Details
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="payment-cust-name" className="text-xs font-semibold text-muted-foreground block mb-1">
                      Full Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="payment-cust-name"
                      name="custName"
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label htmlFor="payment-cust-phone" className="text-xs font-semibold text-muted-foreground block mb-1">
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="payment-cust-phone"
                      name="custPhone"
                      type="tel"
                      required
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="payment-cust-email" className="text-xs font-semibold text-muted-foreground block mb-1">
                    Email Address <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <input
                    id="payment-cust-email"
                    name="custEmail"
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Simplified 2 Payment Options */}
              <div className="grid grid-cols-1 gap-3">
                {methods.map((m) => {
                  const on = sel === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSel(m.id)}
                      className={`relative text-left rounded-2xl border p-4 bg-card transition cursor-pointer ${on ? "border-primary shadow-float" : ""}`}
                    >
                      {on && <motion.span layoutId="pay-glow" className="absolute inset-0 rounded-2xl ring-2 ring-primary/40 pointer-events-none" />}
                      <div className="flex items-center gap-3.5">
                        <div className={`h-11 w-11 shrink-0 rounded-xl grid place-items-center ${on ? "gradient-primary text-white" : "bg-muted"}`}>
                          <m.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm sm:text-base truncate">{m.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{m.sub}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Invoice Breakdown Details */}
              <div className="rounded-3xl border bg-card p-4 sm:p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Invoice Details</div>
                {invoiceItems.length > 0 ? (
                  invoiceItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-b border-border/40 last:border-0">
                      <span className="text-muted-foreground truncate pr-2">{item.name} × {item.qty}</span>
                      <span className="font-medium shrink-0">₹{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-2">Order summary loaded</div>
                )}
                <div className="h-px bg-border my-3" />
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-muted-foreground">GST ({gstRate}%)</span>
                  <span className="font-medium">₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t font-bold">
                  <span>Grand Total</span>
                  <span className="text-gradient font-display text-lg sm:text-xl">₹{total.toFixed(2)}</span>
                </div>
                {order?.payment_status === "paid" && (
                  <div className="mt-3 bg-emerald-500/10 text-emerald-600 rounded-xl p-2.5 text-xs text-center font-semibold">
                    ✓ Paid via {order.payment_method?.toUpperCase() || "ONLINE"}
                  </div>
                )}
              </div>
            </div>

            {/* Pay Action Card */}
            <div className="glass rounded-3xl p-4 sm:p-5 h-fit shadow-glass md:sticky md:top-4 border border-primary/20">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Total Amount</div>
              <div className="text-3.5xl sm:text-4xl font-display font-bold text-gradient mt-0.5">₹{total.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{tableName} {orderNum ? `· Order ${orderNum}` : ""}</div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={pay}
                disabled={state === "processing" || order?.payment_status === "paid"}
                className="mt-4 w-full min-h-[52px] rounded-2xl gradient-primary text-white font-semibold py-3.5 px-4 text-base shadow-float disabled:opacity-75 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {order?.payment_status === "paid"
                  ? "Already Paid"
                  : state === "processing"
                  ? "Processing…"
                  : sel === "cash"
                  ? "Submit Cash Payment"
                  : `Pay ₹${total.toFixed(2)} with Razorpay`}
              </motion.button>
              <div className="mt-3 text-[10px] text-muted-foreground text-center">Secured with Razorpay SSL encryption</div>
            </div>
          </div>
        )}
      </div>

      {/* Status Overlay */}
      <AnimatePresence>
        {state !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="glass rounded-3xl p-6 sm:p-8 text-center max-w-sm w-full shadow-glass"
            >
              {state === "processing" && (
                <>
                  <Loader2 className="h-12 w-12 sm:h-14 sm:w-14 mx-auto text-primary animate-spin" />
                  <div className="font-display text-xl font-bold mt-4">Processing payment…</div>
                  <div className="text-xs text-muted-foreground mt-1">Connecting to Razorpay Payment Page</div>
                </>
              )}
              {state === "success" && (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                    <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500" />
                  </motion.div>
                  <div className="font-display text-xl font-bold mt-4">Payment submitted</div>
                  <div className="text-xs text-muted-foreground mt-1">₹{total.toFixed(2)} via {sel.toUpperCase()}</div>
                  <div className="mt-5 flex gap-2 justify-center">
                    <button onClick={() => nav({ to: "/feedback" })} className="rounded-full gradient-primary text-white text-sm font-semibold px-4 py-2">Rate your meal</button>
                    <button onClick={() => setState("idle")} className="rounded-full border text-sm font-semibold px-4 py-2">Close</button>
                  </div>
                </>
              )}
              {state === "failed" && (
                <>
                  <XCircle className="h-14 w-14 mx-auto text-destructive" />
                  <div className="font-display text-xl font-bold mt-4">Payment failed</div>
                  <div className="text-xs text-muted-foreground mt-1">Please try another method</div>
                  <button onClick={() => setState("idle")} className="mt-5 rounded-full gradient-primary text-white text-sm font-semibold px-6 py-2">Try again</button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


