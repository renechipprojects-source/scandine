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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden flex flex-col justify-center items-center px-4 py-6 relative select-none bg-background text-foreground [perspective:1000px]">
      {/* CSS Keyframe Animations for Professional 3D Motion & Parallax */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .anim-plate-1, .anim-plate-2, .anim-plate-3, .anim-plate-4,
          .anim-particle-1, .anim-particle-2, .anim-particle-3,
          .anim-ambient-light {
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

        .anim-plate-1 { animation: plate3D1 7.5s ease-in-out infinite; }
        .anim-plate-2 { animation: plate3D2 9.5s ease-in-out infinite; }
        .anim-plate-3 { animation: plate3D3 8.5s ease-in-out infinite 0.5s; }
        .anim-plate-4 { animation: plate3D4 10.5s ease-in-out infinite 1s; }
        .anim-particle-1 { animation: floatParticle1 11s ease-in-out infinite; }
        .anim-particle-2 { animation: floatParticle2 13s ease-in-out infinite 1.5s; }
        .anim-particle-3 { animation: floatParticle3 9s ease-in-out infinite 0.8s; }
        .anim-ambient-light { animation: ambientLightShift 12s ease-in-out infinite; }
      `}</style>

      {/* Ambient Glowing Atmosphere & Luxury Restaurant Backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden w-full h-full">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-[3px] opacity-15 dark:opacity-20 scale-105"
          style={{ backgroundImage: `url('/customer-dining-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background/95 backdrop-blur-[2px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] sm:w-[480px] sm:h-[480px] rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-transparent blur-3xl anim-ambient-light" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-amber-500/15 via-orange-400/10 to-transparent blur-3xl" />
      </div>

      {/* FULL-SCREEN MOBILE APP CONTAINER */}
      <main className="w-full max-w-[400px] sm:max-w-md mx-auto my-auto relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-full overflow-visible"
        >
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

          {/* PREMIUM GLASSMORPHISM CARD */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full rounded-3xl bg-card/85 dark:bg-card/75 backdrop-blur-2xl border border-border/80 p-5 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]"
          >
            {/* Specular Soft Highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent rounded-t-3xl" />

            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {/* Header */}
              <motion.div variants={itemVariants} className="text-center mb-4 sm:mb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 mb-2.5 shadow-xs">
                  <QrCode className="h-3.5 w-3.5 animate-pulse" /> {tableNumber ? `Table Scanned · ${tableNumber}` : "ScanDine Guest"}
                </div>

                <div className="flex justify-center mb-1.5">
                  <motion.img
                    whileHover={{ scale: 1.06, rotate: [0, -1.5, 1.5, 0] }}
                    transition={{ duration: 0.3 }}
                    src="/scandine-customer-logo.png"
                    alt="ScanDine"
                    className="h-11 sm:h-13 w-auto object-contain drop-shadow-md dark:brightness-110 dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                  />
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-0.5 text-foreground">
                  Scan<span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">Dine</span>
                </h1>
                <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">
                  SCAN • ORDER • DINE
                </div>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-xs mx-auto">
                  Please register your details to view {tableNumber ? `${tableNumber} menu` : "the menu"} and place orders.
                </p>
              </motion.div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <motion.div variants={itemVariants}>
                  <label htmlFor="cust-reg-name" className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 block mb-1">
                    Full Name <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl border border-border bg-muted/40 transition-all duration-300 focus-within:border-primary focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 hover:border-border/80">
                    <User className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      id="cust-reg-name"
                      name="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[44px]"
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label htmlFor="cust-reg-phone" className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 block mb-1">
                    Phone Number <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl border border-border bg-muted/40 transition-all duration-300 focus-within:border-primary focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 hover:border-border/80">
                    <Phone className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
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
                      className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[44px]"
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label htmlFor="cust-reg-email" className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 block mb-1">
                    Email Address <span className="text-muted-foreground font-normal lowercase">(Optional)</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl border border-border bg-muted/40 transition-all duration-300 focus-within:border-primary focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 hover:border-border/80">
                    <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      id="cust-reg-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your mail"
                      className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[44px]"
                    />
                  </div>
                </motion.div>

                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-3.5 text-xs font-bold text-white shadow-[0_10px_25px_-5px_rgba(249,115,22,0.4)] hover:shadow-[0_14px_35px_-5px_rgba(249,115,22,0.6)] active:scale-[0.99] disabled:opacity-80 transition-all duration-300 cursor-pointer min-h-[46px]"
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
              </form>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 text-center text-[11px] text-muted-foreground font-medium"
        >
          © 2026 Renechip Private Limited. All Rights Reserved.
        </motion.footer>
      </main>
    </div>
  );
}
