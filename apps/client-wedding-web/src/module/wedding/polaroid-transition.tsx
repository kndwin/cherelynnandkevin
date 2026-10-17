import { useEffect, useRef, type ReactNode } from "react";

/** Keep one photo in the document; translate it from the invitation into its grid slot. */
export function PolaroidTransition({ index, className, children }: { index: number; className: string; children: ReactNode }) {
  const slot = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const target = slot.current;
      const card = photo.current;
      const hero = document.getElementById("wedding-invitation");
      if (!target || !card || !hero) return;
      if (!media.matches) { card.style.transform = ""; return; }
      const rect = target.getBoundingClientRect();
      const invitation = hero.getBoundingClientRect();
      const heroTop = invitation.top + window.scrollY;
      const start = heroTop;
      const end = heroTop + invitation.height * 0.85;
      const progress = Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
      const eased = progress * progress * (3 - 2 * progress);
      const text = hero.firstElementChild?.getBoundingClientRect();
      const centerWidth = Math.min(680, text?.width ?? 680);
      const laneWidth = (window.innerWidth - centerWidth) / 2;
      const width = Math.min(160, laneWidth - 64, invitation.height * 0.17);
      const left = index % 2 === 0;
      const row = Math.floor(index / 2);
      const count = left ? 4 : 3;
      const height = width * target.offsetHeight / rect.width;
      const x = left ? (laneWidth - width) / 2 : window.innerWidth - (laneWidth + width) / 2;
      const y = heroTop + 24 + row * (invitation.height - height - 48) / (count - 1);
      const scale = width / rect.width;
      card.style.transform = `translate(${(x - rect.left) * (1 - eased)}px, ${(y - (rect.top + window.scrollY)) * (1 - eased)}px) scale(${scale + (1 - scale) * eased}) rotate(${(left ? -4 : 4) * (1 - eased)}deg)`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    if (slot.current) observer.observe(slot.current);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    update();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); media.removeEventListener("change", schedule); };
  }, [index]);
  return <div ref={slot} className={className}><div ref={photo} className="relative z-10 origin-top-left will-change-transform">{children}</div></div>;
}
