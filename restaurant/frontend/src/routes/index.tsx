import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
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
  const [rememberSession, setRememberSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subtle Interactive Mouse Parallax State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6; // -3deg to +3deg subtle tilt
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -6;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

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
            JSON.stringify({ email: cleanEmail, redirect: entry.redirect, remember: rememberSession })
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
                JSON.stringify({ email: cleanEmail, redirect, remember: rememberSession })
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
                  JSON.stringify({ email: cleanEmail, redirect, remember: rememberSession })
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
              JSON.stringify({ email: cleanEmail, redirect, remember: rememberSession })
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

    setError("Invalid staff email or password. Please verify your credentials.");
    setLoading(false);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="h-screen w-screen max-h-screen max-w-full overflow-hidden bg-[#f5f7fa] text-slate-900 flex flex-col justify-between select-none [perspective:1200px] relative"
    >
      {/* Explicit High-Visibility CSS Keyframes */}
      <style>{`
        @keyframes plateFloat1 {
          0%, 100% { transform: perspective(1000px) rotateX(12deg) rotateY(-10deg) translate3d(0px, 0px, 0px); }
          50% { transform: perspective(1000px) rotateX(16deg) rotateY(-6deg) translate3d(0px, -20px, 20px); }
        }
        @keyframes plateFloat2 {
          0%, 100% { transform: perspective(1000px) rotateX(-10deg) rotateY(12deg) translate3d(0px, 0px, 0px); }
          50% { transform: perspective(1000px) rotateX(-15deg) rotateY(16deg) translate3d(0px, 18px, -15px); }
        }
        @keyframes plateFloat3 {
          0%, 100% { transform: perspective(1000px) rotateX(8deg) rotateY(14deg) translate3d(0px, 0px, 0px); }
          50% { transform: perspective(1000px) rotateX(3deg) rotateY(9deg) translate3d(-15px, -15px, 12px); }
        }
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(65px, -50px) scale(1.15); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-55px, 55px) scale(1.2); }
        }
        @keyframes orbDrift3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(45px, 40px) scale(1.1); }
        }
        @keyframes cardAppear {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cardLivingFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        .anim-plate-1 { animation: plateFloat1 6s ease-in-out infinite; }
        .anim-plate-2 { animation: plateFloat2 8s ease-in-out infinite; }
        .anim-plate-3 { animation: plateFloat3 7s ease-in-out infinite; }
        .anim-orb-1 { animation: orbDrift1 10s ease-in-out infinite; }
        .anim-orb-2 { animation: orbDrift2 12s ease-in-out infinite; }
        .anim-orb-3 { animation: orbDrift3 9s ease-in-out infinite; }
        .anim-card-appear { animation: cardAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-card-float { animation: cardLivingFloat 5s ease-in-out infinite; }
      `}</style>

      {/* Professional Restaurant Interior Viewport Background with Soft Ambient Overlay */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden w-full h-full">
        {/* High-Resolution Luxury Restaurant Interior Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-[1.02] filter blur-[2px] transition-transform duration-1000 ease-out"
          style={{
            backgroundImage: `url('/restaurant-bg.jpg')`,
            transform: `translate3d(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px, 0px) scale(1.03)`,
          }}
        />

        {/* Soft Light White Overlay to ensure existing UI & text remain perfectly crisp & readable */}
        <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(249,115,22,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_75%,rgba(99,102,241,0.06),transparent_50%)]" />

        {/* 3 Animated Background Orbs */}
        <div
          className="absolute -top-32 -left-20 w-[480px] max-w-full h-[480px] rounded-full bg-gradient-to-br from-orange-200/35 via-amber-100/25 to-transparent blur-3xl anim-orb-1 transition-transform duration-700 ease-out"
          style={{ transform: `translate3d(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px, 0px)` }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-[450px] max-w-full h-[450px] rounded-full bg-gradient-to-tl from-slate-200/50 via-indigo-100/25 to-transparent blur-3xl anim-orb-2 transition-transform duration-1000 ease-out"
          style={{ transform: `translate3d(${mousePos.x * -1.5}px, ${mousePos.y * -1.5}px, 0px)` }}
        />
        <div
          className="absolute top-1/3 left-1/2 w-[350px] max-w-full h-[350px] rounded-full bg-gradient-to-tr from-amber-100/25 via-slate-200/25 to-transparent blur-3xl anim-orb-3"
        />
      </div>

      {/* Desktop Split-Screen Grid Layout locked strictly to 100vh */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 h-screen w-full max-w-full overflow-hidden">
        {/* LEFT COLUMN: Executive Enterprise Showcase */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 lg:p-10 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200/60 w-full max-w-full h-full">
          {/* Top Branding Section: Prominent 160px Truly Transparent ScanDine Logo PNG (0 Card/Tile/Box) */}
          <div className="flex items-center justify-between w-full bg-transparent p-0 border-none shadow-none">
            <Link to="/" className="flex items-center gap-4 bg-transparent p-0 border-none shadow-none group">
              <img
                src="/scandine-official-logo.png"
                alt="ScanDine"
                className="w-[150px] sm:w-[170px] h-auto object-contain bg-transparent border-none p-0 shadow-none block transition-transform duration-300 group-hover:scale-105"
              />
              <div className="bg-transparent p-0 border-none shadow-none">
                <div className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2 bg-transparent p-0 border-none shadow-none">
                  ScanDine <span className="text-xs font-semibold text-orange-600 bg-transparent p-0 border-none shadow-none">Enterprise</span>
                </div>
                <div className="text-xs text-slate-500 font-medium bg-transparent p-0 border-none shadow-none">Restaurant Operations Suite</div>
              </div>
            </Link>
          </div>

          {/* Center Enterprise Content */}
          <div className="my-auto py-4 max-w-xl w-full">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-4 drop-shadow-xs">
              Restaurant Management <br />
              <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
                System
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-lg">
              Empowering modern culinary outlets with real-time order dispatch, inventory sync, and intelligent staff workflows.
            </p>
          </div>

          {/* Bottom Security Info */}
          <div className="pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-medium w-full">
            <span>© All rights reserved under Renechip Pvt Ltd</span>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Layered Glassmorphic Login Workspace Panel */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 lg:p-10 relative z-20 w-full max-w-full h-full">
          {/* 3D ANIMATED LAYERED GLASS PLATES CONTAINER (Behind Login Panel Only) */}
          <div
            className="relative w-full max-w-[400px] flex items-center justify-center anim-card-float"
            style={{ transform: `rotateX(${mousePos.y * 0.15}deg) rotateY(${mousePos.x * 0.15}deg)` }}
          >
            {/* Animated 3D Glass Plate 1 (Back Layer - Active CSS Keyframe Floating Animation) */}
            <div
              className="absolute -inset-5 rounded-[38px] bg-gradient-to-br from-white/75 via-slate-100/50 to-orange-500/10 backdrop-blur-md border border-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.07)] anim-plate-1 pointer-events-none"
              aria-hidden="true"
            />

            {/* Animated 3D Glass Plate 2 (Middle Layer - Active CSS Keyframe Floating Animation) */}
            <div
              className="absolute -inset-3 rounded-[34px] bg-gradient-to-tr from-white/85 via-white/40 to-slate-200/30 backdrop-blur-lg border border-white/80 shadow-[0_15px_40px_rgba(15,23,42,0.09)] anim-plate-2 pointer-events-none"
              aria-hidden="true"
            />

            {/* Animated 3D Glass Plate 3 (Front Soft Offset Layer) */}
            <div
              className="absolute -inset-1.5 rounded-[30px] bg-gradient-to-tl from-white/90 via-orange-100/20 to-white/60 backdrop-blur-xl border border-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.06)] anim-plate-3 pointer-events-none"
              aria-hidden="true"
            />

            {/* MAIN FRONT GLASSMORPHIC LOGIN CARD */}
            <div className="relative w-full rounded-[28px] bg-white/85 backdrop-blur-2xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12)] anim-card-appear">
              {/* Top Specular Soft Highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent rounded-t-[28px]" />

              {/* Form Header with Official Freestanding Truly Transparent ScanDine Logo PNG (NO Container Box/Tile) */}
              <div className="mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src="/scandine-official-logo.png"
                    alt="ScanDine"
                    className="h-12 w-auto object-contain shrink-0 bg-transparent border-none p-0 shadow-none"
                  />
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      Staff Sign In
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      ScanDine Enterprise System Portal
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Enter your authorized credentials to access your designated system portal.
                </p>
              </div>

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-3 text-xs font-semibold text-rose-700 shadow-xs flex items-start gap-2">
                    <div className="h-4 w-4 shrink-0 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] mt-0.5">!</div>
                    <span>{error}</span>
                  </div>
                )}

                <div className="group">
                  <label htmlFor="staff-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Staff Email or ID
                  </label>
                  <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50/80 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-slate-300">
                    <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-orange-500" />
                    <input
                      id="staff-email"
                      name="email"
                      type="text"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@restaurant.com"
                      className="w-full bg-transparent pl-10 pr-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="staff-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50/80 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-slate-300">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-orange-500" />
                    <input
                      id="staff-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-transparent pl-10 pr-10 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 rounded-lg p-1 text-slate-400 transition-all hover:bg-slate-200/60 hover:text-slate-700 focus:outline-none cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <span className="block transition-transform duration-300" style={{ transform: showPassword ? "rotate(180deg)" : "rotate(0)" }}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Session checkbox */}
                <div className="flex items-center text-xs text-slate-700 pt-0.5">
                  <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer select-none font-medium">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberSession}
                      onChange={(e) => setRememberSession(e.target.checked)}
                      className="rounded border-slate-300 text-orange-500 focus:ring-orange-500/30"
                    />
                    <span>Keep session active</span>
                  </label>
                </div>

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_-6px_rgba(249,115,22,0.4)] transition-all duration-300 hover:shadow-[0_16px_36px_-6px_rgba(249,115,22,0.5)] active:scale-[0.99] disabled:opacity-80 cursor-pointer"
                  style={{ backgroundImage: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #f59e0b 100%)" }}
                >
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.35)_50%,transparent_80%)] bg-[length:200%_100%] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:animate-shimmer" />
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Verifying Credentials…
                    </>
                  ) : (
                    <>
                      Sign In to Operations Portal
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}