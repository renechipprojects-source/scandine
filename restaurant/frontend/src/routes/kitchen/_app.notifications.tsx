import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/kitchen/components/layout/PageHeader";
import { Card } from "@/kitchen/components/ui/card";
import { Button } from "@/kitchen/components/ui/button";
import { Badge } from "@/kitchen/components/ui/badge";
import { Bell, Trash2, ShoppingBag, Utensils, CreditCard, User, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ScanDine" }] }),
  component: KitchenNotificationsPage,
});

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type?: string;
  read?: boolean;
  created_at?: string;
}

export function KitchenNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setNotifications([
        { id: "1", title: "New Order #1024", body: "Table 4 placed an order for Truffle Pasta", type: "order", created_at: new Date().toISOString() },
        { id: "2", title: "Food Item Updated", body: "Classic Cheeseburger set to Unavailable", type: "food", created_at: new Date().toISOString() },
        { id: "3", title: "Payment Received", body: "Table 2 paid ₹850 via UPI", type: "payment", created_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("sd_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const mapped: NotificationItem[] = data.map((d: any) => ({
          id: String(d.id),
          title: d.title || d.request_type || "Notification",
          body: d.body || d.label || d.message || "New activity recorded",
          type: d.type || (d.request_type ? "service" : "order"),
          read: d.read || false,
          created_at: d.created_at || new Date().toISOString(),
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useRealtimeTable("sd_notifications", fetchNotifications);

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("sd_notifications").delete().eq("id", id);
        if (error) {
          console.error("Failed to delete notification from DB:", error);
        } else {
          toast.success("Notification deleted");
        }
      } catch (err) {
        console.error("Exception deleting notification:", err);
      }
    } else {
      toast.success("Notification deleted");
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    const titleLower = item.title.toLowerCase();
    const typeLower = (item.type || "").toLowerCase();

    if (typeLower.includes("order") || titleLower.includes("order")) {
      navigate({ to: "/kitchen/orders/live" });
    } else if (typeLower.includes("food") || titleLower.includes("food") || titleLower.includes("menu")) {
      navigate({ to: "/kitchen/menu/items" });
    } else if (typeLower.includes("payment") || titleLower.includes("payment") || titleLower.includes("paid")) {
      navigate({ to: "/kitchen/orders/history" });
    } else if (typeLower.includes("employee") || titleLower.includes("staff")) {
      navigate({ to: "/admin/employees" });
    } else {
      navigate({ to: "/kitchen/orders/live" });
    }
  };

  const getNotifIcon = (type?: string, title?: string) => {
    const str = `${type || ""} ${title || ""}`.toLowerCase();
    if (str.includes("food") || str.includes("dish")) return <Utensils className="h-4 w-4 text-amber-500" />;
    if (str.includes("payment") || str.includes("paid")) return <CreditCard className="h-4 w-4 text-emerald-500" />;
    if (str.includes("employee") || str.includes("staff")) return <User className="h-4 w-4 text-blue-500" />;
    return <ShoppingBag className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Notifications"
        icon={<Bell className="h-5 w-5" />}
      />

      <Card className="w-full p-4 border shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <span className="text-xs text-muted-foreground">Loading notifications…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            No notifications available
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className="group flex items-center justify-between rounded-xl border p-3.5 transition-all hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-muted border shrink-0">
                    {getNotifIcon(n.type, n.title)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-foreground">{n.title}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {n.type || "General"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{n.body}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                  onClick={(e) => handleDeleteNotification(n.id, e)}
                  title="Delete Notification"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
