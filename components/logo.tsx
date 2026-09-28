import { cn } from "@/lib/utils";

/** The Unfold glyph: one step forking into two. Same drawing as app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-6", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <g fill="var(--background)">
        <rect x="11" y="5.5" width="10" height="6.5" rx="2" />
        <rect x="4.5" y="20" width="9.5" height="6.5" rx="2" />
        <rect x="18" y="20" width="9.5" height="6.5" rx="2" />
      </g>
      <path
        d="M16 12v3.5M9.25 20v-1.5a3 3 0 0 1 3-3h7.5a3 3 0 0 1 3 3V20"
        fill="none"
        stroke="var(--background)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-foreground", className)}>
      <LogoMark />
      <span className="font-serif text-[22px] leading-none tracking-tight">Unfold</span>
    </div>
  );
}
