import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/reception/components/layout/PageHeader";
import { Card } from "@/reception/components/ui/card";
import { Button } from "@/reception/components/ui/button";
import { Input } from "@/reception/components/ui/input";
import { Avatar, AvatarFallback } from "@/reception/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/reception/components/ui/table";
import { Users, Search, Download, Mail, Phone, Utensils } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useSupabaseTable, type Order } from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { exportToCSV } from "@/admin/lib/exportUtils";
import { toast } from "sonner";

export const Route = createFileRoute("/reception/_app/customers")({
  head: () => ({ meta: [{ title: "Customers — ScanDine" }, { name: "description", content: "Live Customer directory and order history." }] }),
  component: CustomersPage,
});

interface CustomerEntry {
  id: string;
  rawId: string;
  name: string;
  phone: string;
  email: string;
  tableNumber: string | number;
  orderCount: number;
  totalSpent: number;
  latestStatus: string;
}

function CustomersPage() {
  const { data: dbOrders, fetchData: fetchOrders } = useSupabaseTable<Order>("sd_orders");
  const { data: dbCustomers, fetchData: fetchCustomers } = useSupabaseTable<any>("sd_customers");
  const [searchQuery, setSearchQuery] = useState("");

  const handleRealtimePayload = useCallback(() => {
    fetchOrders();
    fetchCustomers();
  }, [fetchOrders, fetchCustomers]);

  useRealtimeTable("sd_orders", handleRealtimePayload);
  useRealtimeTable("sd_customers", handleRealtimePayload);

  // Derive unique customer directory dynamically from sd_customers and sd_orders
  const customersList: CustomerEntry[] = useMemo(() => {
    const custMap = new Map<string, CustomerEntry>();

    // 1. Incorporate registered customers from sd_customers
    (dbCustomers || []).forEach((c: any) => {
      const id = String(c.id || "").trim();
      const name = String(c.name || c.full_name || c.customer_name || "Guest Customer").trim();
      const phone = String(c.phone || c.customer_phone || c.mobile || "").trim();
      const email = String(c.email || c.customer_email || "").trim();
      const key = (id || phone || email || name).toLowerCase();

      if (!key) return;

      custMap.set(key, {
        id: id || key,
        rawId: id || key,
        name: name || "Guest Customer",
        phone: phone || "N/A",
        email: email || "N/A",
        tableNumber: "N/A",
        orderCount: 0,
        totalSpent: 0,
        latestStatus: "registered",
      });
    });

    // 2. Aggregate active order records from sd_orders
    (dbOrders || []).forEach((o: any) => {
      const orderCustId = String(o.customer_id || o.user_id || "").trim();
      const name = String(o.customer_name || o.customer || o.name || "Guest Customer").trim();
      const phone = String(o.customer_phone || o.phone || o.mobile || "").trim();
      const email = String(o.customer_email || o.email || "").trim();
      const rawTable = o.table_number || (o as any).table;
      const tableStr = rawTable ? String(rawTable).trim() : "N/A";

      const keyCandidates = [
        orderCustId.toLowerCase(),
        phone.toLowerCase(),
        email.toLowerCase(),
        name.toLowerCase(),
      ].filter(Boolean);

      let key = keyCandidates.find((k) => custMap.has(k)) || keyCandidates[0] || `guest_${Date.now()}`;

      if (!custMap.has(key)) {
        const primaryId = orderCustId || o.id || key;
        custMap.set(key, {
          id: primaryId,
          rawId: primaryId,
          name,
          phone: phone || "N/A",
          email: email || "N/A",
          tableNumber: tableStr,
          orderCount: 1,
          totalSpent: Number(o.total || o.subtotal || 0),
          latestStatus: String(o.status || "pending").toLowerCase(),
        });
      } else {
        const existing = custMap.get(key)!;
        existing.orderCount += 1;
        existing.totalSpent += Number(o.total || o.subtotal || 0);
        if (tableStr !== "N/A") existing.tableNumber = tableStr;
        if (o.status) existing.latestStatus = String(o.status).toLowerCase();
        if (existing.phone === "N/A" && phone) existing.phone = phone;
        if (existing.email === "N/A" && email) existing.email = email;
        if (existing.name === "Guest Customer" && name !== "Guest Customer") existing.name = name;
      }
    });

    return Array.from(custMap.values());
  }, [dbCustomers, dbOrders]);

  // Search filter mapping across all visible customer fields: Name, Phone, Email, ID, Table, Status
  const filteredCustomers = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    if (!rawQuery) return customersList;

    const digitsOnlyQuery = rawQuery.replace(/\D/g, "");

    return customersList.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(rawQuery);
      const emailMatch = c.email !== "N/A" && c.email.toLowerCase().includes(rawQuery);
      const idMatch = String(c.id).toLowerCase().includes(rawQuery) || String(c.rawId).toLowerCase().includes(rawQuery);
      const statusMatch = c.latestStatus.toLowerCase().includes(rawQuery);
      
      const phoneClean = c.phone.replace(/\D/g, "");
      const phoneMatch = c.phone !== "N/A" && (
        c.phone.toLowerCase().includes(rawQuery) ||
        (digitsOnlyQuery.length >= 2 && phoneClean.includes(digitsOnlyQuery))
      );

      const tableStr = String(c.tableNumber).toLowerCase();
      const tableFormatted = `table ${tableStr}`;
      const tableMatch = c.tableNumber !== "N/A" && (
        tableStr.includes(rawQuery) ||
        tableFormatted.includes(rawQuery)
      );

      return nameMatch || emailMatch || idMatch || phoneMatch || tableMatch || statusMatch;
    });
  }, [customersList, searchQuery]);

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      toast.error("No customer records to export");
      return;
    }
    const exportRows = filteredCustomers.map((c) => ({
      "Customer ID": c.id,
      "Name": c.name,
      "Phone": c.phone,
      "Email": c.email,
      "Table": c.tableNumber,
      "Orders Count": c.orderCount,
      "Total Spent (₹)": c.totalSpent,
      "Latest Status": c.latestStatus,
    }));
    exportToCSV("reception_customers", exportRows);
    toast.success("Customer list exported to CSV!");
  };

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Customers"
        description="Manage active system customer directory and order history."
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 max-w-lg">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Customers</div>
          <div className="mt-1 font-display text-2xl font-bold">{customersList.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Active Orders</div>
          <div className="mt-1 font-display text-2xl font-bold text-primary">
            {dbOrders.filter((o: any) => ["pending", "received", "accepted", "preparing", "ready"].includes(String(o.status || "").toLowerCase())).length}
          </div>
        </Card>
      </div>

      <Card className="w-full p-4 border shadow-xs overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reception-customers-search"
              name="customersSearch"
              placeholder="Search live customers by name, phone, email, customer ID or table…"
              aria-label="Search live customers by name, phone, email, customer ID or table"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Table className="w-full min-w-[700px]" containerClassName="max-h-[calc(100vh-250px)] min-h-[300px] overflow-y-auto overflow-x-auto scrollbar-thin rounded-lg border border-border bg-card shadow-xs relative">
          <TableHeader className="sticky top-0 z-30 bg-muted/95 backdrop-blur-md shadow-xs border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Customer</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Phone</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Email</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Table</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 text-right font-semibold text-foreground">Orders</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 text-right font-semibold text-foreground">Total Spent (₹)</TableHead>
              <TableHead className="sticky top-0 z-30 bg-muted/95 font-semibold text-foreground">Latest Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No customer records found in active system.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold">{c.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    <Phone className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                    {c.phone}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    <Mail className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                    {c.email}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    <Utensils className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                    Table {c.tableNumber}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold">
                    {c.orderCount} order{c.orderCount > 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-foreground">
                    ₹{c.totalSpent.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs capitalize font-medium text-primary">
                    {c.latestStatus}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
