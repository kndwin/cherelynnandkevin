import { motion } from "motion";
import { CalendarPlus, LogOut, MapPin, Sun, Sunset, CloudSun, MoonStar } from "lucide-react";
import type { ReactNode } from "react";
import { downloadWeddingCalendar } from "./wedding-calendar";
import { DetailsCard } from "./details-card";
import { TimelineItem } from "./timeline-item";

const VENUE_PHOTOS = {
  estate: { src: "/photos/venue/estate.jpg", alt: "Ravensthorpe Estate's garden ceremony setting in front of the historic house" },
  gardens: { src: "/photos/venue/gardens.jpg", alt: "The fountain and landscaped gardens at Ravensthorpe Estate" },
  celebration: { src: "/photos/venue/celebration.jpg", alt: "Outdoor tables and parasols on the lawn at Ravensthorpe Estate" },
};

interface WeddingHomeViewProps {
  readonly firstName?: string;
  readonly onSignOut?: () => void;
  readonly rsvpSection?: ReactNode;
  readonly gamesSection?: ReactNode;
}

const TIMELINE = [
  {
    time: "1:30 PM",
    title: "The Ceremony",
    phase: "Afternoon",
    icon: Sun,
    colors: "bg-[#faf6ea] text-[#5c6641]",
    description: "The moment we say ‘I do’. Join our families and friends as we begin this next chapter together at Ravensthorpe Estate.",
    photos: [VENUE_PHOTOS.estate, VENUE_PHOTOS.gardens],
  },
  {
    time: "2:30 PM",
    title: "Cocktails & Games",
    phase: "Golden hour",
    icon: Sunset,
    colors: "bg-[#f0e7d8] text-[#6b674b]",
    description: "Time to mingle, enjoy a drink and a little friendly competition while we slip away for photos.",
    photos: [VENUE_PHOTOS.celebration, VENUE_PHOTOS.gardens],
  },
  {
    time: "4:30 PM",
    title: "The Reception",
    phase: "Evening",
    icon: CloudSun,
    colors: "bg-[#e2dac5] text-[#575e40]",
    description: "Come together for dinner, heartfelt speeches and a toast to the people who made our story possible.",
    photos: [VENUE_PHOTOS.estate, VENUE_PHOTOS.celebration],
  },
  {
    time: "8:30 PM",
    title: "Dance & Send-off",
    phase: "Under the stars",
    icon: MoonStar,
    colors: "bg-[#38442e] text-[#faf1db]",
    description: "Bring your dancing shoes for one last celebration, then help send us off with all your love.",
    photos: [VENUE_PHOTOS.gardens, VENUE_PHOTOS.estate],
  },
] as const;

const POLAROIDS = [
  {
    src: "/photos/walking-together.webp",
    caption: "Side by side",
    alt: "Kevin and Cherelynn walking together through a coastal garden",
    position: "50% 85%",
    rotate: -2.5,
  },
  {
    src: "/photos/hand-in-hand.webp",
    caption: "Hand in hand",
    alt: "Kevin and Cherelynn holding hands beside the ocean",
    position: "50% 50%",
    rotate: 1.8,
  },
  {
    src: "/photos/ocean-embrace.webp",
    caption: "Wrapped in love",
    alt: "Kevin lifting Cherelynn in an embrace overlooking the ocean",
    position: "50% 50%",
    rotate: -1.2,
  },
  {
    src: "/photos/bouquet.webp",
    caption: "The little details",
    alt: "Cherelynn holding a bouquet against her white dress",
    position: "50% 50%",
    rotate: 2.2,
  },
  {
    src: "/photos/by-the-sea.webp",
    caption: "You and me",
    alt: "Kevin and Cherelynn smiling together by the sea",
    position: "50% 45%",
    rotate: -0.9,
  },
  {
    src: "/photos/close-to-you.webp",
    caption: "Close to you",
    alt: "Cherelynn smiling as she embraces Kevin in a coastal garden",
    position: "50% 50%",
    rotate: 1.4,
  },
  {
    src: "/photos/coastal-laughs.webp",
    caption: "Our favourite moments",
    alt: "Kevin and Cherelynn laughing together overlooking the coastline",
    position: "50% 65%",
    rotate: -1.6,
  },
] as const;

const WeddingHomeView = ({ firstName, onSignOut, rsvpSection, gamesSection }: WeddingHomeViewProps) => {
  const welcomeName = firstName?.trim() ? firstName.trim() : undefined;

  return (
    <div className="min-h-screen bg-[#fffef9] text-[#37430f]">
      {/* Top bar — personalized welcome */}
      {welcomeName ? (
        <div className="sticky top-0 z-20 border-b border-[#aeb89a]/30 bg-[#fffef9]/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-[#56651f]/70">
              Welcome, <span className="text-[#37430f]">{welcomeName}</span>
            </p>
            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#aeb89a]/60 bg-transparent px-3.5 py-1.5 font-sans text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#56651f] transition hover:bg-[#f8f6f0] hover:border-[#97a07c]"
              >
                <LogOut className="size-3.5" aria-hidden />
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-[#aeb89a]/20 bg-[#fffef9]">
        {/* Botanical corners frame the invitation. */}
        <img
          className="pointer-events-none absolute left-0 top-0 w-[min(30%,18rem)] select-none opacity-70"
          src="/botanical-corner-top-left.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className="pointer-events-none absolute right-0 top-0 w-[min(30%,18rem)] select-none opacity-70"
          src="/botanical-corner-top-right.png"
          alt=""
          aria-hidden="true"
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6 sm:py-20"
        >
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="font-script text-[1.4rem] leading-none text-[#7c8459] sm:text-[1.9rem]"
          >
            together with their families
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="grid justify-items-center gap-1 text-[#56651f]"
          >
            <span className="font-serif text-[clamp(2.2rem,8vw,4.8rem)] font-extralight uppercase leading-[0.92] tracking-[0.12em]">Kevin</span>
            <span className="font-script text-[clamp(1.4rem,5vw,2.4rem)] font-normal leading-none text-[#7c8459]">and</span>
            <span className="font-serif text-[clamp(2.2rem,8vw,4.8rem)] font-extralight uppercase leading-[0.92] tracking-[0.12em]">Cherelynn</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="max-w-lg font-sans text-[0.72rem] italic tracking-[0.22em] text-[#56651f]/75 sm:text-[0.8rem]"
          >
            invite you to celebrate their wedding
          </motion.p>

          {/* date + location pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="mt-2 grid gap-3 rounded-2xl border border-[#aeb89a]/35 bg-[#f8f6f0]/70 px-6 py-5 sm:px-8"
          >
            <p className="font-serif text-[1.05rem] font-light tracking-[0.14em] text-[#37430f] sm:text-[1.15rem]">
              Saturday, September 4, 2027
            </p>
            <div className="mx-auto h-px w-12 bg-[#aeb89a]/50" aria-hidden />
            <p className="inline-flex items-center justify-center gap-1.5 font-sans text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#56651f]/80">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <a href="https://ravensthorpe.com.au/" target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline focus-visible:underline">Ravensthorpe Estate</a>
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Polaroids / Memories ── */}
      <section id="memories" className="relative overflow-hidden border-b border-[#aeb89a]/15 bg-[#f8f6f0]/60">
        {/* subtle paper texture overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]" aria-hidden style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            className="mb-8 text-center sm:mb-10"
          >
            <p className="font-script text-[1.5rem] leading-none text-[#7c8459]">snapshots</p>
            <h2 className="mt-2 font-serif text-[1.55rem] font-extralight uppercase tracking-[0.18em] text-[#37430f] sm:text-[1.75rem]">
              Our Story — Polaroids
            </h2>
            <div className="mx-auto mt-3 h-px w-10 bg-[#aeb89a]/50" aria-hidden />
            <p className="mx-auto mt-3 max-w-md font-sans text-[0.72rem] leading-relaxed text-[#56651f]/60">
              A few favourite moments — drag a photo, hover for a closer look.
            </p>
          </motion.header>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ staggerChildren: 0.08 }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:gap-7"
          >
            {POLAROIDS.map((photo, index) => {
              // Staggered vertical offsets to feel scattered / tossed on table
              const offsetClass =
                index % 3 === 0
                  ? "sm:mt-6"
                  : index % 3 === 1
                    ? "sm:mt-0"
                    : "sm:mt-10";
              // Add slight negative margin overlaps on larger screens for collage feel
              const overlapClass = index === 1 ? "sm:-ml-2" : index === 4 ? "sm:-mr-2" : "";

              return (
                <motion.div
                  key={photo.src}
                  initial={{ opacity: 0, y: 24, rotate: photo.rotate }}
                  whileInView={{ opacity: 1, y: 0, rotate: photo.rotate }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 14,
                    delay: index * 0.08,
                  }}
                  whileHover={{
                    scale: 1.04,
                    rotate: 0,
                    y: -4,
                    transition: { type: "spring", stiffness: 300, damping: 18 },
                  }}
                  whileTap={{ scale: 0.98 }}
                  drag
                  dragElastic={0.2}
                  dragMomentum={false}
                  className={`group cursor-grab active:cursor-grabbing ${offsetClass} ${overlapClass} ${index === POLAROIDS.length - 1 ? "col-span-2 mx-auto w-[calc(50%-0.5rem)] sm:col-span-1 sm:col-start-2 sm:w-full" : ""}`}
                >
                  <div className="border border-black/5 bg-[#fffef9] p-2 pb-8 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-2.5 sm:pb-10">
                    <div className="aspect-square overflow-hidden bg-[#f8f6f0]">
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        style={{ objectPosition: photo.position }}
                        loading="lazy"
                        draggable={false}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <p className="pt-3 text-center font-script text-[1.05rem] leading-none text-[#37430f] sm:pt-4 sm:text-[1.15rem]">
                      {photo.caption}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </section>

      {/* ── Timeline ── */}
      {gamesSection}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8 text-center sm:mb-10">
          <p className="font-script text-[1.35rem] leading-none text-[#7c8459]">the day unfolds</p>
          <h2 className="mt-2 font-serif text-[1.55rem] font-extralight uppercase tracking-[0.18em] text-[#37430f] sm:text-[1.75rem]">Timeline</h2>
          <div className="mx-auto mt-3 h-px w-10 bg-[#aeb89a]/50" aria-hidden />
        </header>

        <motion.ol
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ staggerChildren: 0.1 }}
          className="mx-auto max-w-3xl overflow-hidden rounded-3xl"
        >
          {TIMELINE.map((item, index) => <TimelineItem key={item.title} {...item} id={`wedding-timeline-${index}`} icon={<item.icon className="size-4 shrink-0 sm:size-5" strokeWidth={1.6} aria-hidden="true" />} />)}
        </motion.ol>
      </section>

      {/* ── Details grid ── */}
      <section className="border-t border-[#aeb89a]/20 bg-[#f8f6f0]/50">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <header className="mb-8 text-center">
            <h2 className="font-serif text-[1.55rem] font-extralight uppercase tracking-[0.18em] text-[#37430f] sm:text-[1.75rem]">Details</h2>
            <p className="mx-auto mt-2 max-w-md font-sans text-[0.76rem] leading-relaxed text-[#56651f]/70">
              A few notes to help you plan.
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            <DetailsCard className="relative isolate overflow-hidden rounded-3xl border border-[#c7bd9f]/35 bg-[#fffef9] px-7 pb-12 pt-24 shadow-[0_3px_20px_rgba(55,67,15,0.04)] sm:min-h-80 sm:px-6 sm:pt-28">
              <img src="/botanical-corner-top-left.png" alt="" aria-hidden="true" loading="lazy" width={1280} height={1280} className="pointer-events-none absolute left-0 top-0 -z-10 w-36 sm:w-40" />
              <img src="/details-venue-badge.png" alt="" aria-hidden="true" loading="lazy" width={1280} height={1280} className="mb-3 size-20 object-contain" />
              <h3 className="font-serif text-[0.95rem] tracking-[0.08em] text-[#37430f]">Venue</h3>
              <p className="mt-2 font-sans text-[0.78rem] leading-relaxed text-[#56651f]/80">
                <a href="https://ravensthorpe.com.au/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Ravensthorpe Estate</a>
                <span className="mt-2 block">Approximately a 1.5-hour drive from Sydney.</span>
              </p>
            </DetailsCard>

            <DetailsCard className="relative isolate overflow-hidden rounded-3xl border border-[#c7bd9f]/35 bg-[#fffef9] px-7 pb-12 pt-24 shadow-[0_3px_20px_rgba(55,67,15,0.04)] sm:min-h-80 sm:px-6 sm:pt-28">
              <img src="/botanical-corner-top-right.png" alt="" aria-hidden="true" loading="lazy" width={1280} height={1280} className="pointer-events-none absolute right-0 top-0 -z-10 w-36 sm:w-40" />
              <img src="/details-dress-code-badge.png" alt="" aria-hidden="true" loading="lazy" width={1280} height={1280} className="mb-3 size-20 object-contain" />
              <h3 className="font-serif text-[0.95rem] tracking-[0.08em] text-[#37430f]">Dress Code</h3>
              <p className="mt-2 font-sans text-[0.78rem] leading-relaxed text-[#56651f]/80">
                Garden cocktail — think relaxed elegance.
              </p>
            </DetailsCard>
            <DetailsCard className="relative isolate overflow-hidden rounded-3xl border border-[#c7bd9f]/35 bg-[#fffef9] px-7 pb-28 pt-8 shadow-[0_3px_20px_rgba(55,67,15,0.04)] sm:min-h-80 sm:px-6 sm:pt-28">
              <img src="/botanical-corner-bottom-right.png" alt="" aria-hidden="true" loading="lazy" width={1280} height={1280} className="pointer-events-none absolute bottom-0 right-0 -z-10 w-32 sm:w-36" />
              <img src="/details-parking-badge.png" alt="" aria-hidden="true" loading="lazy" width={1280} height={1280} className="mb-3 size-20 object-contain" />
              <h3 className="font-serif text-[0.95rem] tracking-[0.08em] text-[#37430f]">Parking</h3>
              <p className="mt-2 font-sans text-[0.78rem] leading-relaxed text-[#56651f]/80">
                For parking and access information, please contact <a href="https://ravensthorpe.com.au/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Ravensthorpe Estate</a>.
              </p>
            </DetailsCard>
          </div>
        </div>
      </section>

      {/* ── RSVP (authenticated guests only) ── */}
      {rsvpSection}

      {/* ── Bottom CTA ── */}
      <section className="border-t border-[#aeb89a]/20 bg-[#fffef9] px-4 py-12 text-center sm:px-6 sm:py-14">
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => downloadWeddingCalendar(TIMELINE)}
            className="inline-flex items-center gap-2 rounded-full bg-[#56651f] px-6 py-3 font-sans text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#fffef9] shadow-sm transition hover:bg-[#465319] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#56651f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffef9]"
            aria-label="Add to calendar"
          >
            <CalendarPlus className="size-3.5" aria-hidden />
            Add to calendar
          </button>

          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-full border border-[#aeb89a]/60 bg-transparent px-6 py-3 font-sans text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#56651f] transition hover:bg-[#f8f6f0]"
            >
              <LogOut className="size-3.5" aria-hidden />
              Back to login
            </button>
          ) : null}
        </div>

        <p className="mt-8 font-serif text-[0.68rem] uppercase tracking-[0.2em] text-[#aeb89a]">Kevin and Cherelynn</p>
      </section>
    </div>
  );
};

export { WeddingHomeView };
export type { WeddingHomeViewProps };
