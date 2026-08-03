import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { StatCard } from "@/admin/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/admin/components/ui/card";
import { Button } from "@/admin/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/admin/components/ui/tabs";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  DollarSign, ShoppingBag, Utensils, TrendingUp,
  Sparkles, Download, Clock, CheckCircle2, BookOpen,
  Users, UserCheck, ShieldCheck, CheckSquare, XCircle,
} from "lucide-react";
import { restaurantInfo } from "@/admin/lib/mock-data";
import {
  useSupabaseTable,
  type Order,
  type TableItem,
  type Customer,
  type Employee,
  type MenuItem,
} from "@/hooks/useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { exportToCSV } from "@/admin/lib/exportUtils";
import { useCallback, useMemo } from "react";

export const Route = createFileRoute("/admin/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ScanDine" },
      { name: "description", content: "Executive dashboard with real-time restaurant KPIs, sales, orders and status." },
    ],
  }),
  component: DashboardPage,
});

const COLORS = [
  "oklch(0.68 0.19 40)",
  "oklch(0.62 0.22 25)",
  "oklch(0.75 0.15 70)",
  "oklch(0.65 0.16 155)",
  "oklch(0.55 0.15 260)",
];

function DashboardPage() {
  const { data: dbOrders, fetchData: fetchOrders } = useSupabaseTable<Order>("sd_orders");
  const { data: dbTables, fetchData: fetchTables } = useSupabaseTable<TableItem>("tables");
  const { data: dbCustomers, fetchData: fetchCustomers } = useSupabaseTable<Customer>("customers");
  const { data: dbEmployees, fetchData: fetchEmployees } = useSupabaseTable<Employee>("sd_employees");
  const { data: dbMenuItems, fetchData: fetchMenuItems } = useSupabaseTable<MenuItem>("sd_menu_items");

  // Real-time subscriptions for all dynamic tables
  useRealtimeTable("sd_orders", useCallback(() => { fetchOrders(); }, [fetchOrders]));
  useRealtimeTable("tables", useCallback(() => { fetchTables(); }, [fetchTables]));
  useRealtimeTable("customers", useCallback(() => { fetchCustomers(); }, [fetchCustomers]));
  useRealtimeTable("sd_employees", useCallback(() => { fetchEmployees(); }, [fetchEmployees]));
  useRealtimeTable("sd_menu_items", useCallback(() => { fetchMenuItems(); }, [fetchMenuItems]));

  // Live dynamic calculations — Zero static or mock fallbacks
  const totalOrdersCount = dbOrders.length;
  const activeOrdersCount = dbOrders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled"
  ).length;
  const pendingOrdersCount = dbOrders.filter((o) => o.status === "pending").length;
  const preparingOrdersCount = dbOrders.filter((o) => o.status === "preparing").length;
  const readyOrdersCount = dbOrders.filter((o) => o.status === "ready").length;
  const completedOrdersCount = dbOrders.filter((o) => o.status === "completed").length;
  const cancelledOrdersCount = dbOrders.filter((o) => o.status === "cancelled").length;

  const totalRevenue = dbOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const todaysRevenue = useMemo(() => {
    const todayStr = new Date().toDateString();
    return dbOrders
      .filter((o) => {
        const d = new Date(o.order_time || o.created_at || Date.now());
        return d.toDateString() === todayStr;
      })
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [dbOrders]);

  const activeTablesCount = dbTables.filter((t) => t.status === "occupied").length;
  const availableTablesCount = dbTables.filter(
    (t) => t.status === "available" || t.status === "vacant" || t.status === "cleaning"
  ).length;

  const menuItemsCount = dbMenuItems.length;
  const staffCount = dbEmployees.length;
  const customerCount = dbCustomers.length;

  // Realtime Status Distribution
  const statusPie = [
    { name: "Completed", value: completedOrdersCount },
    { name: "Preparing", value: preparingOrdersCount },
    { name: "Pending", value: pendingOrdersCount },
    { name: "Ready", value: readyOrdersCount },
    { name: "Cancelled", value: cancelledOrdersCount },
  ];

  // Dynamic 7-day Sales Trend derived strictly from live orders
  const salesTrend = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const result: { day: string; sales: number; orders: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayName = days[d.getDay()];
      const dayOrders = dbOrders.filter((o) => {
        const orderDate = new Date(o.order_time || o.created_at || Date.now());
        return orderDate.toDateString() === d.toDateString();
      });
      const daySales = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      result.push({ day: dayName, sales: daySales, orders: dayOrders.length });
    }
    return result;
  }, [dbOrders]);

  const handleExport = () => {
    const summaryData = [
      { Metric: "Total Orders", Value: totalOrdersCount },
      { Metric: "Active Orders", Value: activeOrdersCount },
      { Metric: "Pending Orders", Value: pendingOrdersCount },
      { Metric: "Completed Orders", Value: completedOrdersCount },
      { Metric: "Total Revenue", Value: `${restaurantInfo.currency}${totalRevenue.toFixed(2)}` },
      { Metric: "Today's Revenue", Value: `${restaurantInfo.currency}${todaysRevenue.toFixed(2)}` },
      { Metric: "Active Tables", Value: activeTablesCount },
      { Metric: "Available Tables", Value: availableTablesCount },
      { Metric: "Menu Items", Value: menuItemsCount },
      { Metric: "Staff Count", Value: staffCount },
      { Metric: "Customer Count", Value: customerCount },
    ];
    exportToCSV("live_dashboard_summary", summaryData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Realtime Executive Dashboard"
        description={`${restaurantInfo.branch} · Live Supabase telemetry and real-time operations.`}
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Summary
          </Button>
        }
      />

      {/* Primary KPI Row — 4 Major Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={`${restaurantInfo.currency}${todaysRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Total Revenue"
          value={`${restaurantInfo.currency}${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Total Orders"
          value={totalOrdersCount}
          icon={<ShoppingBag className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Active Orders"
          value={activeOrdersCount}
          icon={<Clock className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      {/* Secondary Dynamic Metrics Row — 7 Detailed Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <MiniStat label="Pending" value={pendingOrdersCount} tone="text-warning" icon={<Clock className="h-3.5 w-3.5" />} />
        <MiniStat label="Completed" value={completedOrdersCount} tone="text-success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        <MiniStat label="Active Tables" value={activeTablesCount} tone="text-amber-600" icon={<Utensils className="h-3.5 w-3.5" />} />
        <MiniStat label="Available Tables" value={availableTablesCount} tone="text-emerald-600" icon={<CheckSquare className="h-3.5 w-3.5" />} />
        <MiniStat label="Menu Items" value={menuItemsCount} tone="text-primary" icon={<BookOpen className="h-3.5 w-3.5" />} />
        <MiniStat label="Staff Count" value={staffCount} tone="text-indigo-600" icon={<UserCheck className="h-3.5 w-3.5" />} />
        <MiniStat label="Customer Count" value={customerCount} tone="text-purple-600" icon={<Users className="h-3.5 w-3.5" />} />
      </div>

      {/* Realtime Charts Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Live Revenue & Orders Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Dynamic last 7 days metrics</p>
            </div>
            <Tabs defaultValue="week">
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs">7 Days</TabsTrigger>
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
            <CardTitle className="text-base font-semibold">Live Order Status</CardTitle>
            <p className="text-xs text-muted-foreground">Real-time status breakdown</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
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

function MiniStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className={`mt-1 font-display text-xl font-bold ${tone}`}>{value}</div>
    </Card>
  );
}
