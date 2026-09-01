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
      transition: { duration: 0.28, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden flex flex-col items-center justify-between relative bg-background text-foreground select-none">
      {/* Background Lighting & Particles */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden w-full h-full">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[400px] bg-gradient-to-b from-orange-500/15 via-amber-500/10 to-transparent blur-3xl" />
      </div>

      {/* MOBILE APP VIEWPORT CONTAINER (320px - 430px Responsive Shell) */}
      <div className="w-full max-w-[430px] min-h-[100dvh] mx-auto flex flex-col justify-between relative z-10 overflow-x-hidden">
        
        {/* TOP IMMERSIVE RESTAURANT HERO VISUAL (40% Viewport Height) */}
        <motion.div
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full h-[36vh] min-h-[210px] max-h-[280px] rounded-b-[2.25rem] overflow-hidden shadow-lg border-b border-border/40"
        >
          {/* Photorealistic Restaurant Image Background */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
            style={{ backgroundImage: `url('/customer-dining-bg.jpg')` }}
          />

          {/* Luxury Atmosphere Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-black/40" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(249,115,22,0.25),transparent_60%)]" />

          {/* Floating Food Badges Over Image */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/45 text-white backdrop-blur-md border border-white/20 shadow-md"
          >
            <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
            <span>Smart Dining Portal</span>
          </motion.div>

          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-9 right-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/85 text-white backdrop-blur-md shadow-md border border-orange-400/30"
          >
            <UtensilsCrossed className="h-3 w-3" />
            <span>Instant Ordering</span>
          </motion.div>

          {/* Center Brand Header Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 pt-2">
            <Link to="/" className="inline-block group mb-1">
              <motion.img
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.25 }}
                src="/scandine-customer-logo.png"
                alt="ScanDine"
                className="h-11 sm:h-13 w-auto object-contain mx-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] dark:brightness-110 dark:drop-shadow-[0_0_16px_rgba(255,255,255,0.3)]"
              />
            </Link>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
              Scan<span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">Dine</span>
            </h1>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em] text-white/90 drop-shadow-xs mt-0.5">
              SCAN • ORDER • DINE
            </div>
          </div>
        </motion.div>

        {/* BOTTOM INTEGRATED SHEET SURFACE (Form Container) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative -mt-6 z-20 flex-1 w-full rounded-t-[2.25rem] bg-card/95 dark:bg-card/85 backdrop-blur-2xl border-t border-border/80 px-4 py-4 sm:px-5 sm:py-5 shadow-[0_-15px_40px_rgba(0,0,0,0.15)] flex flex-col justify-between"
        >
          {/* Top Glass Edge Specular Highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent rounded-t-[2.25rem]" />

          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full">
            {/* Header Title */}
            <motion.div variants={itemVariants} className="text-center mb-3">
              <h2 className="font-display text-base sm:text-lg font-bold text-foreground tracking-tight">
                {mode === "customer" ? "Sign In & Order" : "Staff Access Sign In"}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium leading-tight mt-0.5 max-w-xs mx-auto">
                {mode === "customer"
                  ? "Enter your details to view menu and place instant orders."
                  : "Sign in for Admin, Kitchen, or Reception portal."}
              </p>
            </motion.div>

            {/* Dual Mode Switcher Tabs */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-1 p-1 bg-muted/80 rounded-xl mb-3 border border-border/80 relative">
              <button
                type="button"
                onClick={() => setMode("customer")}
                className={`relative z-10 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                className={`relative z-10 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleCustomerLogin}
                  className="space-y-2.5"
                >
                  <motion.div variants={itemVariants}>
                    <label htmlFor="cust-login-name" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                      Full Name <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative flex items-center rounded-xl border border-border bg-muted/40 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-border/80">
                      <User className="absolute left-3 h-3.5 w-3.5 text-muted-foreground transition-colors" />
                      <input
                        id="cust-login-name"
                        name="name"
                        type="text"
                        required
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-transparent pl-9 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[40px]"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="cust-login-phone" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                      Mobile Phone Number <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative flex items-center rounded-xl border border-border bg-muted/40 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-border/80">
                      <Phone className="absolute left-3 h-3.5 w-3.5 text-muted-foreground transition-colors" />
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
                        className="w-full bg-transparent pl-9 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[40px]"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="cust-login-email" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                      Email Address <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                    </label>
                    <div className="relative flex items-center rounded-xl border border-border bg-muted/40 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-border/80">
                      <Mail className="absolute left-3 h-3.5 w-3.5 text-muted-foreground transition-colors" />
                      <input
                        id="cust-login-email"
                        name="email"
                        type="email"
                        value={custEmail}
                        onChange={(e) => setCustEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full bg-transparent pl-9 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[40px]"
                      />
                    </div>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-xs font-bold text-white shadow-[0_8px_20px_-4px_rgba(249,115,22,0.4)] transition-all duration-300 hover:shadow-[0_12px_26px_-4px_rgba(249,115,22,0.5)] active:scale-[0.99] disabled:opacity-80 cursor-pointer min-h-[42px]"
                    style={{ backgroundImage: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #f59e0b 100%)" }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Starting Guest Session…
                      </>
                    ) : (
                      <>
                        Sign In & View Menu <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              ) : (
                /* STAFF FORM MODE */
                <motion.form
                  key="staff-form"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleStaffLogin}
                  className="space-y-2.5"
                >
                  {/* Role Selection inside Staff Mode */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-muted/80 rounded-lg mb-2 border border-border/80 relative">
                    <button
                      type="button"
                      onClick={() => setRole("admin")}
                      className={`relative z-10 py-1 px-1.5 rounded-md text-[10px] sm:text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
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
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("kitchen")}
                      className={`relative z-10 py-1 px-1.5 rounded-md text-[10px] sm:text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
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
                      <ChefHat className="h-3 w-3" /> Kitchen
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("reception")}
                      className={`relative z-10 py-1 px-1.5 rounded-md text-[10px] sm:text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
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
                      <Building2 className="h-3 w-3" /> Reception
                    </button>
                  </div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="staff-login-email" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                      Staff Email / ID
                    </label>
                    <div className="relative flex items-center rounded-xl border border-border bg-muted/40 transition-all duration-300 focus-within:border-amber-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-amber-500/20 hover:border-border/80">
                      <Mail className="absolute left-3 h-3.5 w-3.5 text-muted-foreground transition-colors" />
                      <input
                        id="staff-login-email"
                        name="email"
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={`e.g. ${role}@restaurant.com`}
                        className="w-full bg-transparent pl-9 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[40px]"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="staff-login-password" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                      Password
                    </label>
                    <div className="relative flex items-center rounded-xl border border-border bg-muted/40 transition-all duration-300 focus-within:border-amber-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-amber-500/20 hover:border-border/80">
                      <KeyRound className="absolute left-3 h-3.5 w-3.5 text-muted-foreground transition-colors" />
                      <input
                        id="staff-login-password"
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent pl-9 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[40px]"
                      />
                    </div>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full mt-1 rounded-xl px-4 py-3 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_12px_26px_-4px_rgba(245,158,11,0.5)] active:scale-[0.99] disabled:opacity-80 cursor-pointer min-h-[42px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Authenticating Staff…
                      </>
                    ) : (
                      <>
                        Sign In to Staff Portal <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer Copyright */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 text-center text-[10px] text-muted-foreground font-medium"
          >
            © 2026 Renechip Private Limited. All Rights Reserved.
          </motion.footer>
        </motion.div>
      </div>
    </div>
  );
}
