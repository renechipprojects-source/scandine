import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Droplet, Sparkles, Receipt, ConciergeBell, CheckCircle2, Utensils, HelpCircle } from "lucide-react";
import { CustomerNav } from "@/components/customer-nav";
import { tableStore } from "@/lib/table-store";
import { sendServiceRequest, getServiceRequestsByTable, subscribeToServiceRequests, type ServiceRequest } from "@/lib/supabase";
import { liveOrderStore, useLiveServiceRequests } from "@/lib/live-order-store";
import { notificationStore } from "@/lib/notification-store";
import { toast } from "sonner";

const services = [
  { id: "waiter", label: "Call Staff / Waiter", icon: ConciergeBell, color: "gradient-primary" },
  { id: "water", label: "Need Water", icon: Droplet, color: "gradient-accent" },
  { id: "spoon", label: "Need Spoon", icon: Utensils, color: "gradient-primary" },
  { id: "clean", label: "Clean Table", icon: Sparkles, color: "gradient-accent" },
  { id: "bill", label: "Need Bill", icon: Receipt, color: "gradient-accent" },
  { id: "other", label: "Other Service", icon: HelpCircle, color: "gradient-primary" },
];

import { useCustomer } from "@/lib/customer-store";

export const Route = createFileRoute("/services")({ component: Services });

function Services() {
  const tableNumber = tableStore.getTableNumber();
  const customer = useCustomer(tableNumber);
  const customerName = customer?.fullName || "Guest";
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const liveServices = useLiveServiceRequests();

  if (!customer) {
    return (
      <CustomerRegistration
        tableNumber={tableNumber}
        onSuccess={() => {}}
      />
    );
  }

  useEffect(() => {
    let unsubscribe = () => {};

    async function loadRequests() {
      const data = await getServiceRequestsByTable(tableNumber);
      setRequests(data);

      unsubscribe = subscribeToServiceRequests(tableNumber, (updatedReq) => {
        setRequests((prev) => {
          const exists = prev.some((r) => r.id === updatedReq.id);
          if (exists) {
            return prev.map((r) => (r.id === updatedReq.id ? updatedReq : r));
          }
          return [updatedReq, ...prev];
        });

        if (updatedReq.status === "accepted" || updatedReq.status === "dispatched") {
          toast.success(`Your service request "${updatedReq.label || updatedReq.service_type}" has been accepted.`);
          notificationStore.addNotification({
            title: "Service Request Accepted",
            desc: `Staff is on the way for "${updatedReq.label || updatedReq.service_type}" at Table ${tableNumber}`,
            type: "success",
            category: "services",
          });
        } else if (updatedReq.status === "completed") {
          toast.success(`Your service request "${updatedReq.label || updatedReq.service_type}" has been completed.`);
          notificationStore.addNotification({
            title: "Service Request Completed",
            desc: `Your request "${updatedReq.label || updatedReq.service_type}" at Table ${tableNumber} has been completed.`,
            type: "success",
            category: "services",
          });
        } else if (updatedReq.status === "rejected") {
          toast.error(`Your service request "${updatedReq.label || updatedReq.service_type}" was rejected.`);
          notificationStore.addNotification({
            title: "Service Request Rejected",
            desc: `Your request "${updatedReq.label || updatedReq.service_type}" at Table ${tableNumber} was rejected by kitchen/staff.`,
            type: "error",
            category: "services",
          });
        }
      });
    }

    loadRequests();

    // Local BroadcastChannel listener for instant cross-tab updates
    let localBc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        localBc = new BroadcastChannel("aura_dine_sync_channel");
        localBc.onmessage = (event) => {
          if (event.data?.type === "SERVICE_REQUEST_STATUS_UPDATED" && event.data.service) {
            const srv = event.data.service as ServiceRequest;
            setRequests((prev) => {
              const exists = prev.some((r) => r.id === srv.id);
              if (exists) return prev.map((r) => (r.id === srv.id ? { ...r, status: srv.status } : r));
              return [srv, ...prev];
            });
            if (srv.status === "accepted" || srv.status === "dispatched") {
              toast.success(`Your service request "${srv.label || srv.service_type}" has been accepted.`);
            } else if (srv.status === "completed") {
              toast.success(`Your service request "${srv.label || srv.service_type}" has been completed.`);
            } else if (srv.status === "rejected") {
              toast.error(`Your service request "${srv.label || srv.service_type}" was rejected.`);
            }
          }
        };
      }
    } catch {}

    return () => {
      unsubscribe();
      if (localBc) localBc.close();
    };
  }, [tableNumber]);

  const handleRequest = async (id: string, label: string) => {
    setLoading(true);
    try {
      const created = await sendServiceRequest(tableNumber, id, label, customerName);
      setRequests((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);

      notificationStore.addNotification({
        title: `${label} Requested`,
        desc: `Request sent to staff for Table ${tableNumber}. Staff will arrive shortly.`,
        type: "info",
        category: "services",
      });

      toast.success("Service Request Sent");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const combinedRequests = requests.filter((r) => {
    const sDigits = r.table_number.replace(/\D/g, "");
    const tDigits = tableNumber.replace(/\D/g, "");
    if (sDigits && tDigits) return sDigits === tDigits;
    return r.table_number.toLowerCase().replace(/\s+/g, "") === tableNumber.toLowerCase().replace(/\s+/g, "");
  });

  return (
    <div className="min-h-screen bg-background pb-32">
      <CustomerNav />
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{tableNumber} Services</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">Quick Table Service</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tap any service button below. Your request is sent live to the kitchen and waiter staff.
        </p>

        {/* Service Buttons Grid */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {services.map((s) => {
            const activeReq = combinedRequests.find(
              (r) => r.service_type === s.id && r.status !== "completed" && r.status !== "rejected"
            );
            return (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRequest(s.id, s.label)}
                disabled={loading || !!activeReq}
                className={`relative overflow-hidden rounded-3xl p-6 text-left shadow-float ${s.color} text-white disabled:opacity-85`}
              >
                <s.icon className="h-8 w-8 mb-4" />
                <div className="font-display font-bold text-lg">{s.label}</div>
                <div className="text-xs opacity-90">
                  {activeReq ? `Status: ${activeReq.status.toUpperCase()}` : "Response in ~2 min"}
                </div>
                {activeReq && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 rounded-full bg-white/30 backdrop-blur px-2.5 py-1 text-[11px] font-bold flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-white animate-pulse" />{" "}
                    {activeReq.status === "accepted" || activeReq.status === "dispatched"
                      ? "ACCEPTED!"
                      : activeReq.status === "completed"
                      ? "COMPLETED"
                      : "PENDING"}
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Live Active Requests Log */}
        {combinedRequests.length > 0 && (
          <div className="mt-8">
            <div className="font-display font-bold text-lg mb-3">Recent Requests</div>
            <div className="space-y-2">
              {combinedRequests.slice(0, 5).map((r) => (
                <div key={r.id} className="glass rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl gradient-primary text-white grid place-items-center font-bold text-xs">
                      {r.table_number}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{r.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      r.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : r.status === "accepted" || r.status === "dispatched"
                        ? "bg-blue-500/10 text-blue-600 animate-pulse"
                        : r.status === "rejected"
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {r.status === "completed"
                      ? "✓ Done"
                      : r.status === "accepted" || r.status === "dispatched"
                      ? "Accepted"
                      : r.status === "rejected"
                      ? "Rejected"
                      : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
