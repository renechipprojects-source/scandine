import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { Card } from "@/admin/components/ui/card";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/admin/components/ui/dialog";
import {
  QrCode, ExternalLink, Printer, Sparkles, Check, Copy, RotateCcw, Trash2, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_app/qr")({
  head: () => ({
    meta: [
      { title: "Table QR Generator — Admin" },
      { name: "description", content: "Generate, popup, print and manage live table-specific QR codes for production deployment." },
    ],
  }),
  component: AdminQrPageRedesigned,
});

interface StoredTableQr {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

const DEFAULT_PRESET_TABLES: StoredTableQr[] = Array.from({ length: 6 }, (_, i) => ({
  id: `table-${i + 1}`,
  name: `Table ${i + 1}`,
  url: `/menu/${i + 1}`,
  createdAt: new Date().toISOString(),
}));

function AdminQrPageRedesigned() {
  const [tableInput, setTableInput] = useState("");
  const [customerAppUrl, setCustomerAppUrl] = useState("");
  const [isEnvMissing, setIsEnvMissing] = useState(false);
  const [storedTables, setStoredTables] = useState<StoredTableQr[]>(DEFAULT_PRESET_TABLES);
  
  // Popup Modal State
  const [activePopupTable, setActivePopupTable] = useState<StoredTableQr | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const envCustomerUrl = (import.meta.env.VITE_CUSTOMER_APP_URL || "").trim();
        if (!envCustomerUrl || envCustomerUrl.includes("your-customer-app")) {
          setIsEnvMissing(true);
          const fallbackOrigin = window.location.origin;
          setCustomerAppUrl(fallbackOrigin);
        } else {
          setIsEnvMissing(false);
          setCustomerAppUrl(envCustomerUrl.replace(/\/+$/, ""));
        }

        const savedTables = localStorage.getItem("savora_stored_table_qrs");
        if (savedTables) {
          setStoredTables(JSON.parse(savedTables));
        }
      } catch {}
    }
  }, []);

  const saveToStorage = (tables: StoredTableQr[]) => {
    setStoredTables(tables);
    try {
      localStorage.setItem("savora_stored_table_qrs", JSON.stringify(tables));
    } catch {}
  };

  const getTableUrl = (rawName: string) => {
    const envCustomerUrl = (import.meta.env.VITE_CUSTOMER_APP_URL || "").trim();
    const cleanHost = (envCustomerUrl && !envCustomerUrl.includes("your-customer-app"))
      ? envCustomerUrl.replace(/\/+$/, "")
      : (typeof window !== "undefined" ? window.location.origin : "");

    const rawDigits = rawName.replace(/\D/g, "");
    const tableNum = rawDigits || "1";
    return `${cleanHost}/menu/${tableNum}`;
  };

  const getQrImageUrl = (url: string) => {
    return `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=350&margin=2&ecLevel=H`;
  };

  const checkEnvOrNotify = (): boolean => {
    const envCustomerUrl = (import.meta.env.VITE_CUSTOMER_APP_URL || "").trim();
    if (!envCustomerUrl || envCustomerUrl.includes("your-customer-app")) {
      toast.error("VITE_CUSTOMER_APP_URL is not configured in .env file! Please set VITE_CUSTOMER_APP_URL in your environment variables.", { duration: 6000 });
      return false;
    }
    return true;
  };

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tableInput.trim()) {
      toast.error("Please enter a Table Number or Name.");
      return;
    }

    checkEnvOrNotify();

    const formattedName = tableInput.trim().toLowerCase().startsWith("table")
      ? tableInput.trim()
      : `Table ${tableInput.trim()}`;
    
    const url = getTableUrl(formattedName);
    const existingIndex = storedTables.findIndex(
      (t) => t.name.toLowerCase() === formattedName.toLowerCase()
    );

    let newTableObj: StoredTableQr;

    if (existingIndex >= 0) {
      newTableObj = { ...storedTables[existingIndex], url };
    } else {
      newTableObj = {
        id: `table-${Date.now()}`,
        name: formattedName,
        url,
        createdAt: new Date().toISOString(),
      };
      saveToStorage([newTableObj, ...storedTables]);
    }

    setActivePopupTable(newTableObj);
    toast.success(`Generated QR Code for ${formattedName}!`);
  };

  const handleOpenPopup = (tableObj: StoredTableQr) => {
    const freshUrl = getTableUrl(tableObj.name);
    setActivePopupTable({ ...tableObj, url: freshUrl });
  };

  const handleDeleteTable = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = storedTables.filter((t) => t.id !== id);
    saveToStorage(updated);
    toast.info("Removed table QR code.");
  };

  const handlePrintModal = () => {
    window.print();
  };

  const handleTestScan = (url: string, name: string) => {
    if (!checkEnvOrNotify() && (!url || url.includes("localhost"))) {
      toast.error("VITE_CUSTOMER_APP_URL environment variable is missing.");
    }
    window.open(url, "_blank");
    toast.success(`Opening Customer App for ${name}!`);
  };

  const handleCopyUrl = (url: string) => {
    checkEnvOrNotify();
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Customer QR Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Table QR Code Generator"
          description="Generate customer QR codes for table ordering using VITE_CUSTOMER_APP_URL."
          icon={<QrCode className="h-5 w-5" />}
        />

        {isEnvMissing && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Missing VITE_CUSTOMER_APP_URL configuration:</span> Add <code>VITE_CUSTOMER_APP_URL=https://your-customer-app.vercel.app</code> to your <code>frontend/.env</code> file so QR codes route to your Customer Application.
            </div>
          </div>
        )}

        {/* MAIN INPUT FORM */}
        <Card className="mb-8 p-6 shadow-md border-amber-500/20">
          <h2 className="text-base font-bold flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-amber-600" /> Enter Table Details
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Type the table number (e.g. <code>1</code>, <code>2</code>, <code>12</code>) to create instant customer QR URLs.
          </p>

          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Enter Table Number or Name (e.g. 5)"
                value={tableInput}
                onChange={(e) => setTableInput(e.target.value)}
                className="h-12 text-base px-4 font-semibold"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-12 px-8 bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 shadow-md"
            >
              <QrCode className="h-5 w-5" /> Generate QR Code
            </Button>
          </form>
        </Card>

        {/* SAVED & STORED TABLES GALLERY */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Stored Table QRs ({storedTables.length})
            </h3>
            <span className="text-xs text-muted-foreground">Click any card to popup & reprint</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {storedTables.map((tableObj) => {
              const liveUrl = getTableUrl(tableObj.name);
              const qrImg = getQrImageUrl(liveUrl);
              return (
                <div
                  key={tableObj.id}
                  onClick={() => handleOpenPopup(tableObj)}
                  className="group relative cursor-pointer rounded-2xl border bg-card p-4 transition-all hover:shadow-lg hover:border-amber-500 flex flex-col items-center text-center"
                >
                  <div className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-amber-500/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                    <Printer className="h-3.5 w-3.5" />
                  </div>

                  <div className="mt-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md">
                    ScanDine
                  </div>
                  <div className="font-display font-extrabold text-lg text-foreground mt-1 truncate max-w-[110px]">
                    {tableObj.name}
                  </div>

                  <div className="my-2 p-1 bg-white rounded-lg border shadow-sm">
                    <img src={qrImg} alt={tableObj.name} className="h-24 w-24 object-contain" />
                  </div>

                  <div className="text-[10px] font-semibold text-muted-foreground group-hover:text-amber-600 flex items-center gap-1">
                    <Printer className="h-3 w-3" /> Click to Reprint
                  </div>

                  <button
                    onClick={(e) => handleDeleteTable(tableObj.id, e)}
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                    title="Remove from list"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* POPUP MODAL WINDOW FOR GENERATED QR */}
      <Dialog open={!!activePopupTable} onOpenChange={(open) => !open && setActivePopupTable(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-600">
              <QrCode className="h-6 w-6" /> Live Table QR Code
            </DialogTitle>
          </DialogHeader>

          {activePopupTable && (
            <div className="flex flex-col items-center text-center py-2">
              <div className="bg-white text-slate-900 border border-slate-200 rounded-3xl p-6 w-full shadow-lg flex flex-col items-center">
                <div className="text-xs font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full mb-1">
                  ScanDine
                </div>
                <div className="font-display text-4xl font-extrabold text-slate-900 mt-1">
                  {activePopupTable.name.toUpperCase()}
                </div>
                <div className="text-xs text-slate-500 font-medium mb-4 mt-1">
                  Scan with smartphone camera to view menu & order
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                  <img
                    src={getQrImageUrl(activePopupTable.url)}
                    alt={activePopupTable.name}
                    className="h-56 w-56 object-contain rounded-xl"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-6 flex flex-col gap-2 w-full print:hidden">
                <Button
                  size="lg"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-sm shadow-md"
                  onClick={handlePrintModal}
                >
                  <Printer className="h-4 w-4" /> Print QR Card
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs gap-1"
                    onClick={() => handleTestScan(activePopupTable.url, activePopupTable.name)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Test Customer View
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-xs gap-1"
                    onClick={() => handleCopyUrl(activePopupTable.url)}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="ghost" className="w-full" onClick={() => setActivePopupTable(null)}>
              Done / Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
