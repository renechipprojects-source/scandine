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
    <div className="min-h-screen bg-background relative flex flex-col justify-between overflow-hidden">
      <CustomerNav />

      {/* Main Centered Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md glass rounded-3xl p-6 sm:p-8 shadow-glass border border-border/80"
        >
          {/* Staff Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
              <ShieldCheck className="h-3.5 w-3.5" /> Commercial Restaurant ERP
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Staff Portal Sign In
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your credentials to access your designated module.
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === "admin"
                  ? "bg-card text-foreground shadow-xs border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Admin
            </button>

            <button
              type="button"
              onClick={() => setRole("kitchen")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === "kitchen"
                  ? "bg-card text-foreground shadow-xs border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ChefHat className="h-3.5 w-3.5 text-emerald-600" /> Kitchen
            </button>

            <button
              type="button"
              onClick={() => setRole("reception")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === "reception"
                  ? "bg-card text-foreground shadow-xs border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-blue-600" /> Reception
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Staff Email / ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`e.g. ${role}@restaurant.com`}
                  className="w-full rounded-2xl border bg-background/80 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Password / Passcode
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border bg-background/80 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" defaultChecked className="rounded border-muted-foreground/40 text-primary" />
                <span>Remember session</span>
              </label>
              <span className="text-primary hover:underline cursor-pointer">Forgot PIN?</span>
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
