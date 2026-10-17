import { useEffect, useRef, useState, type ReactNode } from "react";

/** Only real cards use PolaroidTransition; inert clones never portal into the hero. */
export function PhotoCarousel({ children, clones }: { children: ReactNode; clones: ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = strip.current;
    const container = root.current;
    if (!element || !container) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 1280px)");
    let visible = false, focused = element.matches(":focus-visible"), touched = false, settling = false;
    let frame = 0, settleTimer = 0;
    let animating = false;
    let previousTime: number | null = null;
    let offset = 0;
    const position = (index: number) => {
      const card = element.children[index] as HTMLElement | undefined;
      return card ? card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2 : 0;
    };
    const normalize = (value: number) => {
      const start = position(7), cycle = position(14) - start;
      return cycle > 0 ? start + ((value - start) % cycle + cycle) % cycle : value;
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      animating = false;
      previousTime = null;
    };
    const allowed = () => !paused && !reduced.matches && !desktop.matches && visible && !document.hidden && !focused && !touched && !settling;
    const tick = (now: number) => {
      if (!allowed()) { update(); return; }
      // Retain fractional CSS pixels and cap long frames instead of jumping ahead.
      const delta = previousTime === null ? 0 : Math.min(50, now - previousTime);
      previousTime = now;
      offset = normalize(offset + 45 * delta / 1000);
      element.scrollLeft = offset;
      frame = requestAnimationFrame(tick);
    };
    const update = () => {
      stop();
      // Visibility changes and cycle wraps must not briefly restore snapping.
      element.style.scrollSnapType = desktop.matches || paused || reduced.matches || focused || touched || settling ? "" : "none";
      if (allowed()) {
        offset = normalize(element.scrollLeft);
        element.scrollLeft = offset;
        animating = true;
        frame = requestAnimationFrame(tick);
      }
    };
    const focus = () => { focused = element.matches(":focus-visible"); update(); };
    const keyboard = () => { focused = true; update(); };
    const blur = (event: FocusEvent) => {
      if (!container.contains(event.relatedTarget as Node | null)) { focused = false; update(); }
    };
    const settle = () => {
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => { settling = false; update(); }, 180);
    };
    const touch = () => { touched = true; update(); };
    const release = () => {
      if (!touched) return;
      touched = false; settling = true; update(); settle();
    };
    const wheel = () => { settling = true; update(); settle(); };
    const scroll = () => { if (!animating && settling) settle(); };
    const resize = () => { update(); };
    // Wait for the real cards to return from desktop portals on breakpoint changes.
    const mediaResize = () => { stop(); frame = requestAnimationFrame(resize); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; update(); });
    observer.observe(container);
    container.addEventListener("keydown", keyboard);
    container.addEventListener("focusin", focus);
    container.addEventListener("focusout", blur);
    element.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    element.addEventListener("wheel", wheel, { passive: true });
    element.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    desktop.addEventListener("change", mediaResize);
    window.addEventListener("resize", resize);
    if (!desktop.matches && element.scrollLeft === 0) {
      element.style.scrollSnapType = "none";
      element.scrollLeft = position(7);
    }
    update();
    return () => {
      stop(); clearTimeout(settleTimer); observer.disconnect();
      element.style.scrollSnapType = "";
      container.removeEventListener("keydown", keyboard);
      container.removeEventListener("focusin", focus); container.removeEventListener("focusout", blur);
      element.removeEventListener("pointerdown", touch); element.removeEventListener("wheel", wheel); element.removeEventListener("scroll", scroll);
      window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", release);
      document.removeEventListener("visibilitychange", update); reduced.removeEventListener("change", update);
      desktop.removeEventListener("change", mediaResize); window.removeEventListener("resize", resize);
    };
  }, [paused]);
  return <div ref={root}>
    <p id="wedding-photo-instructions" className="sr-only">Scroll horizontally to explore. Photos move continuously and pause during interaction or keyboard focus. Press Space to toggle playback; playback resumes after leaving the photos unless paused.</p>
    <div ref={strip} id="wedding-photo-strip" tabIndex={0} role="group" aria-label="Wedding photos, scroll horizontally to explore" aria-describedby="wedding-photo-instructions" onKeyDown={event => { if (event.key === " " && event.target === event.currentTarget) { event.preventDefault(); setPaused(value => !value); } }} className="relative flex snap-x snap-mandatory gap-6 overflow-x-auto px-2 py-4 focus-visible:outline-2 focus-visible:outline-[#56651f]">
      {clones}{children}{clones}
    </div>
    <span className="sr-only" role="status">{paused ? "Slideshow paused." : "Slideshow will play when not interacting with the photos."}</span>
  </div>;
}
