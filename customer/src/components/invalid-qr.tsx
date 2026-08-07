import { motion } from "framer-motion";
import { QrCode, AlertTriangle, RefreshCw } from "lucide-react";

interface InvalidQrScreenProps {
  message?: string;
}

export function InvalidQrScreen({ message }: InvalidQrScreenProps) {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 gradient-hero pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl animate-float pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-rose-500/10 blur-3xl animate-float pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md glass rounded-3xl p-6 md:p-8 shadow-glass border border-amber-500/30 text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 grid place-items-center text-amber-500">
            <AlertTriangle className="h-8 w-8" />
          </div>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-foreground">
          Invalid Table QR Code
        </h1>

        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {message || "The scanned QR code is invalid or missing a valid table number. Please scan the official QR code placed at your dining table to continue."}
        </p>

        <div className="glass rounded-2xl p-4 text-left text-xs space-y-2 mb-6 border border-border/50">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <QrCode className="h-4 w-4 text-primary" /> How to connect to your table:
          </div>
          <ol className="list-decimal list-inside text-muted-foreground space-y-1 pl-1">
            <li>Locate the QR code card on your table.</li>
            <li>Scan it using your phone camera app.</li>
            <li>You will automatically be routed to your table menu.</li>
          </ol>
        </div>

        <button
          onClick={handleReload}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full gradient-primary text-white font-semibold py-3.5 px-6 shadow-float hover:opacity-95 transition-opacity text-sm"
        >
          <RefreshCw className="h-4 w-4" /> Try Scanning Again
        </button>
      </motion.div>
    </div>
  );
}
