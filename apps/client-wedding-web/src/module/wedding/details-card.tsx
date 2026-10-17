import { useRef, type PointerEvent, type ReactNode } from "react";
import "./details-card.css";
import { PolaroidCard } from "./presentation";

/** Decorative pointer motion; the card retains its normal semantic reading order. */
export function DetailsCard({ children, className }: { children: ReactNode; className: string }) {
  const card = useRef<HTMLElement>(null);

  const reset = () => {
    card.current?.style.removeProperty("--card-tilt-x");
    card.current?.style.removeProperty("--card-tilt-y");
  };

  const tilt = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
    event.currentTarget.style.setProperty("--card-tilt-x", `${-y * 3.5}deg`);
    event.currentTarget.style.setProperty("--card-tilt-y", `${x * 3.5}deg`);
  };

  return <PolaroidCard ref={card} className={`wedding-details-card ${className}`} onPointerMove={tilt} onPointerLeave={reset} onPointerCancel={reset}>{children}</PolaroidCard>;
}
