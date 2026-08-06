import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/reception/components/layout/PageHeader";
import { Card, CardContent } from "@/reception/components/ui/card";
import { Button } from "@/reception/components/ui/button";
import { Input } from "@/reception/components/ui/input";
import { Avatar, AvatarFallback } from "@/reception/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/reception/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/reception/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/reception/components/ui/dialog";
import { Users, Plus, Search, Download, Mail, Phone, MapPin, Trash2 } from "lucide-react";
import { customers as mockCustomersRaw, restaurantInfo } from "@/reception/lib/mock-data";
import { useState } from "react";
import { useSupabaseTable, type Customer } from "@/hooks/useSupabaseData";

import { exportToCSV } from "@/admin/lib/exportUtils";
import { toast } from "sonner";

export const Route = createFileRoute("/reception/_app/customers")({
  head: () => ({ meta: [{ title: "Customers — ScanDine" }, { name: "description", content: "Customer directory and details." }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const mockCustomers = mockCustomersRaw as unknown as Customer[];
  const { data: dbCustomers } = useSupabaseTable<Customer>("customers", mockCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);

  const customersList = dbCustomers.length > 0 ? dbCustomers : mockCustomers;

  const filteredCustomers = customersList.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query)) ||
      (c.address && c.address.toLowerCase().includes(query))
    );
  });

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      toast.error("No customer records to export");
      return;
    }
    const exportRows = filteredCustomers.map((c) => ({
      "Customer ID": c.id,
      "Name": c.name,
      "Email": c.email || "N/A",
      "Phone": c.phone || "N/A",
      "Address": c.address || "N/A",
    }));
    exportToCSV("reception_customers", exportRows);
    toast.success("Customer list exported to CSV!");
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${customersList.length} customers registered in the system`}
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 max-w-lg">
        {[
          { label: "Total customers", value: `${customersList.length}` },
          { label: "New this month", value: "14" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="w-full p-4 border shadow-xs overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, email or phone…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full max-h-[420px] overflow-y-auto overflow-x-auto border rounded-lg scrollbar-thin">
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-md">
              <TableRow className="bg-muted/40">
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {c.name.split(" ").map((w) => w[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold">{c.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {c.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    <Mail className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                    {c.email || "N/A"}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    <Phone className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                    {c.phone || "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
