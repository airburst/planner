import { cn } from "@/lib/utils";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface ScoreDonutProps {
  /** 0-100 */
  score: number;
  label?: string;
  size?: number;
  /** Tone applied to ring + central number. Defaults to colour-by-score. */
  tone?: "auto" | "positive" | "neutral" | "negative";
  className?: string;
}

const TONE_FILL: Record<Exclude<ScoreDonutProps["tone"], "auto" | undefined>, string> = {
  positive: "#10b981",
  neutral: "#3b82f6",
  negative: "#ef4444",
};

export function ScoreDonut({
  score,
  label,
  size = 120,
  tone = "auto",
  className,
}: ScoreDonutProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const remainder = 100 - clamped;
  const data = [
    { name: "score", value: clamped },
    { name: "remainder", value: remainder },
  ];

  const resolvedTone =
    tone === "auto"
      ? clamped >= 80
        ? "positive"
        : clamped >= 60
          ? "neutral"
          : "negative"
      : tone;
  const fill = TONE_FILL[resolvedTone];

  return (
    <div className={cn("relative inline-block", className)} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={size / 2 - 12}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            <Cell fill={fill} />
            <Cell fill="rgba(148, 163, 184, 0.2)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-semibold tracking-tight" style={{ color: fill }}>
          {clamped}%
        </p>
        {label && (
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        )}
      </div>
    </div>
  );
}
