import { motion } from "motion";
import { CalendarPlus, LogOut, MapPin, Shirt, BedDouble } from "lucide-react";

interface WeddingHomeViewProps {
  readonly firstName?: string;
  readonly onSignOut?: () => void;
}

const TIMELINE = [
  {
    time: "3:30 PM",
    title: "Ceremony",
    description: "Join us as we exchange vows surrounded by family and friends.",
  },
  {
    time: "4:30 PM",
    title: "Cocktail Hour",
    description: "Drinks and canapés on the terrace — take a stroll and soak it in.",
  },
  {
    time: "6:00 PM",
    title: "Reception",
    description: "Dinner, speeches, and a few surprises. Come hungry.",
  },
  {
    time: "9:00 PM",
    title: "Dance & Send-off",
    description: "Music, dancing, and a sparkler farewell to close the night.",
  },
] as const;

const POLAROIDS = [
  {
    src: "https://picsum.photos/seed/kevin-cherelynn1/400/400",
    caption: "First adventure",
    rotate: -2.5,
  },
  {
    src: "https://picsum.photos/seed/kevin-cherelynn2/400/500",
    caption: "Proposal day",
    rotate: 1.8,
  },
  {
    src: "https://picsum.photos/seed/kevin-cherelynn3/400/450",
    caption: "Family",
    rotate: -1.2,
  },
  {
    src: "https://picsum.photos/seed/kevin-cherelynn4/500/400",
    caption: "Sydney sunsets",
    rotate: 2.2,
  },
  {
    src: "https://picsum.photos/seed/kevin-cherelynn5/400/400",
    caption: "Late night laughs",
    rotate: -0.9,
  },
  {
    src: "https://picsum.photos/seed/kevin-cherelynn6/400/480",
    caption: "Our favourite place",
    rotate: 1.4,
  },
] as const;

const WeddingHomeView = ({ firstName, onSignOut }: WeddingHomeViewProps) => {
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
        {/* subtle floral accents — corner only, low opacity */}
        <img
          className="pointer-events-none absolute -left-6 -top-6 w-[min(42%,18rem)] select-none opacity-[0.18] sm:w-[min(28%,20rem)]"
          src="/florals.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className="pointer-events-none absolute -right-6 -top-6 w-[min(42%,18rem)] select-none scale-x-[-1] opacity-[0.18] sm:w-[min(28%,20rem)]"
          src="/florals.png"
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
              {/* TODO: confirm final date — placeholder */}
              Saturday, March 27, 2027
            </p>
            <div className="mx-auto h-px w-12 bg-[#aeb89a]/50" aria-hidden />
            <p className="inline-flex items-center justify-center gap-1.5 font-sans text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#56651f]/80">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              Sydney, Australia — venue to be announced
            </p>
            <p className="font-sans text-[0.64rem] italic tracking-wide text-[#7c8459]">Date &amp; venue are placeholders — final details coming soon.</p>
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
                  className={`group cursor-grab active:cursor-grabbing ${offsetClass} ${overlapClass}`}
                >
                  <div className="border border-black/5 bg-[#fffef9] p-2 pb-8 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-2.5 sm:pb-10">
                    <div className="aspect-square overflow-hidden bg-[#f8f6f0]">
                      <img
                        src={photo.src}
                        alt={photo.caption}
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

          <p className="mt-8 text-center font-sans text-[0.66rem] italic tracking-wide text-[#7c8459] sm:mt-10">
            Placeholder photos via picsum.photos — real memories coming soon.
          </p>
        </div>
      </section>

      {/* ── Timeline ── */}
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
          className="relative mx-auto max-w-xl"
        >
          {/* vertical line */}
          <div className="absolute bottom-6 left-[11px] top-2 w-px bg-[#aeb89a]/40 sm:left-[13px]" aria-hidden />

          {TIMELINE.map((item, index) => (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                type: "spring",
                stiffness: 140,
                damping: 16,
                delay: index * 0.08,
              }}
              className="relative flex gap-4 pb-8 last:pb-0 sm:gap-5"
            >
              {/* dot */}
              <span className="relative mt-1 flex size-[22px] shrink-0 items-center justify-center rounded-full border border-[#aeb89a]/40 bg-[#fffef9] sm:size-[26px]">
                <span className="size-[9px] rounded-full bg-[#56651f] sm:size-[10px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-[#aeb89a]/25 bg-[#f8f6f0]/60 px-4 py-4 text-left sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-[0.95rem] font-normal tracking-[0.08em] text-[#37430f] sm:text-[1.05rem]">{item.title}</h3>
                  <span className="rounded-full bg-[#56651f] px-2.5 py-1 font-sans text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#fffef9]">
                    {item.time}
                  </span>
                </div>
                <p className="mt-2 font-sans text-[0.78rem] leading-relaxed text-[#56651f]/80">{item.description}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
        <p className="mx-auto mt-6 max-w-xl text-center font-sans text-[0.66rem] italic tracking-wide text-[#7c8459]">
          Times are placeholders — final schedule to be confirmed.
        </p>
      </section>

      {/* ── Details grid ── */}
      <section className="border-t border-[#aeb89a]/20 bg-[#f8f6f0]/50">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <header className="mb-8 text-center">
            <h2 className="font-serif text-[1.55rem] font-extralight uppercase tracking-[0.18em] text-[#37430f] sm:text-[1.75rem]">Details</h2>
            <p className="mx-auto mt-2 max-w-md font-sans text-[0.76rem] leading-relaxed text-[#56651f]/70">
              A few notes to help you plan — we&apos;ll share more as soon as everything is locked in.
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            <article className="rounded-2xl border border-[#aeb89a]/25 bg-[#fffef9] px-5 py-6 shadow-[0_1px_12px_rgba(55,67,15,0.06)]">
              <div className="mb-3 flex size-9 items-center justify-center rounded-full bg-[#56651f]/10 text-[#56651f]">
                <MapPin className="size-4" aria-hidden />
              </div>
              <h3 className="font-serif text-[0.95rem] tracking-[0.08em] text-[#37430f]">Venue</h3>
              <p className="mt-2 font-sans text-[0.78rem] leading-relaxed text-[#56651f]/80">
                Sydney, Australia. Exact venue to be announced — expect harbor views and easy transport.
              </p>
              <p className="mt-3 font-sans text-[0.68rem] italic text-[#7c8459]">Placeholder</p>
            </article>

            <article className="rounded-2xl border border-[#aeb89a]/25 bg-[#fffef9] px-5 py-6 shadow-[0_1px_12px_rgba(55,67,15,0.06)]">
              <div className="mb-3 flex size-9 items-center justify-center rounded-full bg-[#56651f]/10 text-[#56651f]">
                <BedDouble className="size-4" aria-hidden />
              </div>
              <h3 className="font-serif text-[0.95rem] tracking-[0.08em] text-[#37430f]">Stay</h3>
              <p className="mt-2 font-sans text-[0.78rem] leading-relaxed text-[#56651f]/80">
                We&apos;ll share nearby accommodation and a group block once the venue is confirmed.
              </p>
              <p className="mt-3 font-sans text-[0.68rem] italic text-[#7c8459]">Placeholder</p>
            </article>

            <article className="rounded-2xl border border-[#aeb89a]/25 bg-[#fffef9] px-5 py-6 shadow-[0_1px_12px_rgba(55,67,15,0.06)]">
              <div className="mb-3 flex size-9 items-center justify-center rounded-full bg-[#56651f]/10 text-[#56651f]">
                <Shirt className="size-4" aria-hidden />
              </div>
              <h3 className="font-serif text-[0.95rem] tracking-[0.08em] text-[#37430f]">Dress Code</h3>
              <p className="mt-2 font-sans text-[0.78rem] leading-relaxed text-[#56651f]/80">
                Garden cocktail — think relaxed elegance. Details and palette suggestions coming soon.
              </p>
              <p className="mt-3 font-sans text-[0.68rem] italic text-[#7c8459]">Placeholder</p>
            </article>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t border-[#aeb89a]/20 bg-[#fffef9] px-4 py-12 text-center sm:px-6 sm:py-14">
        <p className="font-script text-[1.5rem] leading-none text-[#7c8459]">more to come</p>
        <p className="mx-auto mt-3 max-w-md font-sans text-[0.78rem] leading-relaxed text-[#56651f]/75">
          We&apos;re still putting the finishing touches together. Check back soon for invitations, RSVP, and the full weekend guide.
        </p>
        <p className="mt-2 font-sans text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#56651f]/60">More details coming soon — stay tuned</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              // Non-functional placeholder — wire to ICS download later
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#56651f] px-6 py-3 font-sans text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#fffef9] shadow-sm transition hover:bg-[#465319] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#56651f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffef9]"
            aria-label="Add to calendar — coming soon"
            title="Calendar invite coming soon"
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

        <p className="mt-8 font-serif text-[0.68rem] uppercase tracking-[0.2em] text-[#aeb89a]">K &amp; C · 2027</p>
      </section>
    </div>
  );
};

export { WeddingHomeView };
export type { WeddingHomeViewProps };
