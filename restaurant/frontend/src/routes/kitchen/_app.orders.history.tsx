import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/kitchen/components/layout/PageHeader";
import { StatusBadge } from "@/kitchen/components/layout/StatusBadge";
import { Card } from "@/kitchen/components/ui/card";
import { Button } from "@/kitchen/components/ui/button";
import { Input } from "@/kitchen/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kitchen/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kitchen/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/kitchen/components/ui/dialog";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/kitchen/components/ui/pagination";
import { History, Search, Download, Filter, Eye, Utensils, User, Clock } from "lucide-react";
import { orders as mockOrders, restaurantInfo } from "@/kitchen/lib/mock-data";
import { useSupabaseTable, type Order } from "@/hooks/useSupabaseData";
import { useState } from "react";
import { exportToCSV } from "@/admin/lib/exportUtils";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen/_app/orders/history")({
  head: () => ({ meta: [{ title: "Order History — ScanDine" }, { name: "description", content: "Search and filter all past orders." }] }),
  component: OrderHistoryPage,
});

function OrderHistoryPage() {
  const { data: dbOrders } = useSupabaseTable<Order>("sd_orders");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Combine DB orders & mock orders into complete dataset
  const baseOrders: Order[] = dbOrders.length > 0
    ? dbOrders
    : [...mockOrders, ...mockOrders, ...mockOrders].map((o, i) => ({
        id: `#ORD-${10240 - i}`,
        order_id: `#ORD-${10240 - i}`,
        customer: o.customer,
        table_number: typeof o.table === "string" ? parseInt(o.table.replace(/\D/g, ""), 10) || 1 : (o.table as number),
        item: o.items as Order["item"],
        total: o.total,
        status: o.status as Order["status"],
        payment: o.payment as Order["payment"],
        order_time: o.placedAt,
      }));

  // Filtering
  const filteredOrders = baseOrders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.order_id && o.order_id.toLowerCase().includes(q)) ||
      (o.customer && o.customer.toLowerCase().includes(q)) ||
      (o.table_number && o.table_number.toString().includes(q))
    );

    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || o.payment === paymentFilter;

    let matchesTime = true;
    if (timeFilter !== "all" && o.order_time) {
      const date = new Date(o.order_time);
      if (!isNaN(date.getTime())) {
        const diffDays = (new Date().getTime() - date.getTime()) / (1000 * 3600 * 24);
        if (timeFilter === "1d") matchesTime = diffDays <= 1;
        else if (timeFilter === "7d") matchesTime = diffDays <= 7;
        else if (timeFilter === "30d") matchesTime = diffDays <= 30;
      }
    }

    return matchesQuery && matchesStatus && matchesPayment && matchesTime;
  });

  // Dynamic Pagination calculations
  const totalOrders = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalOrders);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error("No orders available to export");
      return;
    }
    const exportRows = filteredOrders.map((o) => ({
      "Order ID": o.order_id || o.id,
      "Customer": o.customer,
      "Table": o.table_number,
      "Total (₹)": o.total,
      "Status": o.status,
      "Payment": o.payment,
      "Time": o.order_time || "N/A",
    }));
    exportToCSV("kitchen_order_history", exportRows);
    toast.success("Order history exported to CSV!");
  };

  return (
    <div>
      <PageHeader
        title="Order history"
        description="Complete archive of past orders with advanced filtering."
        icon={<History className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, customer or table…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={paymentFilter}
            onValueChange={(val) => {
              setPaymentFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={timeFilter}
            onValueChange={(val) => {
              setTimeFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="-mx-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="w-12 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No orders match your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((o) => {
                  const itemsCount = Array.isArray(o.item) ? o.item.length : 0;
                  return (
                    <TableRow key={o.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-semibold">{o.order_id || o.id}</TableCell>
                      <TableCell className="font-medium">{o.customer}</TableCell>
                      <TableCell><span className="rounded-md bg-muted px-2 py-0.5 text-xs">Table {o.table_number}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{itemsCount} items</TableCell>
                      <TableCell className="text-right font-semibold">{restaurantInfo.currency}{Number(o.total).toFixed(2)}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell><StatusBadge status={o.payment} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.order_time || "Recent"}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => setSelectedOrder(o)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Dynamic Pagination Controls */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {totalOrders > 0
              ? `Showing ${startIndex + 1}–${endIndex} of ${totalOrders} orders`
              : "Showing 0 orders"}
          </p>
          {totalPages > 1 && (
            <Pagination className="mx-0 justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (validPage > 1) setCurrentPage(validPage - 1);
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      isActive={pageNum === validPage}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(pageNum);
                      }}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (validPage < totalPages) setCurrentPage(validPage + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </Card>

      {/* Order View Modal Dialog */}
      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Order {selectedOrder.order_id || selectedOrder.id}</span>
                <StatusBadge status={selectedOrder.status} />
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Customer</span>
                  <div className="font-semibold">{selectedOrder.customer}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Table</span>
                  <div className="font-semibold">Table {selectedOrder.table_number}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Payment Status</span>
                  <div><StatusBadge status={selectedOrder.payment} /></div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Order Time</span>
                  <div className="text-xs text-muted-foreground font-medium">{selectedOrder.order_time || "N/A"}</div>
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Items</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {Array.isArray(selectedOrder.item) && selectedOrder.item.length > 0 ? (
                    selectedOrder.item.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-none">
                        <div>
                          <span className="font-semibold mr-2">{it.qty}×</span>
                          <span>{it.name}</span>
                        </div>
                        <span className="font-medium text-muted-foreground">
                          {restaurantInfo.currency}{(it.qty * it.price).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">No item details recorded.</div>
                  )}
                </div>
              </div>

              <div className="border-t pt-3 flex items-center justify-between font-bold text-base">
                <span>Total Amount</span>
                <span className="text-primary">{restaurantInfo.currency}{Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
