import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { StatusBadge } from "@/admin/components/layout/StatusBadge";
import { Card } from "@/admin/components/ui/card";
import { Button } from "@/admin/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/admin/components/ui/table";
import { ClipboardList, Plus } from "lucide-react";
import { purchaseOrders as mockPurchaseOrders, restaurantInfo } from "@/admin/lib/mock-data";
import { useSupabaseTable, type PurchaseOrder } from "@/hooks/useSupabaseData";

export const Route = createFileRoute("/admin/_app/inventory/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — ScanDine" }, { name: "description", content: "Track supplier purchase orders and deliveries." }] }),
  component: POPage,
});

function POPage() {
  const { data: poList } = useSupabaseTable<PurchaseOrder>("sd_purchase_orders", mockPurchaseOrders);

  const committedTotal = poList.reduce((s, p) => s + Number(p.total || 0), 0);

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        description={`${poList.length} POs · ${restaurantInfo.currency}${committedTotal.toLocaleString()} committed`}
        icon={<ClipboardList className="h-5 w-5" />}
        actions={<Button size="sm"><Plus className="mr-2 h-4 w-4" />New PO</Button>}
      />

      <Card className="p-4">
        <div className="-mx-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>PO ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {poList.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs font-semibold">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.supplier}</TableCell>
                  <TableCell className="text-right">{p.items}</TableCell>
                  <TableCell className="text-right font-semibold">{restaurantInfo.currency}{Number(p.total || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{p.date || "Today"}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell><Button variant="outline" size="sm">View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
