import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/reception/components/layout/PageHeader";
import { Card } from "@/reception/components/ui/card";
import { Button } from "@/reception/components/ui/button";
import { Input } from "@/reception/components/ui/input";
import { Label } from "@/reception/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/reception/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/reception/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/reception/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/reception/components/ui/tabs";
import { ClipboardList, Plus, Eye, Truck, Calendar, Building2, Phone, MapPin, Trash2, Loader2 } from "lucide-react";
import { restaurantInfo } from "@/reception/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/reception/_app/inventory/purchase-orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Purchase Orders & Suppliers — ScanDine" },
      { name: "description", content: "Manage suppliers and purchase orders with direct Supabase DB persistence." },
    ],
  }),
  component: POPage,
});

export interface SupplierRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  created_at?: string;
}

export interface PurchaseOrderRecord {
  id: string;
  supplier: string;
  items: number;
  total: number;
  date?: string;
  status: string;
  entry_type?: string;
  created_at?: string;
}

function POPage() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingPOs, setLoadingPOs] = useState(true);

  const [selectedPO, setSelectedPO] = useState<PurchaseOrderRecord | null>(null);
  const [selectedContactSupplier, setSelectedContactSupplier] = useState<SupplierRecord | null>(null);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState(false);
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);
  const [activeTab, setActiveTab] = useState("purchase-orders");

  // Helper to normalize Payment Terms to standard ERP procurement values
  const formatPaymentTerms = (val?: string) => {
    if (!val) return "Prepaid";
    const lower = val.toLowerCase();
    if (lower.includes("delivery") || lower.includes("pod") || lower.includes("cod") || lower.includes("cash on delivery")) {
      return "Pay on Delivery (POD)";
    }
    return "Prepaid";
  };

  // New PO form state
  const [poSupplier, setPoSupplier] = useState("");
  const [entryType, setEntryType] = useState("Direct Restock");
  const [itemsCount, setItemsCount] = useState("5");
  const [totalAmount, setTotalAmount] = useState("4500");
  const [poTerms, setPoTerms] = useState<string>("Prepaid");

  // New Supplier form state
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supAddress, setSupAddress] = useState("");

  // FETCH SUPPLIERS DIRECTLY FROM SUPABASE
  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    console.log("[SUPPLIER] FETCH START");
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("[SUPPLIER] FETCH RESULT", { data, error });

      if (error) {
        console.error("[SUPPLIER] FETCH ERROR", error);
        setSuppliers([]);
      } else if (data) {
        setSuppliers(data as SupplierRecord[]);
      } else {
        setSuppliers([]);
      }
    } catch (err: any) {
      console.error("[SUPPLIER] FETCH ERROR", err);
      setSuppliers([]);
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  // FETCH PURCHASE ORDERS DIRECTLY FROM SUPABASE
  const fetchPurchaseOrders = useCallback(async () => {
    setLoadingPOs(true);
    console.log("[PO] FETCH START");
    try {
      const { data, error } = await supabase
        .from("sd_purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("[PO] FETCH RESULT", { data, error });

      if (error) {
        console.error("[PO] FETCH ERROR", error);
        setPurchaseOrders([]);
      } else if (data) {
        setPurchaseOrders(data as PurchaseOrderRecord[]);
      } else {
        setPurchaseOrders([]);
      }
    } catch (err: any) {
      console.error("[PO] FETCH ERROR", err);
      setPurchaseOrders([]);
    } finally {
      setLoadingPOs(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchPurchaseOrders();
  }, [fetchSuppliers, fetchPurchaseOrders]);

  // INSERT NEW SUPPLIER INTO SUPABASE DATABASE
  const handleCreateSupplier = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log("[SUPPLIER] BUTTON CLICK");
    console.log("[SUPPLIER] SAVE START", { supName, supPhone, supAddress });

    const trimmedName = supName.trim();
    const trimmedPhone = supPhone.trim();
    const trimmedAddress = supAddress.trim();

    if (!trimmedName) {
      toast.error("Please enter Supplier Name");
      return;
    }
    if (!trimmedPhone) {
      toast.error("Please enter Phone Number");
      return;
    }
    if (!trimmedAddress) {
      toast.error("Please enter Address");
      return;
    }

    setIsSubmittingSupplier(true);

    const payload = {
      name: trimmedName,
      phone: trimmedPhone,
      address: trimmedAddress,
    };

    console.log("[SUPPLIER] INSERT PAYLOAD", payload);

    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert([payload])
        .select();

      console.log("[SUPPLIER] INSERT RESULT", { data, error });

      if (error) {
        console.error("[SUPPLIER] INSERT ERROR", error);
        toast.error(`Database Error: ${error.message}`);
        return;
      }

      console.log("[SUPPLIER] INSERT SUCCESS", data);
      toast.success(`Supplier "${trimmedName}" saved to database successfully!`);
      await fetchSuppliers();
      setPoSupplier(trimmedName);
      setSupName("");
      setSupPhone("");
      setSupAddress("");
      setIsCreateSupplierOpen(false);
    } catch (err: any) {
      console.error("[SUPPLIER] INSERT ERROR", err);
      toast.error(`Failed to insert supplier: ${err.message || String(err)}`);
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  // INSERT NEW PURCHASE ORDER INTO SUPABASE DATABASE
  const handleCreatePO = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log("[PO] BUTTON CLICK");
    console.log("[PO] SAVE START", { poSupplier, entryType, itemsCount, totalAmount, poTerms });

    const effectiveSupplier = poSupplier ? poSupplier.trim() : "";
    if (!effectiveSupplier) {
      toast.error("Please select a Supplier Name");
      return;
    }
    if (!entryType || !entryType.trim()) {
      toast.error("Please select an Entry Type");
      return;
    }
    if (!itemsCount || isNaN(Number(itemsCount)) || Number(itemsCount) <= 0) {
      toast.error("Item SKU count must be greater than 0");
      return;
    }
    if (totalAmount === "" || isNaN(Number(totalAmount)) || Number(totalAmount) < 0) {
      toast.error("Please enter a valid Total Amount");
      return;
    }
    if (!poTerms || !poTerms.trim()) {
      toast.error("Please select Payment Terms");
      return;
    }

    setIsSubmittingPO(true);
    const poId = `po_${Date.now()}`;

    try {
      const payload = {
        id: poId,
        supplier: effectiveSupplier,
        items: Number(itemsCount),
        total: Number(totalAmount),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: "pending",
        entry_type: entryType.trim(),
        payment_terms: poTerms.trim(),
      };

      console.log("[PO] INSERT PAYLOAD", payload);
      const { data, error } = await supabase
        .from("sd_purchase_orders")
        .insert([payload])
        .select();

      console.log("[PO] INSERT RESULT", { data, error });

      if (error) {
        console.error("[PO] INSERT ERROR", error);
        toast.error(`Database Error: ${error.message}`);
        return;
      }

      console.log("[PO] INSERT SUCCESS", data);
      toast.success(`Purchase Order ${poId} saved to database successfully!`);
      await fetchPurchaseOrders();
      setItemsCount("5");
      setTotalAmount("4500");
      setEntryType("Direct Restock");
      setPoTerms("Prepaid");
      setIsCreatePOOpen(false);
    } catch (err: any) {
      console.error("[PO] INSERT ERROR", err);
      toast.error(`Failed to create PO: ${err.message || String(err)}`);
    } finally {
      setIsSubmittingPO(false);
    }
  };

  // DELETE SUPPLIER FROM SUPABASE
  const handleDeleteSupplier = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) {
        toast.error(`Supabase Delete Error: ${error.message}`);
        return;
      }
      toast.success(`Supplier "${name}" deleted from database`);
      await fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete supplier");
    }
  };

  // DELETE PURCHASE ORDER FROM SUPABASE
  const handleDeletePO = async (id: string) => {
    try {
      const { error } = await supabase.from("sd_purchase_orders").delete().eq("id", id);
      if (error) {
        toast.error(`Supabase Delete Error: ${error.message}`);
        return;
      }
      toast.success(`Purchase Order ${id} deleted from database`);
      await fetchPurchaseOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete Purchase Order");
    }
  };

  const committedTotal = (purchaseOrders || []).reduce((s, p) => s + (p && !isNaN(Number(p.total)) ? Number(p.total) : 0), 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Today";
    if (dateStr === "Today" || dateStr === "Yesterday") return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders & Suppliers"
        description={`${purchaseOrders.length} Purchase Orders · ${restaurantInfo.currency}${committedTotal.toLocaleString()} committed · ${suppliers.length} Suppliers in Database`}
        icon={<ClipboardList className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* New Supplier Dialog */}
            <Dialog open={isCreateSupplierOpen} onOpenChange={setIsCreateSupplierOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" onClick={() => setIsCreateSupplierOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Add New Supplier
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSupplier} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="supplier-name">Supplier Name *</Label>
                    <Input
                      id="supplier-name"
                      placeholder="e.g. ABC Foods Supplier"
                      value={supName}
                      onChange={(e) => setSupName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="supplier-phone">Phone Number *</Label>
                    <Input
                      id="supplier-phone"
                      placeholder="e.g. +91 98765 43210"
                      value={supPhone}
                      onChange={(e) => setSupPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="supplier-address">Address *</Label>
                    <Input
                      id="supplier-address"
                      placeholder="e.g. Chennai, Tamil Nadu"
                      value={supAddress}
                      onChange={(e) => setSupAddress(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateSupplierOpen(false)}
                      disabled={isSubmittingSupplier}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmittingSupplier}
                    >
                      {isSubmittingSupplier ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving to DB...
                        </>
                      ) : (
                        "Save Supplier"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* New PO Dialog */}
            <Dialog open={isCreatePOOpen} onOpenChange={setIsCreatePOOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setIsCreatePOOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New PO
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Create New Purchase Order
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePO} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label>Supplier Name *</Label>
                    <Select
                      value={poSupplier || undefined}
                      onValueChange={setPoSupplier}
                      disabled={loadingSuppliers || suppliers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingSuppliers
                              ? "Loading suppliers..."
                              : suppliers.length === 0
                              ? "No suppliers available"
                              : "Select Supplier"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Entry Type *</Label>
                    <Select value={entryType} onValueChange={setEntryType}>
                      <SelectTrigger><SelectValue placeholder="Select Entry Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Direct Restock">Direct Restock</SelectItem>
                        <SelectItem value="Kitchen Raw Ingredients">Kitchen Raw Ingredients</SelectItem>
                        <SelectItem value="Beverages & Dairy">Beverages & Dairy</SelectItem>
                        <SelectItem value="Packaging & Consumables">Packaging & Consumables</SelectItem>
                        <SelectItem value="Equipment & Maintenance">Equipment & Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="po-items">Item SKU Counts *</Label>
                      <Input
                        id="po-items"
                        type="number"
                        min="1"
                        placeholder="5"
                        value={itemsCount}
                        onChange={(e) => setItemsCount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="po-total">Total Amount (₹) *</Label>
                      <Input
                        id="po-total"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="4500"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="po-terms">Payment Terms *</Label>
                    <Select value={poTerms} onValueChange={setPoTerms}>
                      <SelectTrigger id="po-terms" className="w-full"><SelectValue placeholder="Select Payment Terms" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Prepaid">Prepaid</SelectItem>
                        <SelectItem value="Pay on Delivery (POD)">Pay on Delivery (POD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    Creating this PO commits {restaurantInfo.currency}{Number(totalAmount || 0).toFixed(2)} to {poSupplier || "selected vendor"}.
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreatePOOpen(false)}
                      disabled={isSubmittingPO}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCreatePO();
                      }}
                      disabled={isSubmittingPO}
                    >
                      {isSubmittingPO ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving to DB...
                        </>
                      ) : (
                        "Save Purchase Order"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span>Purchase Orders ({purchaseOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Suppliers ({suppliers.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Purchase Orders Table */}
        <TabsContent value="purchase-orders" className="mt-4">
          <Card className="p-4 w-full border shadow-xs overflow-hidden">
            <div className="w-full max-h-[450px] overflow-y-auto overflow-x-auto border rounded-lg scrollbar-thin">
              <Table className="w-full">
                <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-md">
                  <TableRow className="bg-muted/40">
                    <TableHead>PO No</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Entry Type</TableHead>
                    <TableHead className="text-right">Item SKU Counts</TableHead>
                    <TableHead className="text-right">Total Amount ₹</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPOs ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Loading Purchase Orders from Supabase database...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No purchase orders found in database. Click "New PO" to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map((p, idx) => (
                      <TableRow key={`${p.id}-${idx}`} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs font-bold text-primary">{p.id}</TableCell>
                        <TableCell className="font-semibold">{p.supplier}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.entry_type || "Direct Restock"}</TableCell>
                        <TableCell className="text-right font-medium">{p.items} SKUs</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          {restaurantInfo.currency}{Number(p.total).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold border">
                            {p.payment_terms || formatPaymentTerms(p.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(p.created_at || p.date)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPO(p)}
                              title="View PO Details"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeletePO(p.id)}
                              title="Delete PO"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Suppliers Table */}
        <TabsContent value="suppliers" className="mt-4">
          <Card className="p-4 w-full border shadow-xs overflow-hidden">
            <div className="w-full max-h-[380px] overflow-y-auto overflow-x-auto border rounded-lg scrollbar-thin">
              <Table className="w-full">
                <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-md">
                  <TableRow className="bg-muted/40">
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSuppliers ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Loading Suppliers from Supabase database...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No suppliers found in database. Click "New Supplier" to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((s, idx) => (
                      <TableRow key={`${s.id}-${idx}`} className="hover:bg-muted/40">
                        <TableCell className="font-bold">{s.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {s.phone}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{s.address || "Main Warehouse"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(s.created_at)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteSupplier(s.id, s.name)}
                              title="Delete Supplier"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Purchase Order Modal Dialog */}
      <Dialog open={Boolean(selectedPO)} onOpenChange={(open) => !open && setSelectedPO(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          {selectedPO && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between text-base font-bold">
                  <span>Purchase Order {selectedPO.id}</span>
                  <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold border">
                    {selectedPO.payment_terms || formatPaymentTerms(selectedPO.status)}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm rounded-xl bg-muted/40 p-3.5 border">
                  <div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5 text-primary" /> Supplier
                    </span>
                    <div className="font-bold mt-0.5 text-foreground">{selectedPO.supplier}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Date Placed
                    </span>
                    <div className="font-medium text-xs mt-0.5">{formatDate(selectedPO.created_at || selectedPO.date)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Entry Type</span>
                    <div className="font-semibold text-xs mt-0.5">{selectedPO.entry_type || "Direct Restock"}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Quantity / Items</span>
                    <div className="font-semibold">{selectedPO.items} SKUs</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Payment Terms</span>
                    <div className="font-semibold text-xs text-emerald-600 mt-0.5">{selectedPO.payment_terms || formatPaymentTerms(selectedPO.status)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Notes</span>
                    <div className="font-medium text-xs text-muted-foreground mt-0.5">Verified inventory restock</div>
                  </div>
                  <div className="col-span-2 border-t pt-2.5 mt-1">
                    <span className="text-xs text-muted-foreground">Order Total Amount</span>
                    <div className="font-bold text-lg text-primary">{restaurantInfo.currency}{Number(selectedPO.total || 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setSelectedPO(null)} className="w-full sm:w-auto">
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Supplier Contact Modal Dialog */}
      <Dialog open={Boolean(selectedContactSupplier)} onOpenChange={(open) => !open && setSelectedContactSupplier(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          {selectedContactSupplier && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Contact {selectedContactSupplier.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="rounded-xl bg-muted/50 p-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Supplier</span>
                    <span className="font-bold">{selectedContactSupplier.name}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">Phone</span>
                    <span className="font-mono text-xs font-semibold">{selectedContactSupplier.phone}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">Address</span>
                    <span className="text-xs">{selectedContactSupplier.address || "Main Warehouse"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (selectedContactSupplier.phone && typeof window !== "undefined" && navigator?.clipboard) {
                        navigator.clipboard.writeText(selectedContactSupplier.phone);
                        toast.success("Phone number copied to clipboard!");
                      }
                    }}
                  >
                    Copy Phone Number
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}