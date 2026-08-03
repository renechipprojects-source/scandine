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

    const entry = CREDENTIALS[email.trim().toLowerCase()];
    if (!entry || entry.password !== password) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "savora.auth",
          JSON.stringify({ email: email.trim().toLowerCase(), redirect: entry.redirect })
        );
      }
    } catch {
      // storage unavailable — ignore
    }

    navigate({ to: entry.redirect });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col items-center justify-between">
      {/* Animated ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.97_0.04_60)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,oklch(0.96_0.05_30)_0%,transparent_55%)]" />
        <div className="animate-float-slow absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[oklch(0.78_0.18_35)] opacity-30 blur-3xl" />
        <div className="animate-float-slower absolute top-1/2 -right-40 h-[520px] w-[520px] rounded-full bg-[oklch(0.72_0.2_25)] opacity-25 blur-3xl" />
        <div className="animate-float-slow absolute -bottom-40 left-1/3 h-[380px] w-[380px] rounded-full bg-[oklch(0.85_0.12_65)] opacity-30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          }}
        />
      </div>

      <main className="w-full max-w-[480px] px-6 py-12 flex flex-col items-center justify-center animate-rise my-auto">
        {/* Header Branding */}
        <header className="flex flex-col items-center justify-center text-center mb-2">
          <Link to="/" className="flex items-center justify-center">
            <img src="/scandine-logo.png" alt="ScanDine" className="h-24 sm:h-28 w-auto object-contain" />
          </Link>
        </header>

        {/* Centered Form Card */}
        <div className="w-full">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight leading-[1.1] sm:text-3xl">
              Staff Sign In
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              Enter your credentials to access your designated module.
            </p>
          </div>

          <div className="relative rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-8">
            {/* Glass reflection */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground/80">
        {label}
      </label>
      <div className="relative flex items-center rounded-2xl border border-border bg-white/80 transition-all duration-300 focus-within:border-[oklch(0.7_0.2_35)] focus-within:shadow-[0_0_0_4px_oklch(0.75_0.18_35/0.15)] hover:border-[oklch(0.82_0.1_50)]">
        <span className="pl-4 text-muted-foreground transition-colors group-focus-within:text-[oklch(0.62_0.22_30)]">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required={required}
          className="flex-1 bg-transparent px-3 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        {trailing && <span className="pr-2">{trailing}</span>}
      </div>
    </div>
  );
}