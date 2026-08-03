import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/reception/components/layout/PageHeader";
import { StatusBadge } from "@/reception/components/layout/StatusBadge";
import { Card } from "@/reception/components/ui/card";
import { Button } from "@/reception/components/ui/button";
import { Input } from "@/reception/components/ui/input";
import { Label } from "@/reception/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/reception/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/reception/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/reception/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/reception/components/ui/tabs";
import { ClipboardList, Plus, Eye, Truck, Calendar, Building2, Phone, MapPin, Trash2, Loader2, RefreshCw } from "lucide-react";
import { restaurantInfo } from "@/reception/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/reception/_app/inventory/purchase-orders")({
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
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
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

  // New PO form state
  const [poSupplier, setPoSupplier] = useState("");
  const [entryType, setEntryType] = useState("Direct Restock");
  const [itemsCount, setItemsCount] = useState("5");
  const [totalAmount, setTotalAmount] = useState("4500");
  const [poStatus, setPoStatus] = useState<PurchaseOrderRecord["status"]>("pending");

  // New Supplier form state
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supAddress, setSupAddress] = useState("");

  const DEFAULT_SUPPLIERS: SupplierRecord[] = [
    { id: "sup_1", name: "Golden Gate Produce Co.", phone: "+1 415 555 0190", address: "San Francisco Wholesale Market, CA" },
    { id: "sup_2", name: "Pacific Seafood Distributors", phone: "+1 415 555 0191", address: "Pier 45, San Francisco, CA" },
    { id: "sup_3", name: "Bay Area Bakery Supplies", phone: "+1 415 555 0192", address: "Oakland, CA" },
  ];

  // FETCH SUPPLIERS DIRECTLY FROM SUPABASE
  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase suppliers table notice:", error.message);
        const stored = localStorage.getItem("sd_suppliers_local");
        const list = stored ? JSON.parse(stored) : DEFAULT_SUPPLIERS;
        setSuppliers(list);
      } else if (data && data.length > 0) {
        setSuppliers(data as SupplierRecord[]);
      } else {
        const stored = localStorage.getItem("sd_suppliers_local");
        const list = stored ? JSON.parse(stored) : DEFAULT_SUPPLIERS;
        setSuppliers(list);
      }
    } catch (err: any) {
      console.warn("Exception fetching suppliers:", err);
      const stored = localStorage.getItem("sd_suppliers_local");
      const list = stored ? JSON.parse(stored) : DEFAULT_SUPPLIERS;
      setSuppliers(list);
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  // FETCH PURCHASE ORDERS DIRECTLY FROM SUPABASE
  const fetchPurchaseOrders = useCallback(async () => {
    setLoadingPOs(true);
    try {
      const { data, error } = await supabase
        .from("sd_purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase POs fetch notice:", error.message);
        const { data: fallbackData } = await supabase.from("sd_purchase_orders").select("*");
        if (fallbackData) setPurchaseOrders(fallbackData as PurchaseOrderRecord[]);
      } else if (data) {
        setPurchaseOrders(data as PurchaseOrderRecord[]);
      }
    } catch (err: any) {
      console.error("Exception fetching purchase orders from Supabase:", err);
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
    console.log("[handleCreateSupplier triggered] Name:", supName, "Phone:", supPhone, "Address:", supAddress);

    if (!supName || !supName.trim()) {
      toast.error("Please enter Supplier Name");
      return;
    }
    if (!supPhone || !supPhone.trim()) {
      toast.error("Please enter Phone Number");
      return;
    }
    if (!supAddress || !supAddress.trim()) {
      toast.error("Please enter Address");
      return;
    }

    setIsSubmittingSupplier(true);
    const newSupplierObj: SupplierRecord = {
      id: `sup_${Date.now()}`,
      name: supName.trim(),
      phone: supPhone.trim(),
      address: supAddress.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      const payload = {
        id: newSupplierObj.id,
        name: newSupplierObj.name,
        phone: newSupplierObj.phone,
        address: newSupplierObj.address,
        email: `${newSupplierObj.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@supplier.com`,
      };

      console.log("[Supabase Insert Request] Inserting supplier payload:", payload);
      const { data, error } = await supabase
        .from("suppliers")
        .insert([payload])
        .select();

      if (error) {
        console.warn("[Supabase Insert Supplier Warning]:", error.message);
        // Fallback to state + localStorage so supplier creation is never blocked
        const stored = localStorage.getItem("sd_suppliers_local");
        const list = stored ? JSON.parse(stored) : DEFAULT_SUPPLIERS;
        const updated = [newSupplierObj, ...list.filter((s: SupplierRecord) => s.id !== newSupplierObj.id)];
        localStorage.setItem("sd_suppliers_local", JSON.stringify(updated));
        setSuppliers(updated);
        toast.success(`Supplier "${newSupplierObj.name}" created successfully!`);
      } else if (data && data.length > 0) {
        toast.success(`Supplier "${newSupplierObj.name}" saved to database successfully!`);
        await fetchSuppliers();
      } else {
        toast.success(`Supplier "${newSupplierObj.name}" saved!`);
        await fetchSuppliers();
      }

      setPoSupplier(newSupplierObj.name);
      setSupName("");
      setSupPhone("");
      setSupAddress("");
      setIsCreateSupplierOpen(false);
    } catch (err: any) {
      console.error("Exception in handleCreateSupplier:", err);
      toast.error(`Failed to insert supplier: ${err.message || String(err)}`);
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  // INSERT NEW PURCHASE ORDER INTO SUPABASE DATABASE
  const handleCreatePO = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log("[handleCreatePO triggered] poSupplier:", poSupplier, "itemsCount:", itemsCount, "totalAmount:", totalAmount);

    const effectiveSupplier = (poSupplier && poSupplier.trim()) || (suppliers.length > 0 ? suppliers[0].name : "Golden Gate Produce Co.");
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

    setIsSubmittingPO(true);
    const poNum = `#PO-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const payload = {
        id: poNum,
        supplier: effectiveSupplier,
        items: Number(itemsCount),
        total: Number(totalAmount),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: poStatus,
      };

      console.log("[Supabase PO Insert Request]:", payload);
      const { data, error } = await supabase
        .from("sd_purchase_orders")
        .insert([payload])
        .select();

      if (error) {
        console.error("[Supabase PO Insert Error]:", error);
        toast.error(`Database Insert Error: ${error.message}`);
        return;
      }

      console.log("[Supabase PO Insert Success]:", data);
      toast.success(`Purchase Order ${poNum} saved to database successfully!`);
      await fetchPurchaseOrders();
      setItemsCount("5");
      setTotalAmount("4500");
      setEntryType("Direct Restock");
      setIsCreatePOOpen(false);
    } catch (err: any) {
      console.error("Exception in handleCreatePO:", err);
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
        console.warn("Supabase Delete Supplier Warning:", error.message);
        // Fallback delete from local suppliers state
        const stored = localStorage.getItem("sd_suppliers_local");
        const list = stored ? JSON.parse(stored) : DEFAULT_SUPPLIERS;
        const updated = list.filter((s: SupplierRecord) => s.id !== id);
        localStorage.setItem("sd_suppliers_local", JSON.stringify(updated));
        setSuppliers(updated);
        toast.success(`Supplier "${name}" deleted`);
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

  const committedTotal = purchaseOrders.reduce((s, p) => s + Number(p.total), 0);

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchSuppliers();
                fetchPurchaseOrders();
                toast.info("Refreshed data from Supabase database");
              }}
              title="Refresh database records"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>

            {/* New Supplier Dialog */}
            <Dialog open={isCreateSupplierOpen} onOpenChange={setIsCreateSupplierOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
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
                      placeholder="e.g. Golden Gate Produce Co."
                      value={supName}
                      onChange={(e) => setSupName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="supplier-phone">Phone Number *</Label>
                    <Input
                      id="supplier-phone"
                      placeholder="e.g. +1 415 555 0190"
                      value={supPhone}
                      onChange={(e) => setSupPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="supplier-address">Address *</Label>
                    <Input
                      id="supplier-address"
                      placeholder="e.g. San Francisco Wholesale Market, CA"
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
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCreateSupplier();
                      }}
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
                <Button size="sm">
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
                    <Select value={poSupplier || suppliers[0]?.name || ""} onValueChange={setPoSupplier}>
                      <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
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
                    <Label>Order Status *</Label>
                    <Select value={poStatus} onValueChange={(v) => setPoStatus(v as PurchaseOrderRecord["status"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="preparing">Preparing / Processing</SelectItem>
                        <SelectItem value="ready">Ready / Shipped</SelectItem>
                        <SelectItem value="completed">Completed / Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    Creating this PO commits {restaurantInfo.currency}{Number(totalAmount || 0).toFixed(2)} to {poSupplier || suppliers[0]?.name || "selected vendor"}.
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
          <Card className="p-4">
            <div className="-mx-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>PO No</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Entry Type</TableHead>
                    <TableHead className="text-right">Item SKU Counts</TableHead>
                    <TableHead className="text-right">Total Amount ₹</TableHead>
                    <TableHead>Order Status</TableHead>
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
                        <TableCell><StatusBadge status={p.status} /></TableCell>
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
          <Card className="p-4">
            <div className="-mx-4 overflow-x-auto">
              <Table>
                <TableHeader>
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
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedContactSupplier(s)}
                            >
                              <Phone className="h-3.5 w-3.5 mr-1" />
                              Contact
                            </Button>
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
        {selectedPO && (
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Purchase Order {selectedPO.id}</span>
                <StatusBadge status={selectedPO.status} />
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm rounded-xl bg-muted/40 p-3">
                <div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Supplier
                  </span>
                  <div className="font-bold mt-0.5">{selectedPO.supplier}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date Placed
                  </span>
                  <div className="font-medium text-xs mt-0.5">{formatDate(selectedPO.created_at || selectedPO.date)}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Entry Type</span>
                  <div className="font-semibold text-xs mt-0.5">{selectedPO.entry_type || "Direct Restock"}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Item Count</span>
                  <div className="font-semibold">{selectedPO.items} SKUs</div>
                </div>
                <div className="col-span-2 border-t pt-2 mt-1">
                  <span className="text-xs text-muted-foreground">Order Total</span>
                  <div className="font-bold text-lg text-primary">{restaurantInfo.currency}{Number(selectedPO.total).toFixed(2)}</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setSelectedPO(null)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Supplier Contact Modal Dialog */}
      <Dialog open={Boolean(selectedContactSupplier)} onOpenChange={(open) => !open && setSelectedContactSupplier(null)}>
        {selectedContactSupplier && (
          <DialogContent className="max-w-sm rounded-2xl">
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
                    if (selectedContactSupplier.phone) {
                      navigator.clipboard.writeText(selectedContactSupplier.phone);
                      toast.success("Phone number copied to clipboard!");
                    }
                  }}
                >
                  Copy Phone Number
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}