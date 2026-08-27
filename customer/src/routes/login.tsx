import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, ShieldCheck, ChefHat, Building2, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { CustomerNav } from "@/components/customer-nav";

export const Route = createFileRoute("/login")({
  component: StaffLogin,
  head: () => ({
    meta: [
      { title: "Staff Login · ScanDine ERP" },
      { name: "description", content: "Staff Portal Sign In for ScanDine Restaurant Management ERP" },
    ],
  }),
});

function StaffLogin() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"admin" | "kitchen" | "reception">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your staff email or username.");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter your password or passcodes.");
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

  return (
    <div className="min-h-screen bg-slate-950 text-foreground relative flex flex-col justify-between overflow-hidden">
      {/* High-quality ambient restaurant background with dark gradient & vignette */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=80"
          alt=""
          className="h-full w-full object-cover object-center opacity-25 scale-105 filter blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.6)_100%)]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <CustomerNav />

      {/* Main Centered Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-[28px] border border-white/15 bg-slate-900/85 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_10px_25px_-5px_rgba(0,0,0,0.3)] backdrop-blur-2xl relative"
        >
          {/* Glass reflection */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          {/* Staff Header */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-block mb-3 group">
              <div className="relative rounded-3xl bg-white/80 dark:bg-card/80 p-3 border border-white/80 dark:border-border/80 shadow-[0_14px_35px_-6px_rgba(0,0,0,0.12),0_6px_14px_-4px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_18px_42px_-6px_rgba(0,0,0,0.16)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-3xl bg-gradient-to-b from-white/60 to-transparent" />
                <img
                  src="/scandine-customer-logo.png"
                  alt="ScanDine"
                  className="h-16 w-16 sm:h-20 sm:w-20 object-contain relative z-10 rounded-2xl drop-shadow-[0_6px_12px_rgba(0,0,0,0.12)]"
                />
              </div>
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3 block mx-auto w-fit">
              <ShieldCheck className="h-3.5 w-3.5" /> Commercial Restaurant ERP
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Staff Portal Sign In
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Enter your credentials to access your designated module.
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-2xl mb-6 border border-white/10">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === "admin"
                  ? "bg-slate-800 text-white shadow-xs border border-white/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Admin
            </button>

            <button
              type="button"
              onClick={() => setRole("kitchen")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === "kitchen"
                  ? "bg-slate-800 text-white shadow-xs border border-white/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ChefHat className="h-3.5 w-3.5 text-emerald-400" /> Kitchen
            </button>

            <button
              type="button"
              onClick={() => setRole("reception")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === "reception"
                  ? "bg-slate-800 text-white shadow-xs border border-white/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-blue-400" /> Reception
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="staff-login-email" className="text-xs font-semibold text-slate-300 block mb-1.5">
                Staff Email / ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  id="staff-login-email"
                  name="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`e.g. ${role}@restaurant.com`}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="staff-login-password" className="text-xs font-semibold text-slate-300 block mb-1.5">
                Password / Passcode
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  id="staff-login-password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition"
                />
              </div>
            </div>

            <div className="flex items-center text-xs text-slate-400 pt-1">
              <label htmlFor="remember-session" className="flex items-center gap-2 cursor-pointer select-none">
                <input id="remember-session" name="rememberSession" type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-950 text-primary" />
                <span>Remember session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 rounded-2xl gradient-primary text-white font-semibold py-3.5 shadow-float flex items-center justify-center gap-2 transition disabled:opacity-75"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Authenticating…
                </>
              ) : (
                <>
                  <span>Sign In as {role.toUpperCase()}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] text-muted-foreground border-t border-border/50 pt-4">
            ScanDine ERP v2.4 · Authorized Personnel Only
          </div>
        </motion.div>

        <footer className="mt-7 text-center text-[12px] text-gray-500">
          © 2026 All Rights Reserved Under Renechip Private Limited
        </footer>
      </main>
    </div>
  );
}
