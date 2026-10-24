import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;        // 0-100
  className?: string;
  label?: string;
  showLabel?: boolean;
  color?: "indigo" | "emerald" | "amber" | "red";
}

const colors = {
  indigo: "from-indigo-500 to-violet-500",
  emerald: "from-emerald-500 to-teal-500",
  amber: "from-amber-500 to-orange-500",
  red: "from-red-500 to-rose-500",
};

export function Progress({ value, className, label, showLabel = false, color = "indigo" }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("w-full", className)}>
      {(label || showLabel) && (
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          {label && <span>{label}</span>}
          {showLabel && <span>{clamped}%</span>}
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full bg-gradient-to-r rounded-full transition-all duration-500", colors[color])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
