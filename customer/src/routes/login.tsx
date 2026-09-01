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

  // Animation Variants for Lower Surface & Staggered Elements
  const heroImageVariants: Variants = {
    hidden: { opacity: 0, scale: 1.08 },
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

  const surfaceVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.09,
        delayChildren: 0.15,
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
      {/* Keyframe Animations Styles */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .anim-ken-burns, .anim-shimmer-btn, .anim-logo-float, .anim-particle-glow {
            animation: none !important;
            transform: none !important;
          }
        }

        @keyframes kenBurnsSlow {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.06) translate(-8px, -4px); }
        }

        @keyframes shimmerGlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes particleGlow {
          0%, 100% { opacity: 0.35; transform: translateY(0px) scale(1); }
          50% { opacity: 0.8; transform: translateY(-5px) scale(1.12); }
        }

        .anim-ken-burns {
          animation: kenBurnsSlow 14s ease-in-out infinite;
        }

        .anim-shimmer-btn {
          background-size: 200% 200%;
          animation: shimmerGlow 6s ease infinite;
        }

        .anim-particle-glow {
          animation: particleGlow 4s ease-in-out infinite;
        }
      `}</style>

      {/* Background Ambient Warm Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden w-full h-full">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-full max-w-md h-[300px] bg-gradient-to-b from-orange-500/15 via-amber-500/10 to-transparent blur-3xl" />
      </div>

      {/* MOBILE APP CONTAINER SHELL (320px - 430px Responsive) */}
      <div className="w-full max-w-[430px] min-h-[100dvh] mx-auto flex flex-col justify-between relative z-10 overflow-x-hidden">
        
        {/* TOP RESTAURANT IMAGE HEADER (PRESERVED AS SATISFACTORY) */}
        <div className="relative w-full h-[32vh] min-h-[200px] max-h-[260px] overflow-hidden flex flex-col justify-end">
          {/* Photorealistic Restaurant Image with Ken-Burns Motion */}
          <motion.div
            variants={heroImageVariants}
            initial="hidden"
            animate="visible"
            className="absolute inset-0 bg-cover bg-center anim-ken-burns"
            style={{ backgroundImage: `url('/customer-dining-bg.jpg')` }}
          />

          {/* Gradient Overlay for Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/40" />

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
          <div className="relative z-10 text-center pb-8 px-3">
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

        {/* REDESIGNED LOWER MAIN REGISTRATION SECTION (OVERLAPPING CURVED SURFACE) */}
        <motion.div
          variants={surfaceVariants}
          initial="hidden"
          animate="visible"
          className="relative -mt-6 z-20 flex-1 w-full rounded-t-[2.25rem] bg-gradient-to-b from-card via-card/95 to-orange-500/5 dark:from-card dark:via-card/95 dark:to-orange-950/10 backdrop-blur-2xl border-t border-border/80 p-4 sm:p-5 shadow-[0_-15px_40px_rgba(0,0,0,0.15)] flex flex-col justify-between overflow-hidden"
        >
          {/* Curved Transition Specular Highlight Bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/50 dark:via-orange-400/20 to-transparent rounded-t-[2.25rem]" />

          {/* Soft Orange Backdrop Glow behind Form */}
          <div className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 w-56 h-28 rounded-full bg-gradient-to-tr from-orange-500/20 via-amber-500/15 to-transparent blur-2xl" />

          {/* Subtle Floating Light Particles inside Lower Section */}
          <div className="absolute top-4 left-5 w-2 h-2 rounded-full bg-amber-400/40 blur-[0.5px] anim-particle-glow pointer-events-none" />
          <div className="absolute bottom-10 right-6 w-2.5 h-2.5 rounded-full bg-orange-400/40 blur-[0.5px] anim-particle-glow pointer-events-none" style={{ animationDelay: "1.5s" }} />

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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleCustomerLogin}
                    className="space-y-2.5"
                  >
                    {/* Full Name Field (Item 2 - Enters 1st Form Input) */}
                    <motion.div variants={itemVariants}>
                      <label htmlFor="cust-login-name" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                        Full Name <span className="text-orange-500">*</span>
                      </label>
                      <div className="group relative flex items-center gap-2 p-1 rounded-2xl border border-border/80 bg-muted/50 dark:bg-muted/30 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/25 focus-within:scale-[1.015] shadow-xs">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-focus-within:bg-orange-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
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

                    {/* Phone Field (Item 3 - Enters 2nd Form Input) */}
                    <motion.div variants={itemVariants}>
                      <label htmlFor="cust-login-phone" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                        Mobile Phone Number <span className="text-orange-500">*</span>
                      </label>
                      <div className="group relative flex items-center gap-2 p-1 rounded-2xl border border-border/80 bg-muted/50 dark:bg-muted/30 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/25 focus-within:scale-[1.015] shadow-xs">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-focus-within:bg-orange-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
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

                    {/* Email Field (Item 4 - Enters 3rd Form Input) */}
                    <motion.div variants={itemVariants}>
                      <label htmlFor="cust-login-email" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                        Email Address <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                      </label>
                      <div className="group relative flex items-center gap-2 p-1 rounded-2xl border border-border/80 bg-muted/50 dark:bg-muted/30 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/25 focus-within:scale-[1.015] shadow-xs">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-focus-within:bg-orange-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
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

                    {/* Start Ordering Button (Item 5 - Enters Last) */}
                    <motion.div variants={buttonVariants} className="pt-1">
                      <div className="relative group">
                        {/* Soft Orange CTA Glow Backdrop */}
                        <div className="absolute inset-0 rounded-2xl bg-orange-500/30 blur-md transition-all duration-300 group-hover:bg-orange-500/40" />

                        <motion.button
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.97 }}
                          type="submit"
                          disabled={loading}
                          className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all duration-300 active:scale-[0.97] disabled:opacity-80 cursor-pointer min-h-[46px] sm:min-h-[48px] anim-shimmer-btn z-10"
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
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleStaffLogin}
                    className="space-y-2.5"
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
                      <label htmlFor="staff-login-email" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                        Staff Email / ID
                      </label>
                      <div className="group relative flex items-center gap-2 p-1 rounded-2xl border border-border/80 bg-muted/50 dark:bg-muted/30 transition-all duration-300 focus-within:border-amber-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-amber-500/25 focus-within:scale-[1.015] shadow-xs">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-focus-within:bg-amber-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
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
                      <div className="group relative flex items-center gap-2 p-1 rounded-2xl border border-border/80 bg-muted/50 dark:bg-muted/30 transition-all duration-300 focus-within:border-amber-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-amber-500/25 focus-within:scale-[1.015] shadow-xs">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-focus-within:bg-amber-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
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
