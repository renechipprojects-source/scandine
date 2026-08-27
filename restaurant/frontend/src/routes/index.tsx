import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  UtensilsCrossed,
  ShieldCheck,
} from "lucide-react";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  ssr: false,
  component: LoginPage,
});

type Role = "reception" | "kitchen" | "admin";

const CREDENTIALS: Record<string, { password: string; redirect: `/${Role}` }> = {
  "reception@restaurant.com": { password: "Reception@123", redirect: "/reception" },
  "kitchen@restaurant.com": { password: "Kitchen@123", redirect: "/kitchen" },
  "admin@restaurant.com": { password: "Admin@123", redirect: "/admin" },
};

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check preset admin/reception/kitchen credentials
    const entry = CREDENTIALS[cleanEmail];
    if (entry && entry.password === password) {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "savora.auth",
            JSON.stringify({ email: cleanEmail, redirect: entry.redirect })
          );
        }
      } catch {}
      navigate({ to: entry.redirect });
      return;
    }

    // 1.5 Check registered employee custom credentials store (for newly added staff)
    try {
      if (typeof window !== "undefined") {
        const storedJson = window.localStorage.getItem("sd_custom_credentials");
        if (storedJson) {
          const credsMap: Record<string, { password?: string; role?: string; status?: string }> = JSON.parse(storedJson);
          const customUser = credsMap[cleanEmail];
          if (customUser) {
            const status = (customUser.status || "active").toLowerCase();
            const normalizedRole = (customUser.role || "").toLowerCase();
            const isAllowedRole =
              normalizedRole === "receptionist" ||
              normalizedRole === "kitchen_staff" ||
              normalizedRole === "chef" ||
              normalizedRole === "admin";

            if (status === "active" && isAllowedRole && customUser.password === password) {
              let redirect: `/${Role}` = "/admin";
              if (normalizedRole === "receptionist") {
                redirect = "/reception";
              } else if (normalizedRole === "kitchen_staff" || normalizedRole === "chef") {
                redirect = "/kitchen";
              }
              window.localStorage.setItem(
                "savora.auth",
                JSON.stringify({ email: cleanEmail, redirect })
              );
              navigate({ to: redirect });
              return;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Custom credential store check notice:", e);
    }

    // 2. Authenticate dynamic employee credentials via Supabase
    if (isSupabaseConfigured) {
      try {
        const { data: empRows, error: empErr } = await supabase
          .from("sd_employees")
          .select("*")
          .eq("email", cleanEmail);

        const emp = empRows && empRows.length > 0 ? empRows[0] : null;

        if (!empErr && emp) {
          const normalizedStatus = (emp.status || "active").toLowerCase();
          const normalizedRole = (emp.role || "").toLowerCase();
          const isAllowedRole =
            normalizedRole === "receptionist" ||
            normalizedRole === "kitchen_staff" ||
            normalizedRole === "chef" ||
            normalizedRole === "admin";

          if (normalizedStatus === "active" && isAllowedRole) {
            let authSuccess = emp.password_plain === password;
            if (!authSuccess && password) {
              const { error: authErr } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: password,
              });
              if (!authErr) authSuccess = true;
            }

            if (authSuccess) {
              let redirect: `/${Role}` = "/admin";
              if (normalizedRole === "receptionist") {
                redirect = "/reception";
              } else if (normalizedRole === "kitchen_staff" || normalizedRole === "chef") {
                redirect = "/kitchen";
              }

              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  "savora.auth",
                  JSON.stringify({ email: cleanEmail, redirect })
                );
              }

              navigate({ to: redirect });
              return;
            }
          }
        }

        // Direct Supabase Auth signInWithPassword check
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (!authErr && authData?.user) {
          const userRole = (authData.user.user_metadata?.role || "receptionist").toLowerCase();
          let redirect: `/${Role}` = "/admin";
          if (userRole === "receptionist") {
            redirect = "/reception";
          } else if (userRole === "kitchen_staff" || userRole === "chef") {
            redirect = "/kitchen";
          }

          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "savora.auth",
              JSON.stringify({ email: cleanEmail, redirect })
            );
          }

          navigate({ to: redirect });
          return;
        }
      } catch (err: any) {
        console.error("Login authentication exception:", err);
      } finally {
        setLoading(false);
      }
    }

    setError("Invalid email or password.");
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-foreground flex flex-col items-center justify-between">
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

      <main className="w-full max-w-[480px] px-6 py-12 flex flex-col items-center justify-center animate-rise my-auto relative z-10">
        {/* Header Branding */}
        <header className="flex flex-col items-center justify-center text-center mb-6">
          <Link to="/" className="group flex items-center justify-center">
            <div className="relative rounded-3xl bg-white/90 dark:bg-slate-900/90 p-3.5 border border-white/80 dark:border-white/10 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.35),0_6px_16px_-4px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_20px_45px_-8px_rgba(0,0,0,0.45)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-3xl bg-gradient-to-b from-white/70 to-transparent" />
              <img
                src="/scandine-logo.png"
                alt="ScanDine"
                className="h-24 sm:h-28 w-auto object-contain relative z-10 rounded-2xl drop-shadow-[0_6px_12px_rgba(0,0,0,0.15)]"
              />
            </div>
          </Link>
        </header>

        {/* Centered Form Card */}
        <div className="w-full">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight leading-[1.1] sm:text-3xl text-white">
              Staff Sign In
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Enter your credentials to access your designated module.
            </p>
          </div>

          <div className="relative rounded-[28px] border border-white/15 bg-slate-900/80 p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_10px_25px_-5px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-8">
            {/* Glass reflection */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
                  {error}
                </div>
              )}

              <Field
                id="email"
                label="Staff Email or ID"
                type="text"
                placeholder="you@restaurant.com"
                icon={<Mail className="h-4.5 w-4.5" />}
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Field
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                icon={<Lock className="h-4.5 w-4.5" />}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="block transition-transform duration-300" style={{ transform: showPassword ? "rotate(180deg)" : "rotate(0)" }}>
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </span>
                  </button>
                }
              />

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-3.5 text-[15px] font-semibold text-white shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-20px_oklch(0.65_0.22_25/0.55)] active:translate-y-0 disabled:opacity-80"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.35)_50%,transparent_80%)] bg-[length:200%_100%] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:[animation:shimmer_1.6s_linear_infinite]" />
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="w-full py-4 px-6 text-center text-xs sm:text-sm text-muted-foreground z-10">
        <p>© 2026 Renechip Private Limited. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

function Field({
  id, label, type, placeholder, icon, trailing, autoComplete, value, onChange, required,
}: {
  id: string; label: string; type: string; placeholder: string;
  icon: React.ReactNode; trailing?: React.ReactNode; autoComplete?: string;
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div className="group">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="relative flex items-center rounded-2xl border border-white/10 bg-slate-950/60 transition-all duration-300 focus-within:border-[oklch(0.7_0.2_35)] focus-within:ring-2 focus-within:ring-[oklch(0.75_0.18_35/0.25)] hover:border-white/20">
        <span className="pl-4 text-slate-400 transition-colors group-focus-within:text-amber-400">
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required={required}
          className="flex-1 bg-transparent px-3 py-3.5 text-[15px] text-white placeholder:text-slate-500 focus:outline-none"
        />
        {trailing && <span className="pr-2">{trailing}</span>}
      </div>
    </div>
  );
}