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

  // Animation Variants for Form, Logo, and Inputs
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

      {/* FULL-SCREEN RESTAURANT DINING BACKGROUND IMAGE FOR ENTIRE VIEWPORT */}
      <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden">
        <img
          src="/customer-dining-bg.jpg"
          alt="ScanDine Restaurant Atmosphere"
          className="w-full h-full object-cover object-center anim-ken-burns brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/75" />
      </div>

      {/* ANIMATED FLOATING LIGHT/ORANGE BLOBS (VISIBLE THROUGH TRANSPARENT FORM GLASS) */}
      <div className="absolute top-[28vh] left-2 w-56 h-56 rounded-full bg-gradient-to-tr from-orange-500/45 via-amber-500/35 to-transparent blur-2xl anim-blob-float-1 pointer-events-none z-10" />
      <div className="absolute bottom-6 right-2 w-60 h-60 rounded-full bg-gradient-to-br from-amber-500/40 via-orange-600/35 to-transparent blur-2xl anim-blob-float-2 pointer-events-none z-10" />

      {/* MOBILE APP CONTAINER SHELL (320px - 480px Responsive) */}
      <div className="w-full max-w-[430px] min-h-[100dvh] mx-auto flex flex-col justify-between relative z-10 overflow-x-hidden">
        
        {/* TOP RESTAURANT BRANDING HEADER */}
        <div className="relative w-full h-[32vh] min-h-[200px] max-h-[260px] flex flex-col justify-end">
          {/* Table Badge & Logo Overlaid on Hero Image */}
          <div className="relative z-10 text-center pb-8 px-3">
            <motion.div variants={logoVariants} initial="hidden" animate="visible" className="flex flex-col items-center">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/30 text-primary border border-primary/40 mb-1 backdrop-blur-md">
                <QrCode className="h-3 w-3 animate-pulse" /> {tableNumber ? `Table Scanned · ${tableNumber}` : "ScanDine Guest"}
              </div>

              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block"
              >
                <img
                  src="/scandine-customer-logo.png"
                  alt="ScanDine"
                  className="h-11 sm:h-13 w-auto object-contain mx-auto drop-shadow-lg dark:brightness-110 dark:drop-shadow-[0_0_14px_rgba(255,255,255,0.4)]"
                />
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

        {/* FULLY TRANSPARENT GLASSMORPHISM REGISTRATION PANEL (BACKGROUND IMAGE VISIBLE THROUGH GLASS) */}
        <motion.div
          variants={transparentGlassVariants}
          initial="hidden"
          animate="visible"
          className="relative -mt-6 z-20 flex-1 w-full rounded-t-[2.25rem] bg-white/15 dark:bg-black/30 backdrop-blur-[26px] border-t border-white/40 dark:border-white/20 p-4 sm:p-5 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] flex flex-col justify-between overflow-hidden"
        >
          {/* Inner Top Specular Highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 dark:via-white/40 to-transparent rounded-t-[2.25rem]" />

          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full flex-1 flex flex-col justify-between relative z-10">
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <motion.div variants={itemVariants} className="text-center mb-2">
                <p className="text-xs text-white/90 dark:text-gray-200 font-medium leading-relaxed max-w-xs mx-auto drop-shadow-xs">
                  Please register your details to view {tableNumber ? `${tableNumber} menu` : "the menu"} and place orders.
                </p>
              </motion.div>

              {/* Full Name Field (Translucent Glass Input Control) */}
              <motion.div variants={itemVariants}>
                <label htmlFor="reg-name" className="text-[10px] font-bold uppercase tracking-wider text-white/90 block mb-0.5 drop-shadow-xs">
                  Full Name <span className="text-orange-400">*</span>
                </label>
                <div className="group relative flex items-center gap-2.5 p-1 rounded-2xl border border-white/35 dark:border-white/20 bg-white/25 dark:bg-black/40 backdrop-blur-md transition-all duration-300 focus-within:border-orange-400 focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-orange-500/30 focus-within:scale-[1.01] shadow-md">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/25 text-orange-300 backdrop-blur-xs flex items-center justify-center group-focus-within:bg-orange-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold text-white placeholder:text-white/60 outline-none min-h-[42px]"
                  />
                </div>
              </motion.div>

              {/* Phone Field (Translucent Glass Input Control) */}
              <motion.div variants={itemVariants}>
                <label htmlFor="reg-phone" className="text-[10px] font-bold uppercase tracking-wider text-white/90 block mb-0.5 drop-shadow-xs">
                  Mobile Phone Number <span className="text-orange-400">*</span>
                </label>
                <div className="group relative flex items-center gap-2.5 p-1 rounded-2xl border border-white/35 dark:border-white/20 bg-white/25 dark:bg-black/40 backdrop-blur-md transition-all duration-300 focus-within:border-orange-400 focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-orange-500/30 focus-within:scale-[1.01] shadow-md">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/25 text-orange-300 backdrop-blur-xs flex items-center justify-center group-focus-within:bg-orange-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
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
                    className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold text-white placeholder:text-white/60 outline-none min-h-[42px]"
                  />
                </div>
              </motion.div>

              {/* Email Field (Translucent Glass Input Control) */}
              <motion.div variants={itemVariants}>
                <label htmlFor="reg-email" className="text-[10px] font-bold uppercase tracking-wider text-white/90 block mb-0.5 drop-shadow-xs">
                  Email Address <span className="text-white/70 font-normal lowercase">(optional)</span>
                </label>
                <div className="group relative flex items-center gap-2.5 p-1 rounded-2xl border border-white/35 dark:border-white/20 bg-white/25 dark:bg-black/40 backdrop-blur-md transition-all duration-300 focus-within:border-orange-400 focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-orange-500/30 focus-within:scale-[1.01] shadow-md">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/25 text-orange-300 backdrop-blur-xs flex items-center justify-center group-focus-within:bg-orange-500 group-focus-within:text-white transition-all duration-300 shadow-xs">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-transparent pr-3 py-2 text-xs sm:text-sm font-semibold text-white placeholder:text-white/60 outline-none min-h-[42px]"
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
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving Details…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Start Ordering
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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
              className="mt-3 text-center text-[10px] sm:text-[11px] text-white/80 font-medium drop-shadow-xs"
            >
              © 2026 Renechip Private Limited. All Rights Reserved.
            </motion.footer>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
