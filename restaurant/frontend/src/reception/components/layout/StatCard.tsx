import type { ReactNode } from "react";
import { Card } from "@/reception/components/ui/card";
import { cn } from "@/reception/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function StatCard({
  label, value, delta, deltaLabel, icon, tone = "primary",
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  tone?: "primary" | "success" | "warning" | "info" | "destructive";
}) {
  const toneMap: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 text-primary",
    success: "from-success/15 to-success/5 text-success",
    warning: "from-warning/15 to-warning/5 text-warning",
    info: "from-info/15 to-info/5 text-info",
    destructive: "from-destructive/15 to-destructive/5 text-destructive",
  };

  const positive = (delta ?? 0) >= 0;

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-2xl font-bold tracking-tight md:text-3xl">{value}</div>
          {delta !== undefined && (
            <div className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}>
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {positive ? "+" : ""}{delta}%{deltaLabel && <span className="text-muted-foreground"> {deltaLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br", toneMap[tone])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
