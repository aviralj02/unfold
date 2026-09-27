import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden>
      <circle cx="7" cy="12" r="3.25" fill="currentColor" />
      <circle cx="18" cy="6" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.8 10.6 15.8 7.1M9.8 13.4l6 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-foreground", className)}>
      <LogoMark className="text-brand" />
      <span className="font-serif text-[22px] leading-none tracking-tight">Unfold</span>
    </div>
  );
}
