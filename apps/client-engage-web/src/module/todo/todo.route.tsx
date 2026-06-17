import { runtime as xstateRuntime } from "@typeonce/effect-xstate";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Atom } from "effect/unstable/reactivity";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TodoClient } from "./todo.client.ts";
import { todoMachine } from "./todo.machine.ts";

const todoRuntime = xstateRuntime(Atom.runtime(TodoClient.layer));

const useTodoMachine = () => {
  const [actor] = useState(() => todoRuntime.createActor({ logic: todoMachine }));
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    actor.start();

    return () => {
      stopTimerRef.current = setTimeout(() => {
        actor.stop();
      }, 0);
    };
  }, [actor]);

  const snapshot = useSyncExternalStore(
    (notify) => {
      const subscription = actor.subscribe(notify);

      return () => subscription.unsubscribe();
    },
    () => actor.getSnapshot(),
    () => actor.getSnapshot(),
  );

  return [snapshot, (event: Parameters<typeof actor.send>[0]) => actor.send(event)] as const;
};

export const TodoRoute = () => {
  const [snapshot, send] = useTodoMachine();
  const [title, setTitle] = useState("");
  const previousValueRef = useRef(snapshot.value);
  const isLoading = snapshot.matches("Loading");
  const isBusy = isLoading || snapshot.matches("Creating") || snapshot.matches("Updating") || snapshot.matches("Deleting");

  useEffect(() => {
    if (previousValueRef.current === "Creating" && snapshot.matches("Ready")) {
      setTitle("");
    }

    previousValueRef.current = snapshot.value;
  }, [snapshot]);

  return (
    <section className="grid gap-4 rounded-[clamp(22px,6vw,32px)] border border-[color-mix(in_oklch,var(--purple-7),transparent_42%)] bg-[color-mix(in_oklch,var(--card),transparent_8%)] p-[clamp(0.9rem,3.6vw,1.5rem)] shadow-[0_28px_90px_color-mix(in_oklch,var(--purple-11),transparent_86%)]">
      <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
        <div>
          <p className="m-0 mb-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--purple-11)]">Module consumer</p>
          <h2 className="m-0 font-heading text-[clamp(2rem,8vw,3.5rem)] leading-none tracking-tight">Todos</h2>
        </div>
        <Button type="button" variant="secondary" onClick={() => send({ type: "load" })} disabled={isBusy}>
          Refresh
        </Button>
      </div>

      <form
        className="my-4 flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch"
        onSubmit={(event) => {
          event.preventDefault();
          const nextTitle = title.trim();

          if (nextTitle.length === 0) {
            return;
          }

          send({ type: "create", title: nextTitle });
          setTitle("");
        }}
      >
        <Input
          aria-label="Todo title"
          className="h-11 flex-1 rounded-full bg-card px-4"
          placeholder="Add a todo"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          disabled={isBusy}
        />
        <Button type="submit" size="lg" disabled={isBusy || title.trim().length === 0}>
          Add
        </Button>
      </form>

      {snapshot.matches("Loading") ? <p className="text-muted-foreground">Loading todos...</p> : null}

      {snapshot.matches("Error") ? (
        <div className="mb-4 rounded-[20px] border border-[color-mix(in_oklch,var(--destructive),white_55%)] bg-[color-mix(in_oklch,var(--destructive),white_88%)] p-4" role="alert">
          <p>{snapshot.context.errorMessage ?? "Something went wrong"}</p>
          <Button type="button" variant="destructive" onClick={() => send({ type: "retry" })}>
            Retry
          </Button>
        </div>
      ) : null}

      {snapshot.matches("Ready") && snapshot.context.todos.length === 0 ? (
        <p className="text-muted-foreground">No todos yet. Add one above.</p>
      ) : null}

      <ul className="grid list-none gap-3 p-0">
        {snapshot.context.todos.map((todo) => (
          <li
            className="flex items-center justify-between gap-4 rounded-[20px] border border-[color-mix(in_oklch,var(--purple-6),transparent_36%)] bg-[color-mix(in_oklch,var(--purple-2),white_42%)] p-3 max-sm:flex-col max-sm:items-stretch"
            key={todo.id}
          >
            <label className="flex items-center gap-3">
              <input
                className="size-4 accent-[var(--purple-9)]"
                type="checkbox"
                checked={todo.completed}
                disabled={isBusy}
                onChange={(event) =>
                  send({ type: "toggle", id: todo.id, completed: event.currentTarget.checked })
                }
              />
              <span className={todo.completed ? "text-[var(--purple-10)] line-through" : undefined}>{todo.title}</span>
            </label>
            <Button type="button" variant="ghost" disabled={isBusy} onClick={() => send({ type: "delete", id: todo.id })}>
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
};
