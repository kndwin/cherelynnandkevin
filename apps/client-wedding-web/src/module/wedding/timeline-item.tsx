import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import "./timeline-item.css";

export function TimelineItem({ id, title, phase, time, icon, colors, description, photos }: {
  id: string; title: string; phase: string; time: string; icon: ReactNode; colors: string;
  description: string; photos: readonly { src: string; alt: string }[];
}) {
  const [open, setOpen] = useState(false);
  return <li className={colors}>
    <h3><button id={`${id}-trigger`} type="button" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(value => !value)} className="block w-full px-5 py-6 text-left focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-current sm:px-8 sm:py-7">
      <span className="flex items-center justify-between gap-4 font-sans"><span className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.08em] sm:text-xs">{icon}{phase}</span><span className="shrink-0 text-xs tabular-nums sm:text-sm">{time}</span></span>
      <span className="mt-4 flex items-center justify-between gap-4 font-serif text-xl font-normal sm:text-2xl">{title}<ChevronDown aria-hidden className={`size-5 shrink-0 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} /></span>
    </button></h3>
    <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`} aria-hidden={!open} inert={!open} className="wedding-timeline-panel" data-open={open}>
      <div className="min-h-0 overflow-hidden"><div className="px-5 pb-6 sm:px-8 sm:pb-8">
        <p className="max-w-xl font-sans text-sm leading-relaxed">{description}</p>
        <figure className="mt-5"><div className="grid gap-3 sm:grid-cols-2">{photos.map(photo => <img key={photo.src} src={photo.src} alt={photo.alt} loading="lazy" width={1200} height={800} className="aspect-[3/2] w-full rounded-xl object-cover" />)}</div><figcaption className="mt-2 font-sans text-xs opacity-75">Venue photos: <a href="https://ravensthorpe.com.au/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Ravensthorpe Estate</a></figcaption></figure>
      </div></div>
    </div>
  </li>;
}
