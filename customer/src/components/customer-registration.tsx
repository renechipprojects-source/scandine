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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 gradient-hero pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-float pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl animate-float pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md glass rounded-3xl p-6 md:p-8 shadow-glass border border-primary/20"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <QrCode className="h-3.5 w-3.5" /> {tableNumber ? `Table Scanned · ${tableNumber}` : "ScanDine Guest"}
          </div>
          <div className="flex justify-center mb-2">
            <img src="/scandine-customer-logo.png" alt="ScanDine" className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-md" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-1">
            <span className="text-white dark:text-white">Scan</span>
            <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-red-600 bg-clip-text text-transparent">Dine</span>
          </h1>
          <div className="text-xs sm:text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground mb-2">
            SCAN • ORDER • DINE
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Please register your details to view {tableNumber ? `${tableNumber} menu` : "the menu"} and place orders.
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Full Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded-2xl border bg-background/80 pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Phone Number <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
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
                className="w-full rounded-2xl border bg-background/80 pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Email Address <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@example.com (Optional)"
                className="w-full rounded-2xl border bg-background/80 pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full mt-6 rounded-2xl gradient-primary text-white font-semibold py-4 shadow-float flex items-center justify-center gap-2 transition disabled:opacity-75"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving Details…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Start Ordering
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-4 text-center text-[11px] text-muted-foreground">
          Your details are linked securely to {tableNumber} for this session.
        </div>
      </motion.div>
    </div>
  );
}
