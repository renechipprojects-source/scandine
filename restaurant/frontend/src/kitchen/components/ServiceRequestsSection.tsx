import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/kitchen/components/ui/card";
import { Button } from "@/kitchen/components/ui/button";
import { Badge } from "@/kitchen/components/ui/badge";
import { ConciergeBell, Clock, User, Check, CheckCircle2, Droplet, Receipt, Utensils, HelpCircle, XCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playServiceRequestAlertSound } from "@/hooks/useRealtime";
import { toast } from "sonner";

export interface ServiceRequestItem {
  id: string;
  table_number: string | number;
  customer_name?: string;
  service_type?: string;
  label?: string;
  request_type?: string;
  status: "pending" | "accepted" | "dispatched" | "rejected" | "completed";
  created_at: string;
}

export function mapRowToServiceRequestItem(row: any): ServiceRequestItem {
  const reqType = row.request_type || row.label || row.title || "Call Waiter";
  let sType = row.service_type;
  if (!sType) {
    const l = reqType.toLowerCase();
    if (l.includes("water")) sType = "water";
    else if (l.includes("spoon") || l.includes("cutlery")) sType = "spoon";
    else if (l.includes("bill") || l.includes("receipt")) sType = "bill";
    else if (l.includes("other") || l.includes("help")) sType = "other";
    else sType = "waiter";
  }

  const rawStatus = row.status || "Pending";
  const lowerStatus = rawStatus.toLowerCase() as "pending" | "accepted" | "dispatched" | "rejected" | "completed";

  return {
    id: String(row.id),
    table_number: row.table_number || "",
    customer_name: row.customer_name || "Guest",
    service_type: sType,
    label: reqType,
    request_type: reqType,
    status: lowerStatus,
    created_at: row.created_at || new Date().toISOString(),
  };
}

const getServiceIcon = (type?: string, label?: string) => {
  const key = (type || label || "").toLowerCase();
  if (key.includes("water")) return <Droplet className="h-4 w-4 text-blue-500" />;
  if (key.includes("bill") || key.includes("receipt")) return <Receipt className="h-4 w-4 text-emerald-500" />;
  if (key.includes("spoon") || key.includes("fork") || key.includes("cutlery")) return <Utensils className="h-4 w-4 text-amber-500" />;
  if (key.includes("clean")) return <Sparkles className="h-4 w-4 text-amber-600" />;
  if (key.includes("other") || key.includes("help") || key.includes("assistance")) return <HelpCircle className="h-4 w-4 text-purple-500" />;
  return <ConciergeBell className="h-4 w-4 text-primary" />;
};

function formatTime(isoString?: string): string {
  if (!isoString) return "Just now";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}

export function ServiceRequestsSection() {
  const [requests, setRequests] = useState<ServiceRequestItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchServiceRequests = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sd_notifications")
        .select("*")
        .not("request_type", "is", null)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const mapped = data
          .map(mapRowToServiceRequestItem)
          .filter((r) => r.status !== "completed" && r.status !== "rejected");
        setRequests(mapped);
      }
    } catch (err) {
      console.warn("Error fetching service requests from notifications table:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServiceRequests();

    if (!isSupabaseConfigured) return;

    // 1. Supabase Postgres Realtime Subscription for sd_notifications table
    const tableChannel = supabase
      .channel("kitchen_service_requests_notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sd_notifications" },
        (payload) => {
          if (payload.new && (payload.new as any).request_type) {
            const item = mapRowToServiceRequestItem(payload.new);
            if (payload.eventType === "INSERT") {
              if (item.status !== "completed" && item.status !== "rejected") {
                setRequests((prev) => [item, ...prev.filter((r) => r.id !== item.id)]);
                playServiceRequestAlertSound(item.id);
                toast.info(`🛎️ New Service Request from Table ${item.table_number}: ${item.label}`, {
                  duration: 6000,
                });
              }
            } else if (payload.eventType === "UPDATE") {
              if (item.status === "completed" || item.status === "rejected") {
                setRequests((prev) => prev.filter((r) => r.id !== item.id));
              } else {
                setRequests((prev) => prev.map((r) => (r.id === item.id ? item : r)));
              }
            } else {
              fetchServiceRequests();
            }
          }
        }
      )
      .subscribe();

    // 2. Supabase Broadcast Channel fallback
    const broadcastChannel = supabase
      .channel("scandine_kitchen_channel")
      .on("broadcast", { event: "kitchen_service_request" }, (eventPayload) => {
        const srv = eventPayload?.payload?.service as ServiceRequestItem;
        if (srv && srv.status !== "completed" && srv.status !== "rejected") {
          setRequests((prev) => [srv, ...prev.filter((r) => r.id !== srv.id)]);
          playServiceRequestAlertSound(srv.id);
          toast.info(`🛎️ Service Request: ${srv.label || srv.service_type} for Table ${srv.table_number}`);
        }
      })
      .subscribe();

    // 3. Local BroadcastChannel fallback
    let localBc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        localBc = new BroadcastChannel("aura_dine_sync_channel");
        localBc.onmessage = (event) => {
          if (event.data?.type === "NEW_KITCHEN_SERVICE_REQUEST" && event.data.service) {
            const srv = event.data.service as ServiceRequestItem;
            if (srv.status !== "completed" && srv.status !== "rejected") {
              setRequests((prev) => [srv, ...prev.filter((r) => r.id !== srv.id)]);
              playServiceRequestAlertSound();
              toast.info(`🛎️ Service Request: ${srv.label || srv.service_type} for Table ${srv.table_number}`);
            }
          }
        };
      }
    } catch {}

    return () => {
      supabase.removeChannel(tableChannel);
      supabase.removeChannel(broadcastChannel);
      if (localBc) localBc.close();
    };
  }, [fetchServiceRequests]);

  const handleAccept = async (req: ServiceRequestItem) => {
    try {
      const updatedReq = { ...req, status: "accepted" as const };

      // Optimistic UI update
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? updatedReq : r))
      );

      const { error } = await supabase
        .from("sd_notifications")
        .update({ status: "Accepted" })
        .eq("id", req.id);

      if (error) {
        console.error("Supabase update error:", error);
        toast.error(`Database error updating status: ${error.message}`);
      }

      // Broadcast to Customer page
      try {
        const cleanTbl = String(req.table_number).toLowerCase().replace(/\s+/g, "");
        await supabase.channel(`services-sub-${cleanTbl}`).send({
          type: "broadcast",
          event: "service_request_status",
          payload: { service: updatedReq },
        });
        await supabase.channel("scandine_customer_channel").send({
          type: "broadcast",
          event: "service_request_status",
          payload: { service: updatedReq },
        });
      } catch {}

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("aura_dine_sync_channel");
          bc.postMessage({ type: "SERVICE_REQUEST_STATUS_UPDATED", service: updatedReq });
          bc.close();
        }
      } catch {}

      toast.success(`Accepted service request for Table ${req.table_number}`);
    } catch (err) {
      console.error("Failed to accept service request:", err);
      toast.error("Could not update request status");
    }
  };

  const handleReject = async (req: ServiceRequestItem) => {
    try {
      const updatedReq = { ...req, status: "rejected" as const };

      // Optimistic removal from active queue
      setRequests((prev) => prev.filter((r) => r.id !== req.id));

      const { error } = await supabase
        .from("sd_notifications")
        .update({ status: "Rejected" })
        .eq("id", req.id);

      if (error) {
        console.error("Supabase update error:", error);
      }

      // Broadcast to Customer page
      try {
        const cleanTbl = String(req.table_number).toLowerCase().replace(/\s+/g, "");
        await supabase.channel(`services-sub-${cleanTbl}`).send({
          type: "broadcast",
          event: "service_request_status",
          payload: { service: updatedReq },
        });
        await supabase.channel("scandine_customer_channel").send({
          type: "broadcast",
          event: "service_request_status",
          payload: { service: updatedReq },
        });
      } catch {}

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("aura_dine_sync_channel");
          bc.postMessage({ type: "SERVICE_REQUEST_STATUS_UPDATED", service: updatedReq });
          bc.close();
        }
      } catch {}

      toast.error(`Rejected service request for Table ${req.table_number}`);
    } catch (err) {
      console.error("Failed to reject service request:", err);
      toast.error("Could not reject request");
    }
  };

  const handleComplete = async (req: ServiceRequestItem) => {
    try {
      const updatedReq = { ...req, status: "completed" as const };

      // Optimistic removal from active queue
      setRequests((prev) => prev.filter((r) => r.id !== req.id));

      const { error } = await supabase
        .from("sd_notifications")
        .update({ status: "Completed" })
        .eq("id", req.id);

      if (error) {
        console.error("Supabase update error:", error);
      }

      // Broadcast to Customer page
      try {
        const cleanTbl = String(req.table_number).toLowerCase().replace(/\s+/g, "");
        await supabase.channel(`services-sub-${cleanTbl}`).send({
          type: "broadcast",
          event: "service_request_status",
          payload: { service: updatedReq },
        });
        await supabase.channel("scandine_customer_channel").send({
          type: "broadcast",
          event: "service_request_status",
          payload: { service: updatedReq },
        });
      } catch {}

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("aura_dine_sync_channel");
          bc.postMessage({ type: "SERVICE_REQUEST_STATUS_UPDATED", service: updatedReq });
          bc.close();
        }
      } catch {}

      toast.success(`Completed service request for Table ${req.table_number} ✅`);
    } catch (err) {
      console.error("Failed to complete service request:", err);
      toast.error("Could not complete request");
    }
  };

  return (
    <Card className="mb-6 border-2 border-primary/20 bg-card shadow-sm">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <ConciergeBell className="h-4 w-4 animate-bounce" />
          </div>
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              Service Requests
              <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary font-bold text-xs">
                {requests.length} active
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">Real-time table calls, water, spoon & bill requests from customers</p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={fetchServiceRequests} disabled={loading} className="text-xs">
          Refresh Queue
        </Button>
      </CardHeader>

      <CardContent className="p-4">
        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground bg-background/50">
            <ConciergeBell className="mx-auto h-6 w-6 text-muted-foreground/50 mb-1" />
            No pending service requests
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`relative rounded-2xl border p-4 transition-all shadow-xs ${
                  req.status === "accepted" || req.status === "dispatched"
                    ? "bg-amber-500/5 border-amber-500/30"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getServiceIcon(req.service_type, req.label)}
                    <span className="font-display font-bold text-sm">
                      Table {req.table_number}
                    </span>
                  </div>
                  <Badge
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      req.status === "accepted" || req.status === "dispatched"
                        ? "bg-amber-500/20 text-amber-700"
                        : "bg-blue-500/20 text-blue-700 animate-pulse"
                    }`}
                  >
                    {req.status === "accepted" || req.status === "dispatched" ? "In Progress" : "Pending"}
                  </Badge>
                </div>

                <div className="mt-2 text-base font-semibold text-foreground">
                  {req.label || req.service_type || "Service Request"}
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-[120px] font-medium">{req.customer_name || "Guest"}</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="h-3 w-3" />
                    {formatTime(req.created_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-1.5 border-t pt-2">
                  {req.status === "pending" ? (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-[11px] bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-xs px-2"
                      onClick={() => handleAccept(req)}
                    >
                      <Check className="mr-1 h-3 w-3" /> Accept
                    </Button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[11px] font-semibold text-amber-600 bg-amber-500/10 rounded-lg px-2">
                      Accepted ✓
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-[11px] border-rose-500/30 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold shadow-xs px-2"
                    onClick={() => handleReject(req)}
                  >
                    <XCircle className="mr-1 h-3 w-3" /> Reject
                  </Button>

                  <Button
                    size="sm"
                    className="flex-1 h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs px-2"
                    onClick={() => handleComplete(req)}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
