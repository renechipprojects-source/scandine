import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { QrCode, User, Phone, Mail, Sparkles, ArrowRight, Loader2 } from "lucide-react";
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

  // Staggered Animation Variants for Panel Children
  const logoVariants: Variants = {
    hidden: { opacity: 0, scale: 0.85, y: 14 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const glassPanelVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
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
    hidden: { opacity: 0, y: 12 },
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
    <div className="min-h-[100dvh] w-full overflow-x-hidden flex flex-col justify-between items-center bg-transparent text-[#172033] select-none relative">
      {/* Keyframe Animations & Prefers-Reduced-Motion Rules */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .anim-ken-burns, .anim-shimmer-btn, .anim-blob-float-1, .anim-blob-float-2 {
            animation: none !important;
            transform: none !important;
          }
        }

        @keyframes kenBurnsSlow {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.06) translate(-6px, -3px); }
        }

        @keyframes shimmerGlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes blobFloat1 {
          0%, 100% { transform: translate(-50%, 0px) scale(1); opacity: 0.65; }
          50% { transform: translate(-50%, -18px) scale(1.15); opacity: 0.85; }
        }

        @keyframes blobFloat2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.55; }
          50% { transform: translate(-16px, 16px) scale(1.2); opacity: 0.8; }
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

      {/* FULL-VIEWPORT RESTAURANT DINING BACKGROUND IMAGE LAYER (FULLY VISIBLE BEHIND ENTIRE PAGE & GLASS PANEL) */}
      <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
        <img
          src="/customer-dining-bg.jpg"
          alt="ScanDine Restaurant Atmosphere"
          className="w-full h-full object-cover object-center anim-ken-burns brightness-95"
        />
        {/* Subtle Light Warm Vignette for Text Readability - Image Remains 100% Visibly Clear */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-amber-950/15 to-black/30" />
      </div>

      {/* MOBILE APP CONTAINER SHELL (320px - 480px Responsive Viewport) */}
      <div className="w-full max-w-[430px] min-h-[100dvh] mx-auto flex flex-col justify-between relative z-10 overflow-x-hidden pb-4">
        
        {/* TOP RESTAURANT BRANDING HERO HEADER */}
        <div className="relative w-full h-[35vh] min-h-[220px] max-h-[280px] flex flex-col justify-end">
          <div className="relative z-10 text-center pb-10 px-3">
            <motion.div variants={logoVariants} initial="hidden" animate="visible" className="flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-white/85 text-[#1e293b] border border-orange-500/30 mb-2 backdrop-blur-md shadow-xs">
                <QrCode className="h-3 w-3 text-[#f97316] animate-pulse" /> {tableNumber ? `Table Scanned · ${tableNumber}` : "ScanDine Guest"}
              </div>

              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block"
              >
                <img
                  src="/scandine-customer-logo.png"
                  alt="ScanDine"
                  className="h-11 sm:h-13 w-auto object-contain mx-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] brightness-105"
                />
              </motion.div>

              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                Scan<span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">Dine</span>
              </h1>
              <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-orange-200/90 drop-shadow-xs">
                SCAN • ORDER • DINE
              </div>
            </motion.div>
          </div>
        </div>

        {/* PREMIUM LIGHT GLASSMORPHISM REGISTRATION PANEL (RESTUARANT IMAGE VISIBLE THROUGH GLASS SURFACE) */}
        <motion.div
          variants={glassPanelVariants}
          initial="hidden"
          animate="visible"
          className="relative -mt-8 z-20 flex-1 w-[calc(100%-24px)] mx-auto p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-xl"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.68)",
            backdropFilter: "blur(18px) saturate(140%)",
            WebkitBackdropFilter: "blur(18px) saturate(140%)",
            borderTopLeftRadius: "30px",
            borderTopRightRadius: "30px",
            borderBottomLeftRadius: "24px",
            borderBottomRightRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.75)",
            boxShadow: "0 20px 45px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 0 25px rgba(249, 115, 22, 0.12)",
          }}
        >
          {/* Animated Soft Peach/Orange Glow Floating Directly Behind Light Glass Panel */}
          <div className="absolute top-[-30px] left-1/2 w-64 h-64 rounded-full bg-gradient-to-tr from-amber-300/40 via-orange-300/30 to-transparent blur-3xl anim-blob-float-1 pointer-events-none z-0" />
          <div className="absolute -bottom-8 -right-8 w-56 h-56 rounded-full bg-gradient-to-br from-orange-300/35 via-amber-200/30 to-transparent blur-3xl anim-blob-float-2 pointer-events-none z-0" />

          {/* Inner Top Specular Edge Highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent rounded-t-[30px]" />

          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full flex-1 flex flex-col justify-between relative z-10">
            <form onSubmit={handleSubmit} className="space-y-3">
              <motion.div variants={itemVariants} className="text-center mb-1">
                <p className="text-xs font-bold leading-relaxed max-w-xs mx-auto text-[#334155]">
                  Please register your details to view {tableNumber ? `${tableNumber} menu` : "the menu"} and place orders.
                </p>
              </motion.div>

              {/* Full Name Field (Second Light Glass Layer Input) */}
              <motion.div variants={itemVariants}>
                <label htmlFor="reg-name" className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-[#1e293b]">
                  Full Name <span style={{ color: "#f97316" }}>*</span>
                </label>
                <div
                  className="group relative flex items-center gap-2.5 p-1.5 transition-all duration-300 shadow-xs"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.55)",
                    border: "1px solid rgba(15, 23, 42, 0.12)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "16px",
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 transition-transform duration-300 group-focus-within:scale-105"
                    style={{ backgroundColor: "rgba(249, 115, 22, 0.18)", color: "#ea580c" }}
                  >
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold outline-none min-h-[42px] transition-all duration-300 focus:outline-none"
                    style={{ color: "#0f172a" }}
                  />
                </div>
              </motion.div>

              {/* Phone Field (Second Light Glass Layer Input) */}
              <motion.div variants={itemVariants}>
                <label htmlFor="reg-phone" className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-[#1e293b]">
                  Mobile Phone Number <span style={{ color: "#f97316" }}>*</span>
                </label>
                <div
                  className="group relative flex items-center gap-2.5 p-1.5 transition-all duration-300 shadow-xs"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.55)",
                    border: "1px solid rgba(15, 23, 42, 0.12)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "16px",
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 transition-transform duration-300 group-focus-within:scale-105"
                    style={{ backgroundColor: "rgba(249, 115, 22, 0.18)", color: "#ea580c" }}
                  >
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-phone"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="10-digit mobile number"
                    className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold outline-none min-h-[42px] transition-all duration-300 focus:outline-none"
                    style={{ color: "#0f172a" }}
                  />
                </div>
              </motion.div>

              {/* Email Field (Second Light Glass Layer Input) */}
              <motion.div variants={itemVariants}>
                <label htmlFor="reg-email" className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-[#1e293b]">
                  Email Address <span className="font-normal lowercase" style={{ color: "#475569" }}>(optional)</span>
                </label>
                <div
                  className="group relative flex items-center gap-2.5 p-1.5 transition-all duration-300 shadow-xs"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.55)",
                    border: "1px solid rgba(15, 23, 42, 0.12)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "16px",
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 transition-transform duration-300 group-focus-within:scale-105"
                    style={{ backgroundColor: "rgba(249, 115, 22, 0.18)", color: "#ea580c" }}
                  >
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold outline-none min-h-[42px] transition-all duration-300 focus:outline-none"
                    style={{ color: "#0f172a" }}
                  />
                </div>
              </motion.div>

              {/* Start Ordering Button (Premium Orange Gradient Shimmer CTA) */}
              <motion.div variants={buttonVariants} className="pt-1">
                <div className="relative group">
                  <div className="absolute inset-0 rounded-2xl bg-orange-500/35 blur-md transition-all duration-300 group-hover:bg-orange-500/50" />

                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={loading}
                    className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white transition-all duration-300 active:scale-[0.97] disabled:opacity-80 cursor-pointer min-h-[46px] sm:min-h-[48px] anim-shimmer-btn z-10"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #f59e0b 100%)",
                      border: "1px solid rgba(255, 255, 255, 0.4)",
                      boxShadow: "0 10px 25px rgba(249, 115, 22, 0.35)",
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" /> Saving Details…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-white" /> Start Ordering
                        <ArrowRight className="h-4 w-4 text-white transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </form>

            <motion.footer
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-3 text-center text-[10px] sm:text-[11px] font-semibold"
              style={{ color: "#475569" }}
            >
              © 2026 Renechip Private Limited. All Rights Reserved.
            </motion.footer>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
