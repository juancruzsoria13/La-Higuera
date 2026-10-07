"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, UserRound } from "lucide-react";

export function AccountMenu({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent | KeyboardEvent) {
      if (!ref.current?.open) return;
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      } else if (event instanceof PointerEvent && !ref.current.contains(event.target as Node)) {
        ref.current.open = false;
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, []);

  return (
    <details ref={ref} className="account-menu relative" onClick={event => {
      if (event.target instanceof Element && event.target.closest("a, button[type='submit']") && ref.current) ref.current.open = false;
    }}>
      <summary aria-label="Mi cuenta" className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium">
        <UserRound className="size-5" /><span className="hidden sm:inline">Mi cuenta</span><ChevronDown className="size-3" />
      </summary>
      <div className="absolute right-0 top-full z-40 mt-2 w-48 rounded-xl border bg-white p-2 text-foreground shadow-xl shadow-blue-950/15">{children}</div>
    </details>
  );
}
