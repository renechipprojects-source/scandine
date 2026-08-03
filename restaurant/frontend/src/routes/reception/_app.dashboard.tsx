import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/reception/components/layout/PageHeader";
import { StatCard } from "@/reception/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/reception/components/ui/card";
import { Button } from "@/reception/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/reception/components/ui/tabs";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  DollarSign, Utensils, ChefHat,
  Sparkles, Download, Calendar,
} from "lucide-react";
import { kpis, salesTrend, restaurantInfo } from "@/reception/lib/mock-data";
import { useSupabaseTable, type TableItem, type Invoice, type Order } from "@/hooks/useSupabaseData";
import { ServiceRequestsSection } from "@/kitchen/components/ServiceRequestsSection";
import { exportToCSV } from "@/admin/lib/exportUtils";
import { toast } from "sonner";
import { useCallback } from "react";
import { useRealtimeTable } from "@/hooks/useRealtime";

export const Route = createFileRoute("/reception/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ScanDine" },
      { name: "description", content: "Executive dashboard with real-time restaurant KPIs, sales, orders and kitchen status." },
    ],
  }),
  component: DashboardPage,
});

const COLORS = ["oklch(0.68 0.19 40)", "oklch(0.62 0.22 25)", "oklch(0.75 0.15 70)", "oklch(0.65 0.16 155)", "oklch(0.55 0.15 260)"];

function DashboardPage() {
  const { data: dbTables } = useSupabaseTable<TableItem>("tables");
  const { data: dbInvoices, fetchData: fetchInvoices } = useSupabaseTable<Invoice>("invoices");
  const { data: dbOrders, fetchData: fetchOrders } = useSupabaseTable<Order>("sd_orders");

  const handleRealtimePayload = useCallback(() => {
    fetchInvoices();
    fetchOrders();
  }, [fetchInvoices, fetchOrders]);

  useRealtimeTable("invoices", handleRealtimePayload);
  useRealtimeTable("sd_orders", handleRealtimePayload);

  const availableTablesCount = dbTables.length > 0
    ? dbTables.filter((t) => t.status === "available").length
    : 4;
  const occupiedTablesCount = dbTables.length > 0
    ? dbTables.filter((t) => t.status === "occupied").length
    : 2;
  const pendingBillsCount = dbInvoices.length > 0
    ? dbInvoices.filter((i) => i.status === "unpaid" || i.status === "Unpaid" || i.status === "pending" || i.status === "Pending" || i.status === "partial").length
    : 1;

  const pendingCount = dbOrders.length > 0 ? dbOrders.filter((o) => o.status === "pending").length : kpis.pending;
  const preparingCount = dbOrders.length > 0 ? dbOrders.filter((o) => o.status === "preparing").length : kpis.preparing;
  const readyCount = dbOrders.length > 0 ? dbOrders.filter((o) => o.status === "ready").length : kpis.ready;
  const completedCount = dbOrders.length > 0 ? dbOrders.filter((o) => o.status === "completed").length : kpis.completed;
  const cancelledCount = dbOrders.length > 0 ? dbOrders.filter((o) => o.status === "cancelled").length : kpis.cancelled;

  const statusPie = [
    { name: "Completed", value: completedCount },
    { name: "Preparing", value: preparingCount },
    { name: "Pending", value: pendingCount },
    { name: "Ready", value: readyCount },
    { name: "Cancelled", value: cancelledCount },
  ];

  const handleExportCSV = () => {
    const exportData = [
      { Metric: "Available Tables", Value: availableTablesCount },
      { Metric: "Occupied Tables", Value: occupiedTablesCount },
      { Metric: "Pending Bills", Value: pendingBillsCount },
      { Metric: "Pending Orders", Value: pendingCount },
      { Metric: "Preparing Orders", Value: preparingCount },
      { Metric: "Ready Orders", Value: readyCount },
      { Metric: "Completed Orders", Value: completedCount },
      { Metric: "Cancelled Orders", Value: cancelledCount },
    ];
    exportToCSV("reception_dashboard_kpis", exportData);
    toast.success("Dashboard metrics exported to CSV!");
  };

  const handleTodayClick = () => {
    toast.info("Dashboard filtered for Today's metrics");
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back, Receptionist`}
        description={`${restaurantInfo.branch} · Here's what's happening at ScanDine today.`}
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleTodayClick}>
              <Calendar className="mr-2 h-4 w-4" />
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available Tables" value={`${availableTablesCount}`} icon={<Utensils className="h-5 w-5" />} tone="success" />
        <StatCard label="Occupied Tables" value={`${occupiedTablesCount}`} icon={<ChefHat className="h-5 w-5" />} tone="warning" />
        <StatCard label="Pending Bills" value={`${pendingBillsCount}`} icon={<DollarSign className="h-5 w-5" />} tone="destructive" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MiniStat label="Pending" value={pendingCount} tone="text-warning" />
        <MiniStat label="Preparing" value={preparingCount} tone="text-info" />
        <MiniStat label="Ready" value={readyCount} tone="text-primary" />
        <MiniStat label="Completed" value={completedCount} tone="text-success" />
        <MiniStat label="Cancelled" value={cancelledCount} tone="text-destructive" />
      </div>

      {/* Realtime Service Requests Section for Reception */}
      <div className="mt-6">
        <ServiceRequestsSection />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Sales & orders</CardTitle>
              <p className="text-xs text-muted-foreground">Last 7 days performance</p>
            </div>
            <Tabs defaultValue="week">
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                <TabsTrigger value="year" className="text-xs">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.19 40)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.68 0.19 40)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 60)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.55 0.02 40)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.55 0.02 40)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 60)", fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" stroke="oklch(0.68 0.19 40)" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Order status</CardTitle>
            <p className="text-xs text-muted-foreground">Distribution today</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 60)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {statusPie.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="ml-auto font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl font-bold ${tone}`}>{value}</div>
    </Card>
  );
}
