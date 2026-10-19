"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, Tag } from "lucide-react";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";

// Banners de venta (ver "Diseño" en CLAUDE.md). Las imágenes de public/banners son de muestra: al tener fotos reales, cambiar `image`.
// La promo solo puede prometer lo que la plataforma cumple: los gasistas cargan matrícula y publicar no tiene costo.
const slides = [
  { promo: "Con matrícula", first: "Conseguí tu gasista", second: "matriculado.", description: "Instalaciones, reparaciones y revisiones de gas en San Juan. Hablá directo con el profesional.", cta: "Ver gasistas", href: "/servicios?category=gasista", image: "/banners/gasista.svg", theme: "blue" },
  { promo: "Opciones apto crédito", first: "Tu nueva casa", second: "te espera.", description: "Casas, departamentos y terrenos en venta y alquiler en todo San Juan.", cta: "Ver inmuebles", href: "/?category=inmuebles#listado", image: "/banners/casa.svg", theme: "ice" },
  { promo: "Sin comisiones", first: "Vendé lo que ya no usás.", second: "Publicá gratis.", description: "Subí fotos, poné tu precio y recibí consultas de compradores cerca tuyo.", cta: "Publicar gratis", href: "/productos/nuevo", image: "/banners/vender.svg", theme: "sky" },
] as const;

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotionSnapshot = () => true;

export function HomeCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const touchStart = useRef<number | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, serverMotionSnapshot);
  const rotating = !paused && !hovered && !reducedMotion;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [rotating]);

  function showSlide(index: number) {
    setActive((index + slides.length) % slides.length);
    setPaused(true);
  }

  return (
    <section className={`home-carousel carousel-${slides[active].theme}`} aria-label="Promociones destacadas" aria-roledescription="carrusel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onTouchStart={event => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={event => {
        if (touchStart.current === null) return;
        const distance = event.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(distance) > 50) showSlide(active + (distance > 0 ? -1 : 1));
      }}
      onFocusCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget) && !(event.target instanceof Element && event.target.closest(".carousel-play"))) setPaused(true);
      }}
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          showSlide(active + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <div className="shell">
        <div className="carousel-slides" aria-live={rotating ? "off" : "polite"}>
          {slides.map((slide, index) => (
            <div key={slide.href} className="carousel-slide" data-active={index === active} aria-hidden={index !== active} inert={index !== active} role="group" aria-roledescription="mensaje" aria-label={`${index + 1} de ${slides.length}`}>
              <div className="carousel-copy">
                <p className="carousel-promo"><Tag className="size-3.5" aria-hidden="true" />{slide.promo}</p>
                <h2 className="carousel-title">{slide.first}{" "}<br /><span>{slide.second}</span></h2>
                <p className="carousel-description">{slide.description}</p>
                {/* El ::after de .carousel-cta cubre el banner entero: toda la pieza es clickeable. */}
                <Link href={slide.href} className={cn(buttonVariants({ variant: slide.theme === "ice" ? "default" : "onDark" }), "carousel-cta")}>{slide.cta}<ArrowRight className="size-4" /></Link>
              </div>
              <div className="carousel-media"><Image src={slide.image} alt="" fill sizes="(min-width: 1024px) 400px, (min-width: 640px) 240px, 112px" preload={index === 0} /></div>
            </div>
          ))}
        </div>
        <div className="carousel-controls">
          <div className="flex items-center gap-1">
            {slides.map((slide, index) => <button key={slide.href} aria-label={`Mostrar mensaje ${index + 1}`} aria-pressed={active === index} onClick={() => showSlide(index)} className="carousel-dot"><span /></button>)}
            {!reducedMotion && <button className="carousel-play" onClick={() => setPaused(value => !value)} aria-label={paused ? "Reanudar carrusel" : "Pausar carrusel"}>{paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}</button>}
          </div>
          <div className="flex items-center gap-2">
            <button className="carousel-arrow carousel-arrow-prev" aria-label="Mensaje anterior" onClick={() => showSlide(active - 1)}><ArrowLeft className="size-4" /></button>
            <button className="carousel-arrow carousel-arrow-next" aria-label="Mensaje siguiente" onClick={() => showSlide(active + 1)}><ArrowRight className="size-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
