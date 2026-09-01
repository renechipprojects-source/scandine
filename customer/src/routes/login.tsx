import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Mail,
  ShieldCheck,
  ChefHat,
  Building2,
  ArrowRight,
  Loader2,
  KeyRound,
  User,
  Phone,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { customerStore } from "@/lib/customer-store";
import { useTable } from "@/lib/table-store";

export const Route = createFileRoute("/login")({
  component: CustomerLoginPortal,
  head: () => ({
    meta: [
      { title: "Portal Sign In · ScanDine Food-Tech" },
      { name: "description", content: "Customer and Staff Portal Sign In for ScanDine Smart Dining Platform" },
    ],
  }),
});

function CustomerLoginPortal() {
  const navigate = useNavigate();
  const tableNumber = useTable();

  // Mode: "customer" vs "staff"
  const [mode, setMode] = useState<"customer" | "staff">("customer");

  // Staff state
  const [role, setRole] = useState<"admin" | "kitchen" | "reception">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Customer state
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your staff email or username.");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter your password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success(`Signed in successfully as ${role.toUpperCase()} Staff!`);
      if (role === "admin") {
        navigate({ to: "/admin" });
      } else if (role === "kitchen") {
        navigate({ to: "/kitchen" });
      } else {
        navigate({ to: "/reception" });
      }
    }, 600);
  };

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = custName.trim();
    const digitsPhone = custPhone.trim().replace(/\D/g, "");

    if (!trimmedName) {
      toast.error("Please enter your Full Name.");
      return;
    }
    if (!digitsPhone || digitsPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      await customerStore.registerCustomer({
        fullName: trimmedName,
        phone: digitsPhone,
        email: custEmail.trim(),
        tableNumber: tableNumber || "Table 1",
      });
      toast.success(`Welcome back, ${trimmedName}! Signed in to ScanDine.`);
      navigate({ to: "/menu" });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden flex flex-col justify-center items-center px-4 py-4 sm:px-5 sm:py-6 bg-background text-foreground select-none">
      {/* MAIN DOMINANT MOBILE REGISTRATION CONTAINER */}
      <main className="w-full max-w-[430px] mx-auto my-auto flex flex-col flex-1 rounded-3xl bg-card border border-border/80 p-4 sm:p-5 shadow-xl shadow-black/5 dark:shadow-black/30 overflow-hidden relative z-10">
        
        {/* COMPACT RESTAURANT FOOD BANNER INSIDE CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative w-full h-28 sm:h-32 rounded-2xl overflow-hidden mb-3.5 border border-border/60 shadow-xs flex items-center justify-center text-center p-3"
        >
          {/* Restaurant Food Image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url('/customer-dining-bg.jpg')` }}
          />
          {/* Overlay Gradient for Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-black/50" />

          {/* Overlaid Logo & Title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="relative z-10 flex flex-col items-center"
          >
            <Link to="/" className="inline-block mb-0.5">
              <motion.img
                whileHover={{ scale: 1.06 }}
                src="/scandine-customer-logo.png"
                alt="ScanDine"
                className="h-10 sm:h-12 w-auto object-contain mx-auto drop-shadow-md dark:brightness-110 dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
              />
            </Link>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">
              Scan<span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">Dine</span>
            </h1>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/90 drop-shadow-xs">
              SCAN • ORDER • DINE
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full flex-1 flex flex-col justify-between">
          <div>
            {/* Header Text */}
            <motion.div variants={itemVariants} className="text-center mb-3">
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                {mode === "customer" ? "Customer Sign In" : "Staff Access Sign In"}
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium leading-tight mt-0.5 max-w-xs mx-auto">
                {mode === "customer"
                  ? "Enter your details to view menu and start ordering."
                  : "Sign in for Admin, Kitchen, or Reception portal."}
              </p>
            </motion.div>

            {/* Mode Switcher Tabs */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-1 p-1 bg-muted/80 rounded-xl mb-3 border border-border/80 relative">
              <button
                type="button"
                onClick={() => setMode("customer")}
                className={`relative z-10 py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "customer"
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "customer" && (
                  <motion.span
                    layoutId="portal-tab-pill"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 shadow-xs -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <UtensilsCrossed className="h-3.5 w-3.5" /> Customer Portal
              </button>

              <button
                type="button"
                onClick={() => setMode("staff")}
                className={`relative z-10 py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "staff"
                    ? "text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "staff" && (
                  <motion.span
                    layoutId="portal-tab-pill"
                    className="absolute inset-0 rounded-lg bg-foreground shadow-xs -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Staff Access
              </button>
            </motion.div>

            {/* CUSTOMER FORM MODE */}
            <AnimatePresence mode="wait">
              {mode === "customer" ? (
                <motion.form
                  key="customer-form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleCustomerLogin}
                  className="space-y-3"
                >
                  <motion.div variants={itemVariants}>
                    <label htmlFor="cust-login-name" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-1">
                      Full Name <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative flex items-center rounded-xl border border-border bg-muted/30 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-border/80">
                      <User className="absolute left-3.5 h-4 w-4 text-muted-foreground transition-colors" />
                      <input
                        id="cust-login-name"
                        name="name"
                        type="text"
                        required
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[44px] sm:min-h-[46px]"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="cust-login-phone" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-1">
                      Mobile Phone Number <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative flex items-center rounded-xl border border-border bg-muted/30 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-border/80">
                      <Phone className="absolute left-3.5 h-4 w-4 text-muted-foreground transition-colors" />
                      <input
                        id="cust-login-phone"
                        name="phone"
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        required
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit mobile number"
                        className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[44px] sm:min-h-[46px]"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="cust-login-email" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-1">
                      Email Address <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                    </label>
                    <div className="relative flex items-center rounded-xl border border-border bg-muted/30 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-border/80">
                      <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground transition-colors" />
                      <input
                        id="cust-login-email"
                        name="email"
                        type="email"
                        value={custEmail}
                        onChange={(e) => setCustEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[44px] sm:min-h-[46px]"
                      />
                    </div>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-[0_10px_25px_-5px_rgba(249,115,22,0.4)] transition-all duration-300 hover:shadow-[0_14px_30px_-5px_rgba(249,115,22,0.5)] active:scale-[0.99] disabled:opacity-80 cursor-pointer min-h-[48px] sm:min-h-[50px]"
                    style={{ backgroundImage: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #f59e0b 100%)" }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Starting Guest Session…
                      </>
                    ) : (
                      <>
                        Start Ordering <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              ) : (
                /* STAFF FORM MODE */
                <motion.form
                  key="staff-form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleStaffLogin}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-3 gap-1 p-1 bg-muted/80 rounded-lg mb-2 border border-border/80 relative">
                    <button
                      type="button"
                      onClick={() => setRole("admin")}
                      className={`relative z-10 py-1.5 px-1.5 rounded-md text-[10px] sm:text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        role === "admin" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {role === "admin" && (
                        <motion.span
                          layoutId="role-tab-pill"
                          className="absolute inset-0 rounded-md bg-amber-500/20 border border-amber-500/30 -z-10"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <ShieldCheck className="h-3.5 w-3.5" /> Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("kitchen")}
                      className={`relative z-10 py-1.5 px-1.5 rounded-md text-[10px] sm:text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        role === "kitchen" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {role === "kitchen" && (
                        <motion.span
                          layoutId="role-tab-pill"
                          className="absolute inset-0 rounded-md bg-emerald-500/20 border border-emerald-500/30 -z-10"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <ChefHat className="h-3.5 w-3.5" /> Kitchen
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("reception")}
                      className={`relative z-10 py-1.5 px-1.5 rounded-md text-[10px] sm:text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        role === "reception" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {role === "reception" && (
                        <motion.span
                          layoutId="role-tab-pill"
                          className="absolute inset-0 rounded-md bg-blue-500/20 border border-blue-500/30 -z-10"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <Building2 className="h-3.5 w-3.5" /> Reception
                    </button>
                  </div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="staff-login-email" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-1">
                      Staff Email / ID
                    </label>
                    <div className="relative flex items-center rounded-xl border border-border bg-muted/30 transition-all duration-300 focus-within:border-amber-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-amber-500/20 hover:border-border/80">
                      <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground transition-colors" />
                      <input
                        id="staff-login-email"
                        name="email"
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={`e.g. ${role}@restaurant.com`}
                        className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[44px] sm:min-h-[46px]"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="staff-login-password" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-1">
                      Password
                    </label>
                    <div className="relative flex items-center rounded-xl border border-border bg-muted/30 transition-all duration-300 focus-within:border-amber-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-amber-500/20 hover:border-border/80">
                      <KeyRound className="absolute left-3.5 h-4 w-4 text-muted-foreground transition-colors" />
                      <input
                        id="staff-login-password"
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[44px] sm:min-h-[46px]"
                      />
                    </div>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 rounded-xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_10px_25px_-5px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_14px_30px_-5px_rgba(245,158,11,0.5)] active:scale-[0.99] disabled:opacity-80 cursor-pointer min-h-[48px] sm:min-h-[50px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Authenticating Staff…
                      </>
                    ) : (
                      <>
                        Sign In to Staff Portal <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Copyright */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-center text-[10px] sm:text-[11px] text-muted-foreground font-medium"
          >
            © 2026 Renechip Private Limited. All Rights Reserved.
          </motion.footer>
        </motion.div>
      </main>
    </div>
  );
}
