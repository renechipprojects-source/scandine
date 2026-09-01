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
        staggerChildren: 0.06,
        delayChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden flex flex-col justify-center items-center px-3 py-3 sm:px-4 sm:py-6 relative select-none bg-background text-foreground [perspective:1000px]">
      {/* Keyframe Animations for Parallax Floating & Lighting */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .anim-float-hero, .anim-ambient-pulse, .anim-particle-float {
            animation: none !important;
            transform: none !important;
          }
        }

        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(0.5deg); }
        }

        @keyframes floatParticle1 {
          0%, 100% { transform: translate3d(0px, 0px, 0px) rotate(0deg); opacity: 0.4; }
          50% { transform: translate3d(12px, -18px, 0px) rotate(180deg); opacity: 0.75; }
        }
        @keyframes floatParticle2 {
          0%, 100% { transform: translate3d(0px, 0px, 0px) rotate(0deg); opacity: 0.35; }
          50% { transform: translate3d(-14px, 14px, 0px) rotate(-180deg); opacity: 0.7; }
        }

        @keyframes ambientPulse {
          0%, 100% { transform: scale(1); opacity: 0.35; filter: blur(45px); }
          50% { transform: scale(1.15); opacity: 0.65; filter: blur(60px); }
        }

        .anim-float-hero { animation: heroFloat 5.5s ease-in-out infinite; }
        .anim-particle-1 { animation: floatParticle1 10s ease-in-out infinite; }
        .anim-particle-2 { animation: floatParticle2 12s ease-in-out infinite 1s; }
        .anim-ambient-pulse { animation: ambientPulse 9s ease-in-out infinite; }
      `}</style>

      {/* Atmospheric Background Backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden w-full h-full">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-[2px] opacity-15 dark:opacity-20 scale-105"
          style={{ backgroundImage: `url('/customer-dining-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background/95 backdrop-blur-[2px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-transparent blur-3xl anim-ambient-pulse" />
      </div>

      {/* MOBILE-FIRST COMPACT CONTAINER */}
      <main className="w-full max-w-[390px] sm:max-w-md mx-auto my-auto relative z-10 flex flex-col items-center">
        {/* Floating Background Ambient Particles */}
        <div className="absolute -top-2 left-6 w-3 h-3 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 opacity-40 blur-[1px] anim-particle-1 pointer-events-none z-0" aria-hidden="true" />
        <div className="absolute -bottom-2 right-8 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 opacity-40 blur-[1px] anim-particle-2 pointer-events-none z-0" aria-hidden="true" />

        {/* COMPACT INTEGRATED GLASS CARD */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full rounded-3xl bg-card/90 dark:bg-card/80 backdrop-blur-2xl border border-border/80 p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* Top Specular Glass Edge Highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent rounded-t-3xl" />

          {/* INTEGRATED RESTAURANT FOOD HERO BANNER */}
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-full h-24 sm:h-28 rounded-2xl overflow-hidden mb-3.5 shadow-xs border border-border/60 group"
          >
            {/* Photorealistic Food & Restaurant Visual */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url('/customer-dining-bg.jpg')` }}
            />
            {/* Warm Gradient Overlay for Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-orange-950/30 via-transparent to-amber-950/30" />

            {/* Overlaid Logo & Restaurant Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center z-10">
              <Link to="/" className="inline-block group/logo">
                <motion.img
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.25 }}
                  src="/scandine-customer-logo.png"
                  alt="ScanDine"
                  className="h-9 sm:h-11 w-auto object-contain mx-auto drop-shadow-lg dark:brightness-110 dark:drop-shadow-[0_0_14px_rgba(255,255,255,0.25)]"
                />
              </Link>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-background/90 dark:bg-card/90 text-primary border border-primary/20 backdrop-blur-md shadow-xs mt-1">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-pulse" />
                <span>Smart Dining Portal</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full">
            {/* Header Text */}
            <motion.div variants={itemVariants} className="text-center mb-3">
              <h1 className="font-display text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                {mode === "customer" ? "Customer Sign In" : "Staff Access Sign In"}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium leading-tight mt-0.5">
                {mode === "customer"
                  ? "Sign in to save table sessions, view rewards & order history."
                  : "Staff access for Admin, Kitchen, and Reception modules."}
              </p>
            </motion.div>

            {/* Dual Portal Switcher Tabs */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-1 p-1 bg-muted/80 rounded-xl mb-2.5 border border-border/80 relative">
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
                <UtensilsCrossed className="h-3 w-3" /> Customer Portal
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
                <ShieldCheck className="h-3 w-3 text-amber-400" /> Staff Access
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
                  className="space-y-2"
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
                        className="w-full bg-transparent pl-9 pr-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[38px] sm:min-h-[40px]"
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
                        className="w-full bg-transparent pl-9 pr-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[38px] sm:min-h-[40px]"
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
                        className="w-full bg-transparent pl-9 pr-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[38px] sm:min-h-[40px]"
                      />
                    </div>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 sm:py-3 text-xs font-bold text-white shadow-[0_8px_20px_-4px_rgba(249,115,22,0.4)] transition-all duration-300 hover:shadow-[0_12px_26px_-4px_rgba(249,115,22,0.5)] active:scale-[0.99] disabled:opacity-80 cursor-pointer min-h-[40px] sm:min-h-[42px]"
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
                  className="space-y-2"
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
                        className="w-full bg-transparent pl-9 pr-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[38px] sm:min-h-[40px]"
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
                        className="w-full bg-transparent pl-9 pr-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[38px] sm:min-h-[40px]"
                      />
                    </div>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full mt-1 rounded-xl px-4 py-2.5 sm:py-3 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_12px_26px_-4px_rgba(245,158,11,0.5)] active:scale-[0.99] disabled:opacity-80 cursor-pointer min-h-[40px] sm:min-h-[42px]"
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
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-2 text-center text-[10px] sm:text-[11px] text-muted-foreground font-medium"
        >
          © 2026 Renechip Private Limited. All Rights Reserved.
        </motion.footer>
      </main>
    </div>
  );
}
