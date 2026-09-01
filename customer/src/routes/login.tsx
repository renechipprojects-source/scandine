import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  CheckCircle2,
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

  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden flex flex-col justify-center items-center px-3.5 py-4 sm:px-4 sm:py-6 relative select-none bg-background text-foreground [perspective:1000px]">
      {/* CSS Keyframe Animations for Professional 3D Motion & Parallax */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .anim-plate-1, .anim-plate-2, .anim-plate-3, .anim-plate-4,
          .anim-particle-1, .anim-particle-2, .anim-particle-3,
          .anim-ambient-light, .anim-glass-float {
            animation: none !important;
            transform: none !important;
          }
        }

        @keyframes plate3D1 {
          0%, 100% { transform: perspective(800px) rotateX(16deg) rotateY(-14deg) translate3d(0px, 0px, 12px); }
          50% { transform: perspective(800px) rotateX(24deg) rotateY(-6deg) translate3d(-10px, -14px, 26px); }
        }
        @keyframes plate3D2 {
          0%, 100% { transform: perspective(800px) rotateX(-14deg) rotateY(16deg) translate3d(0px, 0px, 12px); }
          50% { transform: perspective(800px) rotateX(-22deg) rotateY(24deg) translate3d(12px, 12px, 22px); }
        }
        @keyframes plate3D3 {
          0%, 100% { transform: perspective(800px) rotateX(12deg) rotateY(12deg) translate3d(0px, 0px, 8px); }
          50% { transform: perspective(800px) rotateX(20deg) rotateY(18deg) translate3d(-8px, -10px, 18px); }
        }
        @keyframes plate3D4 {
          0%, 100% { transform: perspective(800px) rotateX(-10deg) rotateY(-10deg) translate3d(0px, 0px, 6px); }
          50% { transform: perspective(800px) rotateX(-18deg) rotateY(-16deg) translate3d(8px, 10px, 16px); }
        }

        @keyframes floatParticle1 {
          0%, 100% { transform: translate3d(0px, 0px, 0px) rotate(0deg); opacity: 0.35; }
          50% { transform: translate3d(15px, -22px, 10px) rotate(180deg); opacity: 0.7; }
        }
        @keyframes floatParticle2 {
          0%, 100% { transform: translate3d(0px, 0px, 0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translate3d(-16px, 18px, -10px) rotate(-180deg); opacity: 0.65; }
        }
        @keyframes floatParticle3 {
          0%, 100% { transform: translate3d(0px, 0px, 0px) scale(1); opacity: 0.35; }
          50% { transform: translate3d(18px, 16px, 12px) scale(1.2); opacity: 0.75; }
        }

        @keyframes ambientLightShift {
          0%, 100% { transform: translate3d(0px, 0px, 0px) scale(1); opacity: 0.45; filter: blur(50px); }
          50% { transform: translate3d(35px, -25px, 0px) scale(1.2); opacity: 0.75; filter: blur(65px); }
        }
        @keyframes glassPanelFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .anim-plate-1 { animation: plate3D1 7.5s ease-in-out infinite; }
        .anim-plate-2 { animation: plate3D2 9.5s ease-in-out infinite; }
        .anim-plate-3 { animation: plate3D3 8.5s ease-in-out infinite 0.5s; }
        .anim-plate-4 { animation: plate3D4 10.5s ease-in-out infinite 1s; }
        .anim-particle-1 { animation: floatParticle1 11s ease-in-out infinite; }
        .anim-particle-2 { animation: floatParticle2 13s ease-in-out infinite 1.5s; }
        .anim-particle-3 { animation: floatParticle3 9s ease-in-out infinite 0.8s; }
        .anim-ambient-light { animation: ambientLightShift 12s ease-in-out infinite; }
        .anim-glass-float { animation: glassPanelFloat 6s ease-in-out infinite; }
        .anim-entrance { animation: cardEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Restaurant Background Atmosphere */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden w-full h-full">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-[2px] opacity-15 dark:opacity-20 scale-105"
          style={{ backgroundImage: `url('/customer-dining-bg.jpg')` }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background/95 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.1),transparent_50%)]" />

        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-transparent blur-3xl anim-ambient-light" />
      </div>

      {/* FULL-SCREEN MOBILE APP CONTAINER */}
      <main className="w-full max-w-[400px] sm:max-w-md mx-auto my-auto relative z-10 flex flex-col items-center">
        <div className="relative w-full anim-glass-float overflow-visible">
          {/* 3D Translucent Dinner Plates */}
          <div
            className="absolute -top-7 -left-7 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-card/75 via-orange-500/10 to-card/90 backdrop-blur-md border-2 border-border/80 shadow-[0_10px_25px_rgba(0,0,0,0.08)] anim-plate-1 pointer-events-none z-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-border/60 bg-muted/30" />
          </div>

          <div
            className="absolute -bottom-7 -right-7 w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-bl from-card/75 via-amber-500/10 to-card/90 backdrop-blur-md border-2 border-border/80 shadow-[0_10px_25px_rgba(0,0,0,0.08)] anim-plate-2 pointer-events-none z-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-border/60 bg-muted/30" />
          </div>

          <div
            className="absolute -top-5 -right-5 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-card/80 via-orange-500/5 to-card/65 backdrop-blur-sm border-2 border-border/75 shadow-md anim-plate-3 pointer-events-none z-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-border/50 bg-muted/20" />
          </div>

          <div
            className="absolute -bottom-5 -left-5 w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-card/80 via-amber-500/5 to-card/60 backdrop-blur-sm border border-border/70 shadow-sm anim-plate-4 pointer-events-none z-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-full border border-border/40 bg-muted/20" />
          </div>

          {/* Floating Particles */}
          <div className="absolute -top-3 left-1/4 w-3 h-3 rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 opacity-40 blur-[1px] anim-particle-1 pointer-events-none z-0" aria-hidden="true" />
          <div className="absolute bottom-2 right-1/3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-orange-300 to-yellow-300 opacity-40 blur-[1px] anim-particle-2 pointer-events-none z-0" aria-hidden="true" />
          <div className="absolute top-1/2 -right-3 w-3.5 h-3.5 rounded-full bg-card/70 backdrop-blur-xs border border-orange-500/20 opacity-50 anim-particle-3 pointer-events-none z-0" aria-hidden="true" />

          {/* SINGLE COMPACT GLASSMORPHISM MOBILE SURFACE */}
          <div className="relative z-10 w-full rounded-3xl bg-card/85 dark:bg-card/75 backdrop-blur-2xl border border-border/80 p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] anim-entrance">
            {/* Specular Soft Highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent rounded-t-3xl" />

            {/* Header */}
            <div className="text-center mb-3 sm:mb-4">
              <Link to="/" className="inline-block mb-1 group">
                <img
                  src="/scandine-customer-logo.png"
                  alt="ScanDine"
                  className="h-10 sm:h-12 w-auto object-contain mx-auto transition-transform duration-300 group-hover:scale-105 drop-shadow-md dark:brightness-110 dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                />
              </Link>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 mb-1.5">
                <Sparkles className="h-3 w-3" />
                <span>Smart Dining Portal</span>
              </div>

              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                {mode === "customer" ? "Customer Sign In" : "Staff Access Sign In"}
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium leading-tight mt-0.5">
                {mode === "customer"
                  ? "Sign in to save table sessions, view rewards & order history."
                  : "Staff access for Admin, Kitchen, and Reception modules."}
              </p>
            </div>

            {/* Dual Portal Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted/80 rounded-xl mb-3 border border-border/80">
              <button
                type="button"
                onClick={() => setMode("customer")}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "customer"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UtensilsCrossed className="h-3.5 w-3.5" /> Customer Portal
              </button>

              <button
                type="button"
                onClick={() => setMode("staff")}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "staff"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Staff Access
              </button>
            </div>

            {/* Food-Tech Feature Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-muted/40 border border-border/60 mb-3 text-[10px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1 text-orange-500">
                ⚡ Instant Sync
              </span>
              <span className="text-border hidden sm:inline">•</span>
              <span className="flex items-center gap-1 text-amber-500">
                📱 QR Menu
              </span>
              <span className="text-border hidden sm:inline">•</span>
              <span className="flex items-center gap-1 text-orange-500">
                🎁 Rewards
              </span>
            </div>

            {/* CUSTOMER FORM MODE */}
            {mode === "customer" ? (
              <form onSubmit={handleCustomerLogin} className="space-y-2.5">
                <div>
                  <label htmlFor="cust-login-name" className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
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
                </div>

                <div>
                  <label htmlFor="cust-login-phone" className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
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
                </div>

                <div>
                  <label htmlFor="cust-login-email" className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-xs font-bold text-white shadow-[0_10px_24px_-6px_rgba(249,115,22,0.4)] transition-all duration-300 hover:shadow-[0_14px_30px_-6px_rgba(249,115,22,0.5)] active:scale-[0.99] disabled:opacity-80 cursor-pointer min-h-[42px]"
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
                </button>
              </form>
            ) : (
              /* STAFF FORM MODE */
              <form onSubmit={handleStaffLogin} className="space-y-2.5">
                {/* Role Selection inside Staff Mode */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-muted/80 rounded-lg mb-2.5 border border-border/80">
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`py-1 px-1.5 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      role === "admin" ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("kitchen")}
                    className={`py-1 px-1.5 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      role === "kitchen" ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ChefHat className="h-3 w-3" /> Kitchen
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("reception")}
                    className={`py-1 px-1.5 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      role === "reception" ? "bg-blue-500/20 text-blue-500 border border-blue-500/30" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Building2 className="h-3 w-3" /> Reception
                  </button>
                </div>

                <div>
                  <label htmlFor="staff-login-email" className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
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
                </div>

                <div>
                  <label htmlFor="staff-login-password" className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 rounded-xl px-4 py-3 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_10px_24px_-6px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_14px_30px_-6px_rgba(245,158,11,0.5)] active:scale-[0.99] disabled:opacity-80 cursor-pointer min-h-[42px]"
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
                </button>
              </form>
            )}

            {/* Footer badge */}
            <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3 w-3" /> ScanDine Session Protected
              </span>
            </div>
          </div>
        </div>

        <footer className="mt-2.5 text-center text-[11px] text-muted-foreground font-medium">
          © 2026 Renechip Private Limited. All Rights Reserved.
        </footer>
      </main>
    </div>
  );
}
