import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Desktop photos frame the invitation; smaller screens keep native scroll slots. */
export function PolaroidTransition({ index, className, children }: { index: number; className: string; children: ReactNode }) {
  const [hero, setHero] = useState<HTMLElement | null>(null);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const update = () => setDesktop(media.matches);
    setHero(document.getElementById("wedding-invitation"));
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!desktop || !hero) return <div className={className}>{children}</div>;

  const left = index % 2 === 0;
  const row = Math.floor(index / 2);
  return createPortal(
    <div
      className="absolute z-10 w-28"
      style={{
        left: left ? "calc((100% - 680px) / 4)" : "calc(100% - (100% - 680px) / 4)",
        top: `${24 + row * 180}px`,
        transform: `translateX(-50%) rotate(${left ? -4 : 4}deg)`,
      }}
    >{children}</div>, hero,
  );
}
