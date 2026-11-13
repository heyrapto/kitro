import { cn } from "@/lib/utils";

export function DropsAmount({
  drops,
  showDrops = false,
  className,
}: {
  drops: string | number | bigint;
  showDrops?: boolean;
  className?: string;
}) {
  const dropsBig = BigInt(drops.toString());
  const oneXrp = BigInt(1000000);
  const wholeXrp = dropsBig / oneXrp;
  const fractionDrops = dropsBig % oneXrp;
  const fractionStr = fractionDrops.toString().padStart(6, "0");

  return (
    <span className={cn("font-mono tabular-nums tracking-tight font-medium", className)}>
      <span>{wholeXrp.toLocaleString()}</span>
      <span className="text-muted-foreground text-xs">.{fractionStr}</span>
      <span className="ml-1 text-xs text-muted-foreground font-sans font-normal">XRP</span>
      {showDrops && (
        <span className="block text-[10px] text-muted-foreground font-mono">
          ({dropsBig.toLocaleString()} drops)
        </span>
      )}
    </span>
  );
}
