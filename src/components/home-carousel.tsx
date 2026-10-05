"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { BrandMark } from "./brand";

const slides = [
  { eyebrow: "DE ACÁ. PARA VOS.", first: "Lo que buscás,", second: "más cerca.", description: "Encontrá tu próximo producto en San Juan.", theme: "sky" },
  { eyebrow: "ESO QUE YA NO USÁS", first: "Nueva historia.", second: "Nuevo dueño.", description: "Publicalo y hacé lugar para lo que viene.", theme: "blue" },
  { eyebrow: "SAN JUAN NOS ENCUENTRA", first: "Tu próximo hallazgo", second: "está por acá.", description: "Explorá, descubrí y encontrá eso que te faltaba.", theme: "ice" },
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
    <section className={`home-carousel carousel-${slides[active].theme}`} aria-label="Novedades de La Higuera" aria-roledescription="carrusel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
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
      <div className="shell relative">
        <div className="carousel-slides" aria-live={rotating ? "off" : "polite"}>
          {slides.map((slide, index) => (
            <div key={slide.eyebrow} className="carousel-slide" data-active={index === active} aria-hidden={index !== active} inert={index !== active} role="group" aria-roledescription="mensaje" aria-label={`${index + 1} de ${slides.length}`}>
              <div className="relative z-10 max-w-[750px]">
                <p className="carousel-eyebrow">{slide.eyebrow}</p>
                <h2 className="carousel-title">{slide.first}<br /><span>{slide.second}</span></h2>
                <p className="carousel-description">{slide.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="carousel-art" aria-hidden="true">
          <div className="carousel-orbit carousel-orbit-outer" /><div className="carousel-orbit carousel-orbit-inner" />
          <div className="carousel-brand"><BrandMark className="h-full w-full" /></div>
          <span className="carousel-spark">+</span><span className="carousel-bubble" />
        </div>
        <div className="carousel-controls">
          <div className="flex items-center gap-1">
            {slides.map((slide, index) => <button key={slide.eyebrow} aria-label={`Mostrar mensaje ${index + 1}`} aria-pressed={active === index} onClick={() => showSlide(index)} className="carousel-dot"><span /></button>)}
            {!reducedMotion && <button className="carousel-play" onClick={() => setPaused(value => !value)} aria-label={paused ? "Reanudar carrusel" : "Pausar carrusel"}>{paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}</button>}
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-3 text-xs font-medium tabular-nums">0{active + 1} <span className="opacity-45">/ 03</span></span>
            <button className="carousel-arrow" aria-label="Mensaje anterior" onClick={() => showSlide(active - 1)}><ArrowLeft className="size-4" /></button>
            <button className="carousel-arrow" aria-label="Mensaje siguiente" onClick={() => showSlide(active + 1)}><ArrowRight className="size-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
