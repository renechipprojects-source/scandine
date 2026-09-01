import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { QrCode, User, Phone, Mail, Sparkles, ArrowRight, Loader2, UtensilsCrossed } from "lucide-react";
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

  const pageVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const logoVariants: Variants = {
    hidden: { opacity: 0, scale: 0.85, y: 12 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] },
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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageVariants}
      className="min-h-[100dvh] w-full overflow-x-hidden flex flex-col justify-between p-3.5 sm:p-5 bg-background text-foreground select-none relative"
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .anim-ken-burns, .anim-shimmer-btn, .anim-badge-float {
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

        .anim-ken-burns {
          animation: kenBurnsSlow 14s ease-in-out infinite;
        }

        .anim-shimmer-btn {
          background-size: 200% 200%;
          animation: shimmerGlow 6s ease infinite;
        }
      `}</style>

      {/* Background Lighting Glow Pools */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden w-full h-full">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-full max-w-md h-[300px] bg-gradient-to-b from-orange-500/15 via-amber-500/10 to-transparent blur-3xl" />
      </div>

      {/* MOBILE APP CONTAINER SHELL */}
      <div className="w-full max-w-[430px] mx-auto flex-1 flex flex-col justify-between space-y-3">
        
        {/* TOP LAYERED RESTAURANT HERO CANVAS */}
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative w-full h-[28vh] min-h-[170px] max-h-[220px] rounded-3xl overflow-hidden border border-border/80 shadow-xl bg-card group"
        >
          {/* Photorealistic Restaurant Image with Ken-Burns Motion */}
          <div
            className="absolute inset-0 bg-cover bg-center anim-ken-burns"
            style={{ backgroundImage: `url('/customer-dining-bg.jpg')` }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-black/40" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(249,115,22,0.2),transparent_70%)]" />

          {/* Overlaid Table Badge & Logo */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 p-2 pt-4">
            <motion.div variants={logoVariants} initial="hidden" animate="visible" className="flex flex-col items-center">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 mb-1 backdrop-blur-xs">
                <QrCode className="h-3 w-3 animate-pulse" /> {tableNumber ? `Table Scanned · ${tableNumber}` : "ScanDine Guest"}
              </div>

              <img
                src="/scandine-customer-logo.png"
                alt="ScanDine"
                className="h-10 sm:h-12 w-auto object-contain mx-auto drop-shadow-md dark:brightness-110 dark:drop-shadow-[0_0_14px_rgba(255,255,255,0.3)]"
              />
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">
                Scan<span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">Dine</span>
              </h1>
              <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/90 drop-shadow-xs">
                SCAN • ORDER • DINE
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* BOTTOM INTEGRATED LAYERED FORM SURFACE WITH GENTLE FLOATING */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-full flex-1 rounded-3xl bg-card/95 dark:bg-card/85 backdrop-blur-2xl border border-border/80 p-4 sm:p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden"
        >
          {/* Top Glass Specular Highlight Edge */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent" />

          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full flex-1 flex flex-col justify-between">
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <motion.div variants={itemVariants} className="text-center mb-2">
                <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-xs mx-auto">
                  Please register your details to view {tableNumber ? `${tableNumber} menu` : "the menu"} and place orders.
                </p>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label htmlFor="reg-name" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                  Full Name <span className="text-orange-500">*</span>
                </label>
                <div className="relative flex items-center rounded-xl border border-border bg-muted/30 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:scale-[1.015] hover:border-border/80">
                  <User className="absolute left-3.5 h-4 w-4 text-muted-foreground transition-all duration-300 focus-within:text-orange-500" />
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[42px] sm:min-h-[44px]"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label htmlFor="reg-phone" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                  Mobile Phone Number <span className="text-orange-500">*</span>
                </label>
                <div className="relative flex items-center rounded-xl border border-border bg-muted/30 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:scale-[1.015] hover:border-border/80">
                  <Phone className="absolute left-3.5 h-4 w-4 text-muted-foreground transition-all duration-300 focus-within:text-orange-500" />
                  <input
                    id="reg-phone"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="10-digit mobile number"
                    className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[42px] sm:min-h-[44px]"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label htmlFor="reg-email" className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block mb-0.5">
                  Email Address <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                </label>
                <div className="relative flex items-center rounded-xl border border-border bg-muted/30 transition-all duration-300 focus-within:border-orange-500 focus-within:bg-background focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:scale-[1.015] hover:border-border/80">
                  <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground transition-all duration-300 focus-within:text-orange-500" />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[42px] sm:min-h-[44px]"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={loading}
                  className="group relative mt-1.5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-[0_10px_25px_-5px_rgba(249,115,22,0.4)] transition-all duration-300 hover:shadow-[0_14px_30px_-5px_rgba(249,115,22,0.5)] active:scale-[0.97] disabled:opacity-80 cursor-pointer min-h-[46px] sm:min-h-[48px] anim-shimmer-btn"
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
              </motion.div>
            </form>

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
    </motion.div>
  );
}
