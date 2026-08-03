import { Badge } from "@/admin/components/ui/badge";
import { cn } from "@/admin/lib/utils";

const map: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  preparing: "bg-info/15 text-info border-info/30",
  ready: "bg-primary/15 text-primary border-primary/30",
  served: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  paid: "bg-success/15 text-success border-success/30",
  unpaid: "bg-warning/15 text-warning border-warning/30",
  refunded: "bg-muted text-muted-foreground border-border",
  partial: "bg-info/15 text-info border-info/30",
  available: "bg-success/15 text-success border-success/30",
  occupied: "bg-destructive/15 text-destructive border-destructive/30",
  reserved: "bg-info/15 text-info border-info/30",
  cleaning: "bg-warning/15 text-warning border-warning/30",
  active: "bg-success/15 text-success border-success/30",
  paused: "bg-warning/15 text-warning border-warning/30",
  expired: "bg-muted text-muted-foreground border-border",
  processed: "bg-success/15 text-success border-success/30",
  draft: "bg-muted text-muted-foreground border-border",
  delivered: "bg-success/15 text-success border-success/30",
  "in-transit": "bg-info/15 text-info border-info/30",
  "on-duty": "bg-success/15 text-success border-success/30",
  "off-duty": "bg-muted text-muted-foreground border-border",
  leave: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-success/15 text-success border-success/30",
  seated: "bg-primary/15 text-primary border-primary/30",
  waitlist: "bg-warning/15 text-warning border-warning/30",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = (status || "").toLowerCase();
  const tone = map[key] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize", tone, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status ? status.replace(/-/g, " ") : "N/A"}
    </Badge>
  );
}
