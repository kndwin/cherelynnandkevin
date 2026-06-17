import { Link, Outlet, createRootRoute, createRoute } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button.tsx";
import { ConnectionsRoute } from "@/module/connections/connections.route.tsx";
import { PinGate } from "@/module/gate/pin-gate.tsx";
import { getLevelProgress, hasLevelOverride } from "@/module/levels/progress.ts";
import { ScrollsRoute } from "@/module/scrolls/scrolls.route.tsx";
import { TodoRoute } from "@/module/todo/todo.route.tsx";
import { WordleRoute } from "@/module/wordle/wordle.route.tsx";

const rootRoute = createRootRoute({
  component: () => (
    <PinGate>
      <main className="mx-auto box-border min-h-screen max-w-[1040px] p-[clamp(0.65rem,3.4vw,2rem)]">
        <Outlet />
      </main>
    </PinGate>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <LevelsRoute />,
});

const LevelsRoute = () => {
  const progress = getLevelProgress();
  const isLevel3Unlocked = progress.connectionsSolved || hasLevelOverride(3);

  return (
    <section className="grid items-start gap-4 rounded-[clamp(22px,6vw,32px)] border border-[color-mix(in_oklch,var(--purple-7),transparent_42%)] bg-[color-mix(in_oklch,var(--card),transparent_8%)] p-[clamp(0.9rem,3.6vw,1.5rem)] shadow-[0_28px_90px_color-mix(in_oklch,var(--purple-11),transparent_86%)]">
      <div className="grid gap-2">
        <p className="m-0 mb-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--purple-11)]">Levels</p>
        <h1 className="m-0 max-w-[13ch] font-heading text-[clamp(1.85rem,8vw,3.5rem)] leading-[0.98] tracking-tight">
          Cherelynn & Kevin
        </h1>
        <p className="m-0 text-muted-foreground">Start with Wordle. Level 2 opens after you solve it.</p>
      </div>

      <div className="grid gap-3">
        <Link
          className="grid gap-2 rounded-[26px] border border-[color-mix(in_oklch,var(--purple-7),transparent_25%)] bg-[linear-gradient(145deg,color-mix(in_oklch,var(--purple-2),white_52%),var(--purple-3))] p-[clamp(1rem,4vw,1.35rem)] text-[var(--purple-12)] no-underline"
          to="/wordle"
        >
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--purple-11)]">Level 1</span>
          <span className="font-heading text-[clamp(2rem,11vw,3.4rem)] font-extrabold leading-[0.9]">Wordle</span>
          <span className="max-w-md leading-snug text-[var(--purple-11)]">Five letters, six tries, answer set to AROSE for now.</span>
          <span className={buttonVariants({ size: "sm" })}>{progress.wordleSolved ? "Replay" : "Play"}</span>
        </Link>

        <Link
          className={`grid gap-2 rounded-[26px] border border-[color-mix(in_oklch,var(--purple-7),transparent_25%)] bg-[linear-gradient(145deg,color-mix(in_oklch,var(--purple-2),white_52%),var(--purple-3))] p-[clamp(1rem,4vw,1.35rem)] text-[var(--purple-12)] no-underline ${progress.wordleSolved ? "" : "opacity-70"}`}
          to={progress.wordleSolved ? "/connections" : "/wordle"}
        >
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--purple-11)]">Level 2</span>
          <span className="font-heading text-[clamp(2rem,11vw,3.4rem)] font-extrabold leading-[0.9]">Connections</span>
          <span className="max-w-md leading-snug text-[var(--purple-11)]">
            {progress.wordleSolved ? "Unlocked. Waiting for the sixteen words." : "Locked until Level 1 is solved."}
          </span>
          <span className={buttonVariants({ size: "sm", variant: progress.wordleSolved ? "default" : "secondary" })}>
            {progress.wordleSolved ? "Open" : "Locked"}
          </span>
        </Link>

        <Link
          className={`grid gap-2 rounded-[26px] border border-[color-mix(in_oklch,var(--purple-7),transparent_25%)] bg-[linear-gradient(145deg,color-mix(in_oklch,var(--purple-2),white_52%),var(--purple-3))] p-[clamp(1rem,4vw,1.35rem)] text-[var(--purple-12)] no-underline ${isLevel3Unlocked ? "" : "opacity-70"}`}
          to={isLevel3Unlocked ? "/scrolls" : "/connections"}
          search={isLevel3Unlocked && hasLevelOverride(3) ? { level: "3" } : undefined}
        >
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--purple-11)]">Level 3</span>
          <span className="font-heading text-[clamp(2rem,11vw,3.4rem)] font-extrabold leading-[0.9]">Scrolls</span>
          <span className="max-w-md leading-snug text-[var(--purple-11)]">
            {isLevel3Unlocked ? "Unlocked. Seven mock scroll videos." : "Locked until Level 2 is solved."}
          </span>
          <span className={buttonVariants({ size: "sm", variant: isLevel3Unlocked ? "default" : "secondary" })}>
            {isLevel3Unlocked ? "Open" : "Locked"}
          </span>
        </Link>
      </div>
    </section>
  );
};

const todosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/todos",
  component: TodoRoute,
});

const wordleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wordle",
  component: WordleRoute,
});

const connectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/connections",
  component: ConnectionsRoute,
});

const scrollsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scrolls",
  component: ScrollsRoute,
});

export const routeTree = rootRoute.addChildren([indexRoute, todosRoute, wordleRoute, connectionsRoute, scrollsRoute]);
