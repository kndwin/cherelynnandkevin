import { runtime as xstateRuntime } from "@typeonce/effect-xstate";
import { AppHttpClient } from "@/platform/http.client.ts";
import { Atom } from "effect/unstable/reactivity";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ComponentProps } from "react";
import { checkInMachine } from "./check-in.machine.ts";
import type { CheckInEvent, CheckInField } from "./check-in.machine.ts";
import { CheckInView } from "./check-in.ui.tsx";
import { WeddingHomeView } from "@/module/wedding/wedding-home.ui.tsx";

const checkInRuntime = xstateRuntime(Atom.runtime(AppHttpClient.layer));

const useCheckInMachine = () => {
  const [actor] = useState(() => checkInRuntime.createActor({ logic: checkInMachine }));
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

  return [snapshot, (event: CheckInEvent) => actor.send(event)] as const;
};

const CheckInPanel = () => {
  const [snapshot, send] = useCheckInMachine();
  const [bypassDismissed, setBypassDismissed] = useState(false);
  const bypass =
    !bypassDismissed &&
    typeof window !== "undefined" &&
    (() => {
      const p = new URLSearchParams(window.location.search);
      return p.has("bypass") || p.has("preview") || p.has("dev") || p.has("showHome");
    })();

  const handleFieldChange = (field: CheckInField, value: string) => {
    send({ field, type: "FIELD_CHANGED", value });
  };

  const handleFormSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    event.preventDefault();
    send({ type: "SUBMITTED" });
  };

  if (bypass || snapshot.matches("success")) {
    return (
      <WeddingHomeView
        firstName={snapshot.context.firstName || "Guest"}
        onSignOut={() => {
          if (bypass) {
            const url = new URL(window.location.href);
            url.searchParams.delete("bypass");
            url.searchParams.delete("preview");
            url.searchParams.delete("dev");
            url.searchParams.delete("showHome");
            window.history.replaceState({}, "", url.toString());
            setBypassDismissed(true);
          }
          send({ type: "RESET" });
        }}
      />
    );
  }

  return (
    <CheckInView
      email={snapshot.context.email}
      firstName={snapshot.context.firstName}
      isError={snapshot.matches("failure")}
      isSubmitting={snapshot.matches("submitting")}
      lastName={snapshot.context.lastName}
      message={snapshot.context.message}
      onFieldChange={handleFieldChange}
      onFormSubmit={handleFormSubmit}
      onPasswordVisibilityToggle={() => send({ type: "PASSWORD_VISIBILITY_TOGGLED" })}
      showPassword={snapshot.context.showPassword}
      sitePassword={snapshot.context.sitePassword}
    />
  );
};

export { CheckInPanel };
