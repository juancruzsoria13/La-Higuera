import { cn } from "@/lib/utils";

/** An h with a leaf: a compact mark that works in one color. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" className={className}>
      <path fill="currentColor" d="M9 11h7v12c2-3 5-4 9-4 8 0 13 5 13 13v8h-8v-8c0-4-2-6-6-6s-8 3-8 7v7H9V11Z" />
      <path fill="currentColor" d="M23 15C23 7 30 3 40 5c0 8-7 14-17 10Z" />
    </svg>
  );
}

export function Brand({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", inverted ? "text-white" : "text-foreground")}>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11", inverted ? "bg-card text-primary" : "bg-primary text-primary-foreground")}>
        <BrandMark className="size-8" />
      </span>
      {!compact && <span className="whitespace-nowrap text-[21px] leading-7 font-extrabold tracking-[-.035em] sm:text-[25px]">la higuera<span className={inverted ? "text-sky" : "text-primary"}>.</span></span>}
    </span>
  );
}
