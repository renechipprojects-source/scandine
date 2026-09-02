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
  Sparkles, Download,
} from "lucide-react";
import { useSupabaseTable, type Order } from "@/hooks/useSupabaseData";
import { exportToCSV } from "@/admin/lib/exportUtils";
import { toast } from "sonner";
import { useCallback, useMemo } from "react";
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
  const { data: dbOrders, fetchData: fetchOrders } = useSupabaseTable<Order>("sd_orders");
  const { data: dbEmployees, fetchData: fetchEmployees } = useSupabaseTable<any>("sd_employees");

  const handleRealtimePayload = useCallback(() => {
    fetchOrders();
    fetchEmployees();
  }, [fetchOrders, fetchEmployees]);

  useRealtimeTable("sd_orders", handleRealtimePayload);
  useRealtimeTable("sd_employees", handleRealtimePayload);

  // Total Tables Count derived from active table numbers in system with minimum 5 tables default
  const totalTablesCount = useMemo(() => {
    if (!dbOrders || dbOrders.length === 0) return 5;
    const tableNumbers = dbOrders
      .map((o: any) => {
        const raw = o.table_number || o.table;
        const digits = String(raw || "").replace(/\D/g, "");
        return digits ? Number(digits) : 0;
      })
      .filter((n) => !isNaN(n) && n > 0 && n <= 1000);
    const maxTableNum = tableNumbers.length > 0 ? Math.max(...tableNumbers) : 5;
    const uniqueTableCount = new Set(tableNumbers).size;
    return Math.max(5, maxTableNum, uniqueTableCount);
  }, [dbOrders]);

  // Active / Occupied Tables Count (active orders with status pending, received, accepted, preparing, ready)
  const occupiedTablesCount = useMemo(() => {
    if (!dbOrders || dbOrders.length === 0) return 0;
    return new Set(
      dbOrders
        .filter((o: any) => {
          const st = String(o.status || "").toLowerCase().trim();
          const hasTable = o.table_number || (o as any).table;
          return ["pending", "received", "accepted", "preparing", "ready"].includes(st) && hasTable;
        })
        .map((o: any) => String(o.table_number || (o as any).table).trim())
    ).size;
  }, [dbOrders]);

  // Pending Bills Count (unpaid non-cancelled orders)
  const pendingBillsCount = useMemo(() => {
    if (!dbOrders || dbOrders.length === 0) return 0;
    return dbOrders.filter((o: any) => {
      const p = String(o.payment || o.payment_status || "").toLowerCase().trim();
      const st = String(o.status || "").toLowerCase().trim();
      return p !== "paid" && st !== "cancelled";
    }).length;
  }, [dbOrders]);

  // Order Stage Counts derived strictly from live DB orders
  const pendingCount = useMemo(() => {
    if (!dbOrders || dbOrders.length === 0) return 0;
    return dbOrders.filter((o: any) => {
      const st = String(o.status || "").toLowerCase().trim();
      return st === "pending" || st === "received";
    }).length;
  }, [dbOrders]);

  const preparingCount = useMemo(() => {
    if (!dbOrders || dbOrders.length === 0) return 0;
    return dbOrders.filter((o: any) => {
      const st = String(o.status || "").toLowerCase().trim();
      return st === "preparing" || st === "cooking";
    }).length;
  }, [dbOrders]);

  const readyCount = useMemo(() => {
    if (!dbOrders || dbOrders.length === 0) return 0;
    return dbOrders.filter((o: any) => {
      const st = String(o.status || "").toLowerCase().trim();
      return st === "ready" || st === "accepted";
    }).length;
  }, [dbOrders]);

  const completedCount = useMemo(() => {
    if (!dbOrders || dbOrders.length === 0) return 0;
    return dbOrders.filter((o: any) => {
      const st = String(o.status || "").toLowerCase().trim();
      return st === "completed" || st === "served" || st === "delivered";
    }).length;
  }, [dbOrders]);

  const staffCount = dbEmployees ? dbEmployees.length : 0;

  const statusPie = useMemo(() => [
    { name: "Completed", value: completedCount },
    { name: "Preparing", value: preparingCount },
    { name: "Pending", value: pendingCount },
    { name: "Ready", value: readyCount },
  ], [completedCount, preparingCount, pendingCount, readyCount]);

  // Dynamic 7-day Sales Trend derived strictly from live orders
  const salesTrend = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const result: { day: string; sales: number; orders: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayName = days[d.getDay()];
      const dayOrders = (dbOrders || []).filter((o: any) => {
        const orderDate = new Date(o.order_time || o.created_at || Date.now());
        return orderDate.toDateString() === d.toDateString();
      });
      const dayPaid = dayOrders.filter((o: any) => {
        const p = String(o.payment || o.payment_status || "").toLowerCase().trim();
        const st = String(o.status || "").toLowerCase().trim();
        return p === "paid" || st === "completed" || st === "served";
      });
      const daySales = dayPaid.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
      result.push({ day: dayName, sales: daySales, orders: dayOrders.length });
    }
    return result;
  }, [dbOrders]);

  const handleExportCSV = () => {
    const exportData = [
      { Metric: "Total Tables", Value: totalTablesCount },
      { Metric: "Active Tables", Value: occupiedTablesCount },
      { Metric: "Pending Bills", Value: pendingBillsCount },
      { Metric: "Pending Orders", Value: pendingCount },
      { Metric: "Preparing Orders", Value: preparingCount },
      { Metric: "Ready Orders", Value: readyCount },
      { Metric: "Completed Orders", Value: completedCount },
      { Metric: "Staff Count", Value: staffCount },
    ];
    exportToCSV("reception_dashboard_kpis", exportData);
    toast.success("Dashboard metrics exported to CSV!");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Tables" value={`${totalTablesCount}`} icon={<Utensils className="h-5 w-5" />} tone="success" />
        <StatCard label="Active Tables" value={`${occupiedTablesCount}`} icon={<ChefHat className="h-5 w-5" />} tone="warning" />
        <StatCard label="Pending Bills" value={`${pendingBillsCount}`} icon={<DollarSign className="h-5 w-5" />} tone="destructive" />
        <StatCard label="Staff Count" value={`${staffCount}`} icon={<Utensils className="h-5 w-5" />} tone="info" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Pending" value={pendingCount} tone="text-warning" />
        <MiniStat label="Preparing" value={preparingCount} tone="text-info" />
        <MiniStat label="Ready" value={readyCount} tone="text-primary" />
        <MiniStat label="Completed" value={completedCount} tone="text-success" />
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
