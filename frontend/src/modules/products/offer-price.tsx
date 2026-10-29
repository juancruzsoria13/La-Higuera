"use client";
import { useEffect, useRef, useState } from "react";
import { cn, money } from "@/lib/utils";
import { priceAt } from "./offers";

const DURATION = 1100;

/**
 * Precio de una oferta: cuando aparece en pantalla, baja número a número desde el precio tachado hasta el
 * final y rebota al llegar. Sin JavaScript, con movimiento reducido y para lectores de pantalla, el final.
 */
export function OfferPrice({from, to, currency, className}: {from: number; to: number; currency: string; className?: string}) {
  const [shown, setShown] = useState(to);
  const [phase, setPhase] = useState<"idle" | "running" | "landed">("idle");
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION);
        setShown(priceAt(from, to, progress));
        if (progress < 1) frame = requestAnimationFrame(step); else setPhase("landed");
      };
      setShown(from);
      setPhase("running");
      frame = requestAnimationFrame(step);
    }, {threshold: .6});
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [from, to]);
  return <span ref={ref} className={cn("offer-price", phase !== "idle" && `offer-price--${phase}`, className)}>
    <span aria-hidden="true">{money(shown, currency)}</span>
    <span className="sr-only">{money(to, currency)}</span>
  </span>;
}
