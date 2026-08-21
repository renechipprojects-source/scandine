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
  const [searchQuery, setSearchQuery] = useState("");

  const handleRealtimePayload = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useRealtimeTable("sd_orders", handleRealtimePayload);

  // Derive unique customer directory dynamically from sd_orders (no mock data fallback)
  const customersList = useMemo(() => {
    const custMap = new Map<string, CustomerEntry>();

    dbOrders.forEach((o: any) => {
      const name = (o.customer_name || o.customer || "Guest Customer").trim();
      const phone = (o.customer_phone || o.phone || "").trim();
      const email = (o.customer_email || o.email || "").trim();
      const key = (phone || email || name).toLowerCase();

      if (!custMap.has(key)) {
        custMap.set(key, {
          id: key,
          name,
          phone: phone || "N/A",
          email: email || "N/A",
          tableNumber: o.table_number || "N/A",
          orderCount: 1,
          totalSpent: Number(o.total || 0),
          latestStatus: o.status || "pending",
        });
      } else {
        const existing = custMap.get(key)!;
        existing.orderCount += 1;
        existing.totalSpent += Number(o.total || 0);
        if (o.table_number) existing.tableNumber = o.table_number;
        existing.latestStatus = o.status || existing.latestStatus;
      }
    });

    return Array.from(custMap.values());
  }, [dbOrders]);

  const filteredCustomers = customersList.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query)) ||
      String(c.tableNumber).includes(query)
    );
  });

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      toast.error("No customer records to export");
      return;
    }
    const exportRows = filteredCustomers.map((c) => ({
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
            {dbOrders.filter((o: any) => ["pending", "accepted", "preparing", "ready"].includes(String(o.status || "").toLowerCase())).length}
          </div>
        </Card>
      </div>

      <Card className="w-full p-4 border shadow-xs overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search live customers by name, phone, email or table…"
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
