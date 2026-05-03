import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Optional secondary label below the value (e.g. "+4.5% this year"). */
  delta?: ReactNode;
  /** Treat delta as positive (green) or negative (red) for colour. */
  deltaTone?: "positive" | "negative" | "neutral";
  /** Optional small icon next to label. */
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 text-card-foreground",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {delta && (
        <p
          className={cn(
            "mt-1 text-xs",
            deltaTone === "positive" && "text-green-600 dark:text-green-400",
            deltaTone === "negative" && "text-destructive",
            deltaTone === "neutral" && "text-muted-foreground"
          )}
        >
          {delta}
        </p>
      )}
    </div>
  );
}
