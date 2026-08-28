import { useState } from "react";
import { motion } from "framer-motion";
import { QrCode, User, Phone, Mail, Sparkles, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { customerStore } from "@/lib/customer-store";
import { toast } from "sonner";

interface CustomerRegistrationProps {
  tableNumber: string;
  onSuccess?: () => void;
}

export function CustomerRegistration({ tableNumber, onSuccess }: CustomerRegistrationProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, "").slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim().replace(/\D/g, "");
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      toast.error("Please enter your Full Name.");
      return;
    }
    if (!trimmedPhone || trimmedPhone.length !== 10) {
      toast.error("Mobile number must be exactly 10 digits.");
      return;
    }
    if (trimmedEmail && !trimmedEmail.includes("@")) {
      toast.error("Please enter a valid Email address.");
      return;
    }

    setLoading(true);
    try {
      await customerStore.registerCustomer({
        fullName: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        tableNumber,
      });

      toast.success(`Welcome to ScanDine, ${trimmedName}! Registered for ${tableNumber}.`);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden flex flex-col justify-center items-center px-3.5 py-4 sm:px-4 sm:py-6 relative select-none text-slate-900 bg-slate-50 [perspective:1000px]">
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

      {/* Light Restaurant Background Atmosphere */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden w-full h-full">
        {/* Photorealistic Luxury Restaurant Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-[2px] opacity-25 scale-105"
          style={{ backgroundImage: `url('/customer-dining-bg.jpg')` }}
        />

        {/* Soft Warm Light Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/92 via-amber-50/50 to-slate-50/92 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.1),transparent_50%)]" />

        {/* Ambient Moving Light Effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-br from-orange-300/35 via-amber-200/25 to-transparent blur-3xl anim-ambient-light" />
      </div>

      {/* FULL-SCREEN MOBILE APP CONTAINER (Zero Horizontal Overflow) */}
      <main className="w-full max-w-[400px] sm:max-w-md mx-auto my-auto relative z-10 flex flex-col items-center">
        <div className="relative w-full anim-glass-float overflow-visible">
          {/* 3D Translucent Dinner Plate 1 (Top-Left offset) */}
          <div
            className="absolute -top-7 -left-7 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-white/75 via-orange-100/40 to-white/90 backdrop-blur-md border-2 border-white/85 shadow-[0_10px_25px_rgba(0,0,0,0.08)] anim-plate-1 pointer-events-none z-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-white/60 bg-white/30" />
          </div>

          {/* 3D Translucent Dinner Plate 2 (Bottom-Right offset) */}
          <div
            className="absolute -bottom-7 -right-7 w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-bl from-white/75 via-amber-100/40 to-white/90 backdrop-blur-md border-2 border-white/85 shadow-[0_10px_25px_rgba(0,0,0,0.08)] anim-plate-2 pointer-events-none z-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-white/60 bg-white/30" />
          </div>

          {/* 3D Translucent Dinner Plate 3 (Top-Right offset) */}
          <div
            className="absolute -top-5 -right-5 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-white/80 via-orange-50/50 to-white/65 backdrop-blur-sm border-2 border-white/75 shadow-md anim-plate-3 pointer-events-none z-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-white/50 bg-white/20" />
          </div>

          {/* 3D Translucent Dinner Plate 4 (Bottom-Left offset) */}
          <div
            className="absolute -bottom-5 -left-5 w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-white/80 via-amber-50/50 to-white/60 backdrop-blur-sm border border-white/70 shadow-sm anim-plate-4 pointer-events-none z-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-full border border-white/40 bg-white/20" />
          </div>

          {/* Subtle Ambient Dining Floating Particles */}
          <div className="absolute -top-3 left-1/4 w-3 h-3 rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 opacity-40 blur-[1px] anim-particle-1 pointer-events-none z-0" aria-hidden="true" />
          <div className="absolute bottom-2 right-1/3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-orange-300 to-yellow-300 opacity-40 blur-[1px] anim-particle-2 pointer-events-none z-0" aria-hidden="true" />
          <div className="absolute top-1/2 -right-3 w-3.5 h-3.5 rounded-full bg-white/70 backdrop-blur-xs border border-orange-200/60 opacity-50 anim-particle-3 pointer-events-none z-0" aria-hidden="true" />

          {/* SINGLE COMPACT GLASSMORPHISM MOBILE SURFACE */}
          <div className="relative z-10 w-full rounded-3xl bg-white/85 backdrop-blur-2xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] anim-entrance">
            {/* Specular Soft Highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent rounded-t-3xl" />

            {/* Header */}
            <div className="text-center mb-3 sm:mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 border border-orange-500/20 mb-1.5">
                <QrCode className="h-3 w-3" /> {tableNumber ? `Table Scanned · ${tableNumber}` : "ScanDine Guest"}
              </div>

              <div className="flex justify-center mb-1">
                <img
                  src="/scandine-customer-logo.png"
                  alt="ScanDine"
                  className="h-10 sm:h-12 w-auto object-contain drop-shadow-xs"
                />
              </div>

              <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight mb-0.5 text-slate-900">
                Scan<span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">Dine</span>
              </h1>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-0.5">
                SCAN • ORDER • DINE
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-tight">
                Please register your details to view {tableNumber ? `${tableNumber} menu` : "the menu"} and place orders.
              </p>
            </div>

            {/* Registration Form (Compact Mobile Layout) */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div>
                <label htmlFor="cust-reg-name" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-0.5">
                  Full Name <span className="text-orange-500">*</span>
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50/80 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-slate-300">
                  <User className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    id="cust-reg-name"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-transparent pl-9 pr-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cust-reg-phone" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-0.5">
                  Phone Number <span className="text-orange-500">*</span>
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50/80 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-slate-300">
                  <Phone className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    id="cust-reg-phone"
                    name="phone"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    onKeyDown={(e) => {
                      if (["e", "E", "+", "-", ".", " "].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="10-digit mobile number"
                    className="w-full bg-transparent pl-9 pr-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cust-reg-email" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-0.5">
                  Email Address <span className="text-slate-400 font-normal lowercase">(Optional)</span>
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50/80 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-slate-300">
                  <Mail className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    id="cust-reg-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your mail"
                    className="w-full bg-transparent pl-9 pr-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none min-h-[40px]"
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Details…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Start Ordering
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-center text-[10px] text-slate-500 font-medium">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="h-3 w-3" /> Table Session ({tableNumber || "Verified"}) Protected
              </span>
            </div>
          </div>
        </div>

        <footer className="mt-2.5 text-center text-[11px] text-slate-500 font-medium">
          © 2026 Renechip Private Limited. All Rights Reserved.
        </footer>
      </main>
    </div>
  );
}
