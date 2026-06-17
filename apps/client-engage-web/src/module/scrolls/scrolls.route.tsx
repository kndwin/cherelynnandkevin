import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button.tsx";
import { getLevelProgress, hasLevelOverride } from "@/module/levels/progress.ts";

const mockVideos = [
  {
    id: "soft-launch",
    title: "Soft launch energy",
    caption: "A tiny montage placeholder for the first reveal.",
    tag: "for you",
    likes: "22.6K",
    comments: "314",
    gradient: "from-[#2d1747] via-[#8e4ec6] to-[#f2c6ff]",
  },
  {
    id: "coffee-run",
    title: "Coffee run cutaway",
    caption: "Mock clip: iced drinks, sidewalk light, two hands in frame.",
    tag: "daily",
    likes: "9.8K",
    comments: "88",
    gradient: "from-[#402060] via-[#7c4d2d] to-[#e0c4f4]",
  },
  {
    id: "date-night",
    title: "Date night fit check",
    caption: "Placeholder video for mirror snaps and too many outfit options.",
    tag: "date night",
    likes: "18.4K",
    comments: "226",
    gradient: "from-[#1b141d] via-[#664282] to-[#ffb6d5]",
  },
  {
    id: "proposal-b-roll",
    title: "Proposal b-roll",
    caption: "Slow hands, fast heart, pretend sparkle overlay.",
    tag: "memory",
    likes: "40.2K",
    comments: "702",
    gradient: "from-[#301a3a] via-[#c89a35] to-[#fbf7fe]",
  },
  {
    id: "travel-day",
    title: "Travel day chaos",
    caption: "A mock airport clip with snacks doing most of the work.",
    tag: "travel",
    likes: "12.1K",
    comments: "144",
    gradient: "from-[#0f2f3d] via-[#8e4ec6] to-[#d19dff]",
  },
  {
    id: "tiny-dance",
    title: "Kitchen dance break",
    caption: "Seven seconds of movement, dishes carefully cropped out.",
    tag: "home",
    likes: "31.7K",
    comments: "519",
    gradient: "from-[#432155] via-[#be93e4] to-[#f7edfe]",
  },
  {
    id: "final-card",
    title: "End card tease",
    caption: "Mock clip number seven. Swap this for a real video later.",
    tag: "level 3",
    likes: "52.2K",
    comments: "1.2K",
    gradient: "from-[#24112e] via-[#8145b5] to-[#ecd9fa]",
  },
] as const;

const isLevel3Unlocked = () => getLevelProgress().connectionsSolved || hasLevelOverride(3);

export const ScrollsRoute = () => {
  if (!isLevel3Unlocked()) {
    return (
      <section className="grid min-h-[calc(100svh-1.3rem)] place-items-center rounded-[clamp(22px,6vw,32px)] border border-[color-mix(in_oklch,var(--purple-7),transparent_42%)] bg-[color-mix(in_oklch,var(--card),transparent_8%)] p-[clamp(1rem,5vw,2rem)] text-center shadow-[0_28px_90px_color-mix(in_oklch,var(--purple-11),transparent_86%)]">
        <div className="grid max-w-sm gap-3">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--purple-11)]">Level 3</p>
          <h2 className="m-0 font-heading text-[clamp(2.2rem,12vw,4rem)] leading-none tracking-tight">Scrolls locked</h2>
          <p className="m-0 text-muted-foreground">Finish Level 2 Connections to unlock this feed, or open it with ?level=3 while testing.</p>
          <Link className={buttonVariants()} to="/connections">
            Back to Connections
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative -m-[clamp(0.65rem,3.4vw,2rem)] h-svh overflow-hidden bg-[#120816] text-white sm:rounded-[32px]">
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/75 to-transparent px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="m-0 text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/70">Level 3</p>
            <h2 className="m-0 font-heading text-3xl leading-none tracking-tight">Scrolls</h2>
          </div>
          <Link className="pointer-events-auto rounded-full bg-white/14 px-3 py-2 text-sm font-extrabold text-white no-underline backdrop-blur-md" to="/">
            Levels
          </Link>
        </div>
      </div>

      <div className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth" aria-label="Mock video feed">
        {mockVideos.map((video, index) => (
          <article className={`relative grid h-svh snap-start overflow-hidden bg-gradient-to-br ${video.gradient}`} key={video.id} aria-label={video.title}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.38),transparent_24%),radial-gradient(circle_at_78%_16%,rgba(255,255,255,0.22),transparent_18%),linear-gradient(to_top,rgba(0,0,0,0.82),transparent_54%)]" />
            <div className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/18 text-3xl shadow-2xl backdrop-blur-md">
              ▶
            </div>

            <div className="relative z-10 mt-auto grid grid-cols-[1fr_auto] items-end gap-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-28">
              <div className="grid gap-2 pb-2">
                <span className="w-fit rounded-full bg-white/16 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/80 backdrop-blur-md">
                  {video.tag} · {index + 1}/7
                </span>
                <h3 className="m-0 max-w-[12ch] font-heading text-[clamp(2.25rem,14vw,5rem)] leading-[0.82] tracking-tight drop-shadow-lg">
                  {video.title}
                </h3>
                <p className="m-0 max-w-[22rem] text-sm font-semibold leading-snug text-white/86 drop-shadow">{video.caption}</p>
              </div>

              <div className="grid gap-3 pb-2 text-center text-xs font-black">
                <MockAction label="Like" value={video.likes} icon="♡" />
                <MockAction label="Comment" value={video.comments} icon="✎" />
                <MockAction label="Share" value="Share" icon="↗" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const MockAction = ({ icon, label, value }: { readonly icon: string; readonly label: string; readonly value: string }) => (
  <Button
    className="grid h-auto justify-items-center gap-1 rounded-full bg-black/22 px-2 py-2 text-white shadow-xl backdrop-blur-md hover:bg-black/32"
    type="button"
    variant="ghost"
    aria-label={label}
  >
    <span className="grid size-11 place-items-center rounded-full bg-white/20 text-2xl">{icon}</span>
    <span className="text-[0.68rem] leading-none">{value}</span>
  </Button>
);
