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

  // Animation Variants for Hero Image, Logo, Transparent Glass Panel, and Inputs
  const heroImageVariants: Variants = {
    hidden: { opacity: 0, scale: 1.05 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.7, ease: "easeOut" },
    },
  };

  const logoVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8, y: 14 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const transparentGlassVariants: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.09,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const buttonVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 12 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden flex flex-col justify-between items-center bg-background text-foreground select-none relative">
      {/* Keyframes & Motion Reductions */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .anim-ken-burns, .anim-shimmer-btn, .anim-blob-float-1, .anim-blob-float-2 {
            animation: none !important;
            transform: none !important;
          }
        }

        @keyframes kenBurnsSlow {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.05) translate(-6px, -3px); }
        }

        @keyframes shimmerGlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes blobFloat1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.6; }
          50% { transform: translate(16px, -20px) scale(1.15); opacity: 0.85; }
        }

        @keyframes blobFloat2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.5; }
          50% { transform: translate(-18px, 18px) scale(1.2); opacity: 0.8; }
        }

        .anim-ken-burns {
          animation: kenBurnsSlow 14s ease-in-out infinite;
        }

        .anim-shimmer-btn {
          background-size: 200% 200%;
          animation: shimmerGlow 6s ease infinite;
        }

        .anim-blob-float-1 {
          animation: blobFloat1 8s ease-in-out infinite;
        }

        .anim-blob-float-2 {
          animation: blobFloat2 10s ease-in-out infinite 1s;
        }
      `}</style>

      {/* MOBILE APP CONTAINER SHELL (320px - 480px Responsive) */}
      <div className="w-full max-w-[430px] min-h-[100dvh] mx-auto flex flex-col justify-between relative z-10 overflow-x-hidden">
        
        {/* TOP RESTAURANT IMAGE HEADER - FULLY VISIBLE & FITTED */}
        <div className="relative w-full h-[36vh] min-h-[220px] max-h-[290px] overflow-hidden flex flex-col justify-end">
          <motion.img
            variants={heroImageVariants}
            initial="hidden"
            animate="visible"
            src="/customer-dining-bg.jpg"
            alt="ScanDine Restaurant Dining"
            className="absolute inset-0 w-full h-full object-cover object-center anim-ken-burns"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/40" />

          {/* Floating Badges inside Hero Section */}
          <div className="absolute top-3.5 left-3.5 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/40 text-white backdrop-blur-md border border-white/20 shadow-sm">
            <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
            <span>Smart Dining</span>
          </div>

          <div className="absolute top-3.5 right-3.5 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/85 text-white backdrop-blur-md shadow-sm border border-orange-400/30">
            <UtensilsCrossed className="h-3 w-3" />
            <span>Instant Ordering</span>
          </div>

          {/* ScanDine Brand Header Overlaid with Logo Entrance & Floating Motion */}
          <div className="relative z-10 text-center pb-12 px-3">
            <motion.div variants={logoVariants} initial="hidden" animate="visible" className="flex flex-col items-center">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block"
              >
                <Link to="/" className="inline-block mb-0.5">
                  <motion.img
                    whileHover={{ scale: 1.08 }}
                    src="/scandine-customer-logo.png"
                    alt="ScanDine"
                    className="h-11 sm:h-13 w-auto object-contain mx-auto drop-shadow-lg dark:brightness-110 dark:drop-shadow-[0_0_14px_rgba(255,255,255,0.3)]"
                  />
                </Link>
              </motion.div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                Scan<span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">Dine</span>
              </h1>
              <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/90 drop-shadow-xs">
                SCAN • ORDER • DINE
              </div>
            </motion.div>
          </div>
        </div>

        {/* ANIMATED FLOATING LIGHT/ORANGE BLOBS (DIFFUSING THROUGH TRANSPARENT GLASS) */}
        <div className="absolute top-[28vh] left-2 w-52 h-52 rounded-full bg-gradient-to-tr from-orange-500/40 via-amber-500/30 to-transparent blur-2xl anim-blob-float-1 pointer-events-none z-10" />
        <div className="absolute bottom-6 right-2 w-56 h-56 rounded-full bg-gradient-to-br from-amber-500/35 via-orange-600/30 to-transparent blur-2xl anim-blob-float-2 pointer-events-none z-10" />

        {/* FULLY TRANSPARENT GLASSMORPHISM REGISTRATION SURFACE (BLENDS WITH BACKGROUND & HERO IMAGE) */}
        <motion.div
          variants={transparentGlassVariants}
          initial="hidden"
          animate="visible"
          className="relative -mt-10 z-20 flex-1 w-full rounded-t-[2.25rem] bg-gradient-to-b from-orange-500/10 via-background/40 to-background/60 dark:from-orange-950/20 dark:via-background/30 dark:to-background/50 backdrop-blur-[26px] border-t border-white/40 dark:border-white/15 p-4 sm:p-5 shadow-[0_-20px_50px_rgba(0,0,0,0.3)] flex flex-col justify-between overflow-hidden"
        >
          {/* Inner Top Specular Highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/80 dark:via-white/50 to-transparent rounded-t-[2.25rem]" />

          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full flex-1 flex flex-col justify-between relative z-10">
            <div>
              {/* Header Text (Item 1) */}
              <motion.div variants={itemVariants} className="text-center mb-2.5">
                <h2 className="font-display text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                  {mode === "customer" ? "Customer Sign In" : "Staff Access Sign In"}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium leading-tight mt-0.5 max-w-xs mx-auto">
                  {mode === "customer"
                    ? "Enter your details to view menu and start ordering."
                    : "Sign in for Admin, Kitchen, or Reception portal."}
                </p>
              </motion.div>

              {/* Dual Portal Mode Switcher Tabs */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-1 p-1 bg-muted/70 backdrop-blur-md rounded-xl mb-3 border border-border/80 relative">
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleCustomerLogin}
                    className="space-y-2.5"
                  >
                    {/* Full Name Field (Translucent Glass Input Control) */}
                    <motion.div variants={itemVariants}>
                      <label htmlFor="cust-login-name" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                        Full Name <span className="text-orange-500">*</span>
                      </label>
                      <div className="group relative flex items-center gap-2.5 p-1 rounded-2xl border border-white/30 dark:border-white/15 bg-white/35 dark:bg-black/30 backdrop-blur-md transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background/85 focus-within:ring-4 focus-within:ring-orange-500/25 focus-within:scale-[1.01] shadow-[0_4px_16px_rgba(249,115,22,0.12)]">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-500 backdrop-blur-xs flex items-center justify-center group-focus-within:bg-orange-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
                          <User className="h-4 w-4" />
                        </div>
                        <input
                          id="cust-login-name"
                          name="name"
                          type="text"
                          required
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          placeholder="Enter your name"
                          className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[42px]"
                        />
                      </div>
                    </motion.div>

                    {/* Phone Field (Translucent Glass Input Control) */}
                    <motion.div variants={itemVariants}>
                      <label htmlFor="cust-login-phone" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                        Mobile Phone Number <span className="text-orange-500">*</span>
                      </label>
                      <div className="group relative flex items-center gap-2.5 p-1 rounded-2xl border border-white/30 dark:border-white/15 bg-white/35 dark:bg-black/30 backdrop-blur-md transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background/85 focus-within:ring-4 focus-within:ring-orange-500/25 focus-within:scale-[1.01] shadow-[0_4px_16px_rgba(249,115,22,0.12)]">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-500 backdrop-blur-xs flex items-center justify-center group-focus-within:bg-orange-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
                          <Phone className="h-4 w-4" />
                        </div>
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
                          className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[42px]"
                        />
                      </div>
                    </motion.div>

                    {/* Email Field (Translucent Glass Input Control) */}
                    <motion.div variants={itemVariants}>
                      <label htmlFor="cust-login-email" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                        Email Address <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                      </label>
                      <div className="group relative flex items-center gap-2.5 p-1 rounded-2xl border border-white/30 dark:border-white/15 bg-white/35 dark:bg-black/30 backdrop-blur-md transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background/85 focus-within:ring-4 focus-within:ring-orange-500/25 focus-within:scale-[1.01] shadow-[0_4px_16px_rgba(249,115,22,0.12)]">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-500 backdrop-blur-xs flex items-center justify-center group-focus-within:bg-orange-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          id="cust-login-email"
                          name="email"
                          type="email"
                          value={custEmail}
                          onChange={(e) => setCustEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[42px]"
                        />
                      </div>
                    </motion.div>

                    {/* Start Ordering Button (Translucent Shimmer Glass CTA) */}
                    <motion.div variants={buttonVariants} className="pt-1">
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-2xl bg-orange-500/40 blur-md transition-all duration-300 group-hover:bg-orange-500/55" />

                        <motion.button
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.97 }}
                          type="submit"
                          disabled={loading}
                          className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all duration-300 active:scale-[0.97] disabled:opacity-80 cursor-pointer min-h-[46px] sm:min-h-[48px] anim-shimmer-btn z-10 border border-white/30"
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
                      </div>
                    </motion.div>
                  </motion.form>
                ) : (
                  /* STAFF FORM MODE */
                  <motion.form
                    key="staff-form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleStaffLogin}
                    className="space-y-2.5"
                  >
                    <div className="grid grid-cols-3 gap-1 p-1 bg-muted/70 backdrop-blur-md rounded-lg mb-2 border border-border/80 relative">
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
                      <label htmlFor="staff-login-email" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                        Staff Email / ID
                      </label>
                      <div className="group relative flex items-center gap-2.5 p-1 rounded-2xl border border-white/30 dark:border-white/15 bg-white/35 dark:bg-black/30 backdrop-blur-md transition-all duration-300 focus-within:border-amber-500 focus-within:bg-background/85 focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:scale-[1.015] shadow-xs">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 backdrop-blur-xs flex items-center justify-center group-focus-within:bg-amber-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          id="staff-login-email"
                          name="email"
                          type="text"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={`e.g. ${role}@restaurant.com`}
                          className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[42px]"
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label htmlFor="staff-login-password" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                        Password
                      </label>
                      <div className="group relative flex items-center gap-2.5 p-1 rounded-2xl border border-white/30 dark:border-white/15 bg-white/35 dark:bg-black/30 backdrop-blur-md transition-all duration-300 focus-within:border-amber-500 focus-within:bg-background/85 focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:scale-[1.015] shadow-xs">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 backdrop-blur-xs flex items-center justify-center group-focus-within:bg-amber-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <input
                          id="staff-login-password"
                          name="password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[42px]"
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={buttonVariants} className="pt-1">
                      <motion.button
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_10px_25px_-5px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_14px_30px_-5px_rgba(245,158,11,0.5)] active:scale-[0.97] disabled:opacity-80 cursor-pointer min-h-[46px] sm:min-h-[48px]"
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
                    </motion.div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Copyright */}
            <motion.footer
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-3 text-center text-[10px] sm:text-[11px] text-muted-foreground font-medium"
            >
              © 2026 Renechip Private Limited. All Rights Reserved.
            </motion.footer>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
