import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button.tsx";
import { getLevelProgress, hasLevelOverride, markScrollsFinished } from "@/module/levels/progress.ts";
import { useEffect, useRef } from "react";

const videos = [
  { id: "memory-3", src: "/videos/memory-3.m4v", title: "4 weeks ago" },
  { id: "memory-4", src: "/videos/memory-4.m4v", title: "4 weeks ago" },
  { id: "memory-2", src: "/videos/memory-2.m4v", title: "2 weeks ago" },
  { id: "memory-1", src: "/videos/memory-1.m4v", title: "6 days ago" },
  { id: "memory-5", src: "/videos/memory-5.m4v", title: "3 days ago" },
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

      <div className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth" aria-label="Video memories">
        {videos.map((video, index) => (
          <article className="relative grid h-svh snap-start overflow-hidden bg-black" key={video.id} aria-label={`Memory ${index + 1}`}>
            <ScrollVideo src={video.src} label={`Memory ${index + 1}`} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 grid gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+4rem))] pt-20">
              <span className="w-fit rounded-full bg-black/35 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
                Our memories · {index + 1}/{videos.length}
              </span>
              <h3 className="m-0 font-heading text-[clamp(2.25rem,12vw,4.5rem)] leading-none tracking-tight drop-shadow-lg">
                {video.title}
              </h3>
            </div>
          </article>
        ))}
        <article className="relative grid h-svh snap-start place-items-center overflow-hidden bg-[#120816] px-6 text-center" aria-label="End of memories">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(142,78,198,0.3),transparent_38%)]" />
          <div className="relative grid justify-items-center gap-5">
            <p className="m-0 text-xs font-black uppercase tracking-[0.3em] text-white/55">Cherelynn & Kevin</p>
            <h3 className="m-0 font-heading text-[clamp(6rem,35vw,14rem)] font-semibold italic leading-[0.7] tracking-[-0.06em] text-white">
              fin.
            </h3>
            <Link className="mt-5 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-extrabold text-white no-underline backdrop-blur-md transition hover:bg-white/20" to="/" onClick={markScrollsFinished}>
              Back to levels
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
};

const ScrollVideo = ({ label, src }: { readonly label: string; readonly src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (video === null) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.7 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      aria-label={label}
      className="size-full object-cover"
      controls
      loop
      muted
      playsInline
      preload="metadata"
      src={src}
    />
  );
};
