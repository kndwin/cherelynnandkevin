import { runtime as xstateRuntime } from "@typeonce/effect-xstate";
import { AppHttpClient } from "@/platform/http.client.ts";
import { Atom } from "effect/unstable/reactivity";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ComponentProps } from "react";
import { checkInMachine } from "./check-in.machine.ts";
import type { AttendingSelection, CheckInEvent, CheckInField } from "./check-in.machine.ts";
import {
  parseGuestNamesFromSearch,
  withGuestNamesInSearch,
  withoutGuestNamesFromSearch,
} from "./check-in.url.ts";
import { CheckInView, RsvpSectionView } from "./check-in.ui.tsx";
import { WeddingHomeView } from "@/module/wedding/wedding-home.ui.tsx";

const checkInRuntime = xstateRuntime(Atom.runtime(AppHttpClient.layer));

const readGuestNamesFromLocation = (): { readonly firstName: string; readonly lastName: string } => {
  if (typeof window === "undefined") {
    return { firstName: "", lastName: "" };
  }
  return parseGuestNamesFromSearch(window.location.search);
};

const useCheckInMachine = (initialNames: { readonly firstName: string; readonly lastName: string }) => {
  const [actor] = useState(() =>
    checkInRuntime.createActor({ logic: checkInMachine, options: { input: initialNames } }),
  );
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
  // URL guest names prefill only the login fields on fresh load/refresh.
  // Read once for actor input so later typing is never overwritten. The
  // guest must still enter the site password; nothing auto-authenticates.
  const [initialNames] = useState(readGuestNamesFromLocation);
  const [snapshot, send] = useCheckInMachine(initialNames);
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

  const handleAttendingChange = (value: AttendingSelection) => {
    send({ type: "ATTENDING_CHANGED", value });
  };

  const handleLoginSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    event.preventDefault();
    send({ type: "SUBMITTED" });
  };

  const handleRsvpSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    event.preventDefault();
    send({ type: "RSVP_SUBMITTED" });
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (bypass) {
        url.searchParams.delete("bypass");
        url.searchParams.delete("preview");
        url.searchParams.delete("dev");
        url.searchParams.delete("showHome");
      }
      // Sign-out removes only the guest name params and resets private
      // state; unrelated params are preserved.
      url.search = withoutGuestNamesFromSearch(url.search);
      window.history.replaceState({}, "", url.toString());
      if (bypass) {
        setBypassDismissed(true);
      }
    } else if (bypass) {
      setBypassDismissed(true);
    }
    send({ type: "RESET" });
  };

  const onAuthenticatedHomeStage =
    snapshot.matches("editingRsvp") ||
    snapshot.matches("submittingRsvp") ||
    snapshot.matches("rsvpFailure") ||
    snapshot.matches("success");

  // After successful authentication, synchronize the URL with the
  // authenticated names while preserving unrelated params. Names in the URL
  // are never authorization; the server already validated password +
  // allowlist before returning stored RSVP values.
  useEffect(() => {
    if (!onAuthenticatedHomeStage || bypass || typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    const nextSearch = withGuestNamesInSearch(
      url.search,
      snapshot.context.firstName,
      snapshot.context.lastName,
    );
    if (url.search !== nextSearch) {
      url.search = nextSearch;
      window.history.replaceState({}, "", url.toString());
    }
  }, [
    onAuthenticatedHomeStage,
    bypass,
    snapshot.context.firstName,
    snapshot.context.lastName,
  ]);

  // Bypass/preview has no authenticated identity, so no actionable RSVP form.
  if (bypass) {
    return <WeddingHomeView firstName="Guest" onSignOut={handleSignOut} />;
  }

  // Auth success immediately lands on the home page with the RSVP section
  // embedded at the bottom. The full page stays visible through
  // saving/error/success; values are preserved for retry and idempotent
  // resubmit.
  if (onAuthenticatedHomeStage) {
    return (
      <WeddingHomeView
        firstName={snapshot.context.firstName || "Guest"}
        onSignOut={handleSignOut}
        rsvpSection={
          <RsvpSectionView
            attending={snapshot.context.attending}
            email={snapshot.context.email}
            firstName={snapshot.context.firstName}
            isError={snapshot.matches("rsvpFailure")}
            isSubmitting={snapshot.matches("submittingRsvp")}
            message={snapshot.context.message}
            notes={snapshot.context.notes}
            onAttendingChange={handleAttendingChange}
            onFieldChange={handleFieldChange}
            onFormSubmit={handleRsvpSubmit}
          />
        }
      />
    );
  }

  return (
    <CheckInView
      firstName={snapshot.context.firstName}
      isError={snapshot.matches("loginFailure")}
      isSubmitting={snapshot.matches("authenticating")}
      lastName={snapshot.context.lastName}
      message={snapshot.context.message}
      onFieldChange={handleFieldChange}
      onFormSubmit={handleLoginSubmit}
      onPasswordVisibilityToggle={() => send({ type: "PASSWORD_VISIBILITY_TOGGLED" })}
      showPassword={snapshot.context.showPassword}
      sitePassword={snapshot.context.sitePassword}
    />
  );
};

export { CheckInPanel };
