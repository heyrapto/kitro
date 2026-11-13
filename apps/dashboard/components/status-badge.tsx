import { cn } from "@/lib/utils";

type BadgeStatus =
  | "approved"
  | "allow"
  | "paid"
  | "held"
  | "hold"
  | "refused"
  | "refuse"
  | "active"
  | "paused"
  | "pending";

export function StatusBadge({
  status,
  className,
}: {
  status: BadgeStatus | string;
  className?: string;
}) {
  const normalized = status.toLowerCase();

  const isSuccess =
    normalized === "approved" ||
    normalized === "allow" ||
    normalized === "paid" ||
    normalized === "active";
  const isHeld = normalized === "held" || normalized === "hold" || normalized === "pending";
  const isRefused = normalized === "refused" || normalized === "refuse" || normalized === "paused";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider font-medium border",
        isSuccess && "bg-foreground text-background border-foreground",
        isHeld && "bg-muted text-foreground border-foreground/40",
        isRefused && "bg-background text-muted-foreground border-border line-through",
        !isSuccess && !isHeld && !isRefused && "bg-muted/40 text-foreground border-border",
        className,
      )}
    >
      {status}
    </span>
  );
}
