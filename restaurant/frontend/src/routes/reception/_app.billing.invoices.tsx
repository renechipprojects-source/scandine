import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/reception/components/layout/PageHeader";
import { StatusBadge } from "@/reception/components/layout/StatusBadge";
import { Card } from "@/reception/components/ui/card";
import { Button } from "@/reception/components/ui/button";
import { Input } from "@/reception/components/ui/input";
import { Label } from "@/reception/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/reception/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/reception/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/reception/components/ui/dialog";
import { Receipt, Search, Download, Printer, Split, CheckCircle2, Plus, Users, Calculator, Loader2 } from "lucide-react";
import { restaurantInfo } from "@/reception/lib/mock-data";
import { useState, useCallback, useMemo } from "react";
import { useSupabaseTable, markPaymentAndInvoiceAsPaid, type Invoice, type PaymentTransaction, type Order } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { exportToCSV } from "@/admin/lib/exportUtils";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { resolvePaymentMethod, normalizePaymentStatus } from "@/lib/payment-utils";

export const Route = createFileRoute("/reception/_app/billing/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — ScanDine Reception" },
      { name: "description", content: "Manage restaurant invoices, split bills, GST breakdowns and payments." },
    ],
  }),
  component: ReceptionInvoicesPage,
});

const formatINR = (val: number) => {
  return "₹" + Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function ReceptionInvoicesPage() {
  const { data: dbOrders, fetchData: fetchOrders } = useSupabaseTable<Order>("sd_orders");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);

  // New Invoice form state
  const [newCustName, setNewCustName] = useState("");
  const [newMethod, setNewMethod] = useState("Cash");
  const [newAmount, setNewAmount] = useState("");
  const [newDiscount, setNewDiscount] = useState("0");
  const [newStatus, setNewStatus] = useState<"Paid" | "Unpaid">("Unpaid");
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Split Bill form state
  const [splitTargetInvoice, setSplitTargetInvoice] = useState<string>("");
  const [splitCount, setSplitCount] = useState<number>(2);

  const handleRealtimePayload = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useRealtimeTable("sd_orders", handleRealtimePayload);

  // Derive invoices list directly from canonical sd_orders table
  const invoicesList: Invoice[] = useMemo(() => {
    return dbOrders.map((ord) => {
      const ordKey = `INV-${ord.order_id || ord.id}`;
      const isPaid = ord.payment === "paid" || (ord as any).payment_status === "paid";
      return {
        id: ord.id,
        invoice: ordKey,
        transition: ord.order_id || ord.id,
        customer: (ord as any).customer_name || ord.customer || "Customer",
        method: resolvePaymentMethod(ord),
        amount: Number(ord.total) || 0,
        status: isPaid ? "Paid" : "Unpaid",
        date: ord.order_time || ord.created_at || new Date().toISOString(),
      };
    });
  }, [dbOrders]);

  const totalBilled = invoicesList.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const paidTotal = invoicesList.filter((i) => i.status?.toLowerCase() === "paid").reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const unpaidTotal = invoicesList.filter((i) => i.status?.toLowerCase() !== "paid").reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const avgInvoice = invoicesList.length > 0 ? totalBilled / invoicesList.length : 0;

  const filtered = invoicesList.filter((inv) => {
    const q = searchQuery.toLowerCase();
    return (
      (inv.invoice && inv.invoice.toLowerCase().includes(q)) ||
      (inv.id && inv.id.toLowerCase().includes(q)) ||
      (inv.customer && inv.customer.toLowerCase().includes(q)) ||
      (inv.method && inv.method.toLowerCase().includes(q)) ||
      (inv.status && inv.status.toLowerCase().includes(q))
    );
  });

  const handleMarkAsPaid = async (inv: Invoice) => {
    try {
      const invId = inv.invoice || inv.id;
      const targetMethod = "Cash";
      await markPaymentAndInvoiceAsPaid(inv.id, invId, inv.customer, Number(inv.amount), targetMethod);
      await fetchOrders();
      toast.success(`Invoice ${invId} marked as Paid (${targetMethod}) successfully!`);

      if (selectedInvoice && (selectedInvoice.id === inv.id || selectedInvoice.invoice === inv.invoice)) {
        setSelectedInvoice({
          ...selectedInvoice,
          status: "Paid",
          method: targetMethod,
          date: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error("Failed to mark invoice as paid:", err);
      toast.error(err?.message || "Failed to update invoice payment status.");
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      toast.error("Please enter Customer Name");
      return;
    }
    if (!newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0) {
      toast.error("Please enter a valid bill amount (greater than 0)");
      return;
    }

    setIsSubmittingInvoice(true);
    const generatedInvId = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowIso = new Date().toISOString();
    const billAmt = Number(newAmount);

    try {
      if (isSupabaseConfigured) {
        const payload = {
          order_id: generatedInvId,
          customer: newCustName.trim(),
          customer_name: newCustName.trim(),
          total: billAmt,
          subtotal: billAmt,
          tax: 0,
          payment: normalizePaymentStatus(newStatus),
          status: "completed",
          order_time: nowIso,
          table_number: 1,
          item: [{ name: "Manual Invoice Charge", price: billAmt, quantity: 1, payment_method: newMethod }],
        };
        const { error } = await supabase.from("sd_orders").insert([payload]);
        if (error) {
          console.warn("Supabase order insert warning:", error.message);
        }
      }

      await fetchOrders();

      toast.success(`Invoice ${generatedInvId} created successfully!`);
      setNewCustName("");
      setNewAmount("");
      setNewDiscount("0");
      setIsCreateInvoiceOpen(false);
    } catch (err: any) {
      console.error("Failed to create invoice:", err);
      toast.error(`Error creating invoice: ${err.message || String(err)}`);
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error("No invoices to export");
      return;
    }
    const exportRows = filtered.map((inv) => ({
      "Invoice Number": inv.invoice || inv.id,
      "Customer": inv.customer,
      "Date": inv.date ? new Date(inv.date).toLocaleDateString() : "Today",
      "Method": inv.method || "Cash",
      "Total Amount (₹)": inv.amount,
      "Status": inv.status,
    }));
    exportToCSV("reception_invoices", exportRows);
    toast.success("Invoices exported to CSV!");
  };

  // Derive target invoice for Split Bill
  const activeSplitInv = invoicesList.find((i) => (i.invoice || i.id) === splitTargetInvoice) || invoicesList[0];
  const splitBillAmount = activeSplitInv ? Number(activeSplitInv.amount || 0) : 0;
  const perGuestAmount = splitCount > 0 ? splitBillAmount / splitCount : splitBillAmount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description={`${invoicesList.length} invoices · ${formatINR(totalBilled)} total billed`}
        icon={<Receipt className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Paid Revenue", value: formatINR(paidTotal), tone: "text-emerald-600 dark:text-emerald-400" },
          { label: "Pending / Unpaid", value: formatINR(unpaidTotal), tone: "text-amber-600 dark:text-amber-400" },
          { label: "Total Invoices", value: `${invoicesList.length}`, tone: "text-foreground" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-1 font-display text-2xl font-bold ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Search & Table Card */}
      <Card className="w-full p-4 border shadow-xs overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reception-invoices-search"
              name="invoicesSearch"
              placeholder="Search by Invoice ID, Customer Name or Payment Method…"
              aria-label="Search by Invoice ID, Customer Name or Payment Method"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Table className="w-full min-w-[750px]" containerClassName="max-h-[420px] overflow-y-auto overflow-x-auto scrollbar-thin rounded-lg border border-border bg-card shadow-xs relative">
          <TableHeader className="sticky top-0 z-30 bg-muted/95 backdrop-blur-md shadow-xs border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Invoice Number</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Customer</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Date</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Payment Method</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 text-right font-semibold text-foreground">Total</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Status</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 text-right font-semibold text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No invoices found. Click "Create Invoice" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inv) => {
                  const normStatus = normalizePaymentStatus(inv.status);
                  const isUnpaid = normStatus === "Unpaid" || normStatus === "Pending";
                  const method = resolvePaymentMethod(inv);
                  const canMarkAsPaid = isUnpaid && method === "Cash";
                  const isPaid = normStatus === "Paid";

                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {inv.invoice || inv.id}
                      </TableCell>
                      <TableCell className="font-semibold">{inv.customer}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.date ? (isNaN(Date.parse(inv.date)) ? inv.date : new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : "Today"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        <span className={`rounded-md px-2 py-0.5 ${method === "UPI" ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-semibold" : "bg-muted text-foreground"}`}>{method}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        {formatINR(Number(inv.amount))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={isPaid ? "Paid" : isUnpaid ? "Unpaid" : inv.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canMarkAsPaid ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              onClick={() => handleMarkAsPaid(inv)}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark as Paid
                            </Button>
                          ) : isPaid ? (
                            <Button size="sm" variant="ghost" disabled className="h-7 text-xs text-emerald-600 font-semibold opacity-90">
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Paid ({method})
                            </Button>
                          ) : (
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-md border border-amber-200/50">
                              {method === "UPI" ? "Awaiting UPI Payment" : normStatus}
                            </span>
                          )}
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedInvoice(inv)}>
                            Preview Invoice
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
      </Card>

      {/* Invoice Preview Modal Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Invoice Preview — {selectedInvoice?.invoice || selectedInvoice?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div>
              <InvoicePreview inv={selectedInvoice} onMarkPaid={handleMarkAsPaid} />
              <DialogFooter className="mt-4 flex flex-row gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print Invoice
                </Button>
                <Button variant="default" size="sm" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create New Invoice Dialog */}
      <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create New Invoice
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="cust-name">Customer Name *</Label>
              <Input
                id="cust-name"
                name="custName"
                placeholder="e.g. Amelia Chen"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bill-amount">Bill Total (₹) *</Label>
                <Input
                  id="bill-amount"
                  name="billAmount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="1250"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pay-method">Payment Method *</Label>
                <Select value={newMethod} onValueChange={setNewMethod}>
                  <SelectTrigger id="pay-method" aria-label="Payment Method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI / GPay">UPI / GPay</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                    <SelectItem value="Razorpay">Razorpay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-status">Payment Status *</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as "Paid" | "Unpaid")}>
                <SelectTrigger id="inv-status" aria-label="Payment Status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unpaid">Unpaid / Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calculations Breakdown */}
            {newAmount && !isNaN(Number(newAmount)) && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatINR(Number(newAmount) * 0.95)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (5%)</span>
                  <span>{formatINR(Number(newAmount) * 0.05)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1 text-sm text-primary">
                  <span>Grand Total Billed</span>
                  <span>{formatINR(Number(newAmount))}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsCreateInvoiceOpen(false)} disabled={isSubmittingInvoice}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingInvoice}>
                {isSubmittingInvoice ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  "Save Invoice"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Split Bill Dialog */}
      <Dialog open={isSplitBillOpen} onOpenChange={setIsSplitBillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Split className="h-5 w-5 text-primary" />
              Split Bill Calculator
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1">
              <Label htmlFor="split-invoice-select">Select Invoice to Split</Label>
              <Select
                value={splitTargetInvoice || (invoicesList[0]?.invoice || invoicesList[0]?.id || "")}
                onValueChange={setSplitTargetInvoice}
              >
                <SelectTrigger id="split-invoice-select" aria-label="Select Invoice to Split"><SelectValue placeholder="Select Invoice" /></SelectTrigger>
                <SelectContent>
                  {invoicesList.map((inv) => (
                    <SelectItem key={inv.id} value={inv.invoice || inv.id}>
                      {inv.invoice || inv.id} — {inv.customer} ({formatINR(Number(inv.amount))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Number of Guests / Splits</Label>
              <div className="flex items-center gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant={splitCount === num ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSplitCount(num)}
                  >
                    {num} Guests
                  </Button>
                ))}
              </div>
            </div>

            {activeSplitInv && (
              <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Original Invoice Total</span>
                  <span className="font-bold text-sm">{formatINR(splitBillAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t pt-2">
                  <span className="text-muted-foreground">Number of Guests</span>
                  <span className="font-semibold">{splitCount} Guests</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2 text-base font-bold text-primary">
                  <span>Amount Per Guest</span>
                  <span>{formatINR(perGuestAmount)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setIsSplitBillOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  toast.success(`Bill split equally into ${splitCount} parts of ${formatINR(perGuestAmount)} each!`);
                  setIsSplitBillOpen(false);
                }}
              >
                Apply Split
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoicePreview({ inv, onMarkPaid }: { inv: Invoice; onMarkPaid: (inv: Invoice) => void }) {
  const amt = Number(inv.amount) || 0;
  const normStatus = normalizePaymentStatus(inv.status);
  const isUnpaid = normStatus === "Unpaid" || normStatus === "Pending";
  const method = resolvePaymentMethod(inv);
  const canMarkAsPaid = isUnpaid && method === "Cash";
  const isPaid = normStatus === "Paid";

  const subtotal = amt * 0.95;
  const gst = amt * 0.05;

  return (
    <Card className="mt-2 p-6 shadow-xs border">
      <div className="text-center">
        <div className="font-display text-2xl font-bold tracking-tight text-foreground">ScanDine</div>
        <div className="text-xs text-muted-foreground">{restaurantInfo.branch}</div>
        <div className="mt-1 text-xs text-muted-foreground">{restaurantInfo.address}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-y py-3 text-xs">
        <div>
          <span className="text-muted-foreground">Invoice No:</span>
          <div className="font-bold text-primary">{inv.invoice || inv.id}</div>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Date:</span>
          <div className="font-semibold">{inv.date ? new Date(inv.date).toLocaleDateString() : "Today"}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Customer:</span>
          <div className="font-semibold">{inv.customer}</div>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Method:</span>
          <div className="font-semibold">{method}</div>
        </div>
      </div>

      {/* Itemized Calculation */}
      <div className="mt-4 space-y-1.5 border-t pt-3 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatINR(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">GST (5%)</span>
          <span>{formatINR(gst)}</span>
        </div>
        <div className="flex justify-between text-emerald-600">
          <span>Discount</span>
          <span>−₹0.00</span>
        </div>
        <div className="mt-2 flex justify-between border-t pt-2 font-display text-lg font-bold text-foreground">
          <span>Grand Total</span>
          <span className="text-primary">{formatINR(amt)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-2 text-xs">
        <div>Payment Method · <span className="font-semibold">{method}</span></div>
        <StatusBadge status={isPaid ? "Paid" : isUnpaid ? "Unpaid" : inv.status} />
      </div>

      {canMarkAsPaid ? (
        <Button
          size="sm"
          className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          onClick={() => onMarkPaid(inv)}
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark Payment as Paid
        </Button>
      ) : isPaid ? (
        <Button size="sm" variant="ghost" disabled className="mt-3 w-full text-emerald-600 font-semibold opacity-90">
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> Paid ({method})
        </Button>
      ) : (
        <div className="mt-3 text-center p-2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-semibold">
          {method === "UPI" ? "Awaiting Customer UPI Payment" : normStatus}
        </div>
      )}
    </Card>
  );
}
