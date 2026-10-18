import { motion } from "motion";
import {
  CalendarPlus,
  LogOut,
  MapPin,
  Shirt,
  CircleParking,
} from "lucide-react";
import type { ReactNode } from "react";
import { downloadWeddingCalendar } from "./wedding-calendar";
import { DetailsCard } from "./details-card";
import { TimelineItem } from "./timeline-item";
import { PolaroidTransition } from "./polaroid-transition";
import { PhotoCarousel } from "./photo-carousel";
import {
  CardHeading,
  SectionHeading,
  polaroidFrameClass,
} from "./presentation";
import { cn } from "@/lib/utils";

interface WeddingHomeViewProps {
  readonly firstName?: string;
  readonly onSignOut?: () => void;
  readonly rsvpSection?: ReactNode;
  readonly gamesSection?: ReactNode;
}

const TIMELINE = [
  {
    time: "1:30 PM",
    title: "Ceremony",
    colors: "bg-[#faf6ea] text-[#5c6641]",
    description:
      "The moment we say ‘I do’. Join our families and friends as we begin this next chapter together at Ravensthorpe Estate.",
  },
  {
    time: "3:00 PM",
    title: "Cocktail Hour",
    colors: "bg-[#f0e7d8] text-[#6b674b]",
    description:
      "Time to mingle, enjoy a drink and a little friendly competition while we slip away for photos.",
  },
  {
    time: "4:30 PM",
    title: "Reception",
    colors: "bg-[#e2dac5] text-[#575e40]",
    description:
      "Come together for dinner, heartfelt speeches and a toast to the people who made our story possible.",
  },
  {
    time: "9:00 PM",
    title: "Send off",
    colors: "bg-[#38442e] text-[#faf1db]",
    description:
      "Bring your dancing shoes for one last celebration, then help send us off with all your love.",
  },
] as const;

const POLAROIDS = [
  {
    src: "/photos/walking-together.webp",
    alt: "Kevin and Cherelynn walking together through a coastal garden",
    position: "50% 85%",
    rotate: -2.5,
  },
  {
    src: "/photos/hand-in-hand.webp",
    alt: "Kevin and Cherelynn holding hands beside the ocean",
    position: "50% 50%",
    rotate: 1.8,
  },
  {
    src: "/photos/ocean-embrace.webp",
    alt: "Kevin lifting Cherelynn in an embrace overlooking the ocean",
    position: "50% 50%",
    rotate: -1.2,
  },
  {
    src: "/photos/bouquet.webp",
    alt: "Cherelynn holding a bouquet against her white dress",
    position: "50% 50%",
    rotate: 2.2,
  },
  {
    src: "/photos/by-the-sea.webp",
    alt: "Kevin and Cherelynn smiling together by the sea",
    position: "50% 45%",
    rotate: -0.9,
  },
  {
    src: "/photos/close-to-you.webp",
    alt: "Cherelynn smiling as she embraces Kevin in a coastal garden",
    position: "50% 50%",
    rotate: 1.4,
  },
  {
    src: "/photos/coastal-laughs.webp",
    alt: "Kevin and Cherelynn laughing together overlooking the coastline",
    position: "50% 65%",
    rotate: -1.6,
  },
] as const;

const WeddingHomeView = ({
  firstName,
  onSignOut,
  rsvpSection,
  gamesSection,
}: WeddingHomeViewProps) => {
  const welcomeName = firstName?.trim() ? firstName.trim() : undefined;

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Top bar — personalized welcome */}
      {welcomeName ? (
        <div className="sticky top-0 z-30 bg-background backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-olive/70">
              Welcome, <span className="text-foreground">{welcomeName}</span>
            </p>
            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-transparent px-3.5 py-1.5 font-sans text-[0.68rem] font-bold uppercase tracking-[0.14em] text-olive transition hover:bg-paper-muted hover:border-input"
              >
                <LogOut className="size-3.5" aria-hidden />
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── Hero ── */}
      <section
        id="wedding-invitation"
        className="relative flex items-start justify-center bg-background xl:min-h-[760px]"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-20 mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 pt-14 pb-7 text-center sm:px-6 sm:py-20"
        >
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="grid justify-items-center gap-1 text-olive"
          >
            <span className="font-serif text-[clamp(2.2rem,8vw,4.8rem)] font-extralight uppercase leading-[0.92] tracking-[0.12em]">
              Kevin
            </span>
            <span className="font-script text-[clamp(1.4rem,5vw,2.4rem)] font-normal leading-none text-olive-muted">
              and
            </span>
            <span className="font-serif text-[clamp(2.2rem,8vw,4.8rem)] font-extralight uppercase leading-[0.92] tracking-[0.12em]">
              Cherelynn
            </span>
          </motion.h1>

          {/* Date and venue */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="mt-2 grid gap-3 text-center"
          >
            <p className="font-serif text-[1.05rem] font-light tracking-[0.14em] text-foreground sm:text-[1.15rem]">
              September 4th, 2027
            </p>
            <p className="inline-flex items-center justify-center gap-1.5 font-sans text-[0.7rem] font-bold uppercase tracking-[0.16em] text-olive/80">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <a
                href="https://ravensthorpe.com.au/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline focus-visible:underline"
              >
                Ravensthorpe Estate
              </a>
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Polaroids / Memories ── */}
      <section
        id="memories"
        aria-label="Photos of Kevin and Cherelynn"
        aria-roledescription="carousel"
        className="relative min-w-0 bg-background xl:hidden"
      >
        <div className="relative mx-auto max-w-5xl px-4 pt-6 pb-12 sm:px-6 sm:py-16">
          <PhotoCarousel
            clones={POLAROIDS.map((photo) => (
              <div
                key={photo.src}
                aria-hidden="true"
                inert
                className="w-[82%] max-w-80 shrink-0 snap-center xl:hidden"
              >
                <figure
                  className={cn(
                    polaroidFrameClass,
                    "p-2 pb-8 sm:p-2.5 sm:pb-10",
                  )}
                >
                  <div className="aspect-square overflow-hidden bg-paper-muted">
                    <img
                      src={photo.src}
                      alt=""
                      style={{ objectPosition: photo.position }}
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </figure>
              </div>
            ))}
          >
            {POLAROIDS.map((photo, index) => {
              return (
                <PolaroidTransition
                  key={photo.src}
                  index={index}
                  className="w-[82%] max-w-80 shrink-0 snap-center"
                >
                  <figure
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${index + 1} of ${POLAROIDS.length}`}
                    className={cn(
                      polaroidFrameClass,
                      "p-2 pb-8 xl:shadow-photo-desktop sm:p-2.5 sm:pb-10",
                    )}
                  >
                    <div className="aspect-square overflow-hidden bg-paper-muted">
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        style={{ objectPosition: photo.position }}
                        loading="eager"
                        draggable={false}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </figure>
                </PolaroidTransition>
              );
            })}
          </PhotoCarousel>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8 text-center sm:mb-10">
          <SectionHeading>Timeline</SectionHeading>
        </header>

        <ol className="relative mx-auto max-w-3xl bg-background text-olive-soft before:absolute before:inset-y-6 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-olive-soft">
          {TIMELINE.map((item) => (
            <TimelineItem
              key={item.title}
              title={item.title}
              time={item.time}
            />
          ))}
        </ol>
      </section>

      {/* ── Details grid ── */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <header className="mb-8 text-center">
            <SectionHeading>Details</SectionHeading>
          </header>

          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            <DetailsCard className="relative text-center">
              <CardHeading
                className="px-5 py-6"
                icon={
                  <MapPin
                    className="size-8 shrink-0"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                }
              >
                Location
              </CardHeading>
              <iframe
                title="Map showing Ravensthorpe Estate"
                src="https://maps.google.com/maps?q=Ravensthorpe+Estate+Albion+Park+NSW+Australia&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block h-[220px] w-full border-0"
              />
            </DetailsCard>

            <DetailsCard className="relative px-5 py-6 text-center">
              <CardHeading
                icon={
                  <Shirt
                    className="size-8 shrink-0"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                }
              >
                Dress Code
              </CardHeading>
              <p className="mt-3 font-sans text-sm leading-relaxed text-olive-soft">
                Garden formal attire. <br />
                Western, Indian, or Vietnamese <br /> traditional dress
                welcomed.
              </p>
            </DetailsCard>
            <DetailsCard className="relative px-5 py-6 text-center">
              <CardHeading
                icon={
                  <CircleParking
                    className="size-8 shrink-0"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                }
              >
                Parking
              </CardHeading>
              <p className="mt-3 font-sans text-sm leading-relaxed text-olive-soft">
                On-site parking is available.
                <br /> Please carpool where possible.
              </p>
            </DetailsCard>
          </div>
        </div>
      </section>

      {/* ── RSVP (authenticated guests only) ── */}
      {rsvpSection}
      {gamesSection}

      {/* ── Footer ── */}
      <section className="bg-background px-4 py-12 text-center sm:px-6 sm:py-14">
        <p className="font-serif text-[0.68rem] uppercase tracking-[0.2em] text-border">
          Kevin and Cherelynn
        </p>
      </section>
    </div>
  );
};

const WeddingCalendarButton = () => (
  <button
    type="button"
    onClick={() => downloadWeddingCalendar(TIMELINE)}
    className="inline-flex items-center gap-2 rounded-full bg-olive px-6 py-3 font-sans text-[0.72rem] font-bold uppercase tracking-[0.16em] text-paper shadow-sm transition hover:bg-olive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    aria-label="Add to calendar"
  >
    <CalendarPlus className="size-3.5" aria-hidden />
    Add to calendar
  </button>
);

export { WeddingHomeView, WeddingCalendarButton };
export type { WeddingHomeViewProps };
