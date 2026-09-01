import { useState } from "react";
import { motion } from "framer-motion";
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

  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden flex flex-col justify-center items-center px-4 py-6 relative select-none bg-background text-foreground">
      {/* Ambient Glowing Atmosphere & Luxury Restaurant Backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden w-full h-full">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-[3px] opacity-15 dark:opacity-20 scale-105"
          style={{ backgroundImage: `url('/customer-dining-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background/95 backdrop-blur-[2px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] sm:w-[480px] sm:h-[480px] rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-transparent blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-amber-500/15 via-orange-400/10 to-transparent blur-3xl" />
      </div>

      {/* FULL-SCREEN MOBILE APP CONTAINER */}
      <main className="w-full max-w-[400px] sm:max-w-md mx-auto my-auto relative z-10 flex flex-col items-center">
        {/* PREMIUM GLASSMORPHISM CARD */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full rounded-3xl bg-card/85 dark:bg-card/75 backdrop-blur-2xl border border-border/80 p-5 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]"
        >
          {/* Specular Soft Highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent rounded-t-3xl" />

          {/* Header */}
          <div className="text-center mb-4 sm:mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 mb-2.5 shadow-xs">
              <QrCode className="h-3.5 w-3.5" /> {tableNumber ? `Table Scanned · ${tableNumber}` : "ScanDine Guest"}
            </div>

            <div className="flex justify-center mb-1.5">
              <img
                src="/scandine-customer-logo.png"
                alt="ScanDine"
                className="h-11 sm:h-13 w-auto object-contain drop-shadow-md"
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
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
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
            </div>

            <div>
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
            </div>

            <div>
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-3.5 text-xs font-bold text-white shadow-[0_10px_25px_-5px_rgba(249,115,22,0.4)] hover:shadow-[0_14px_35px_-5px_rgba(249,115,22,0.6)] active:scale-[0.98] disabled:opacity-80 transition-all duration-300 cursor-pointer min-h-[46px]"
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
            </button>
          </form>
        </motion.div>

        <footer className="mt-4 text-center text-[11px] text-muted-foreground font-medium">
          © 2026 Renechip Private Limited. All Rights Reserved.
        </footer>
      </main>
    </div>
  );
}
