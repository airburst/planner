import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

type BadgeVariant = "default" | "high" | "medium" | "low" | "success" | "muted";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary",
  high: "bg-sw-error-container text-sw-on-error-container dark:bg-destructive/20 dark:text-destructive",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-sw-teal-container/30 text-sw-on-teal-container dark:bg-primary/20 dark:text-primary",
  success: "bg-sw-teal-container/30 text-sw-on-teal-container dark:bg-primary/20 dark:text-primary",
  muted: "bg-muted text-muted-foreground",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
