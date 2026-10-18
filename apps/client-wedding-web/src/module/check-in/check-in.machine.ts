import { fromEffect } from "@typeonce/effect-xstate";
import { toErrorMessage } from "@/platform/error.ts";
import { AppHttpClient } from "@/platform/http.client.ts";
import { Effect } from "effect";
import { assign, setup } from "xstate";

const GuestListNotFoundMessage =
  "We couldn't find that name on the guest list.";
const SitePasswordMismatchMessage =
  "That site password didn't match. Please try again.";
const GenericLoginFailureMessage = "We could not log you in. Please try again.";
const GenericRsvpFailureMessage =
  "We could not save your RSVP yet. Please try again.";

const matchesHttpError = (
  error: unknown,
  tag: string,
  status: number,
  seen: Set<object> = new Set(),
): boolean => {
  if (typeof error === "string") {
    return (
      error.includes(String(status)) ||
      error.toLowerCase().includes(tag.toLowerCase())
    );
  }
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if (seen.has(error)) {
    return false;
  }
  seen.add(error);

  const record = error as Record<string, unknown>;
  if (record._tag === tag) {
    return true;
  }
  if (record.status === status || record.httpApiStatus === status) {
    return true;
  }
  if (
    typeof record.message === "string" &&
    (record.message.includes(String(status)) ||
      record.message.toLowerCase().includes(tag.toLowerCase()))
  ) {
    return true;
  }

  return ["cause", "error", "errors"].some((key) => {
    const nested = record[key];
    return Array.isArray(nested)
      ? nested.some((entry) => matchesHttpError(entry, tag, status, seen))
      : matchesHttpError(nested, tag, status, seen);
  });
};

const isForbiddenError = (error: unknown): boolean =>
  matchesHttpError(error, "Forbidden", 403);

const isUnauthorizedError = (error: unknown): boolean =>
  matchesHttpError(error, "Unauthorized", 401);

type AttendingSelection = "" | "Yes" | "No";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;
const NOTES_MAX_LENGTH = 1000;

const isValidRsvpEmail = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    trimmed.length >= 1 &&
    trimmed.length <= EMAIL_MAX_LENGTH &&
    EMAIL_PATTERN.test(trimmed)
  );
};

const isValidRsvpNotes = (value: string): boolean =>
  value.trim().length <= NOTES_MAX_LENGTH;

interface CheckInContext {
  readonly stale: boolean;
  readonly rsvpRevision: number | undefined;
  readonly attending: AttendingSelection;
  readonly email: string;
  readonly errorMessage: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly message: string | null;
  readonly notes: string;
  readonly dietaryRequirements: string;
  readonly showPassword: boolean;
  readonly sitePassword: string;
}

type CheckInField =
  | "firstName"
  | "lastName"
  | "sitePassword"
  | "email"
  | "notes"
  | "dietaryRequirements";

type CheckInEvent =
  | {
      readonly field: CheckInField;
      readonly type: "FIELD_CHANGED";
      readonly value: string;
    }
  | { readonly type: "ATTENDING_CHANGED"; readonly value: AttendingSelection }
  | { readonly type: "PASSWORD_VISIBILITY_TOGGLED" }
  | { readonly type: "SUBMITTED" }
  | { readonly type: "RSVP_SUBMITTED" }
  | { readonly type: "RESET" };

interface CheckInMachineInput {
  readonly firstName?: string;
  readonly lastName?: string;
}

const checkInMachineInitialContext: CheckInContext = {
  stale: false,
  rsvpRevision: undefined,
  attending: "",
  email: "",
  errorMessage: null,
  firstName: "",
  lastName: "",
  message: null,
  notes: "",
  dietaryRequirements: "",
  showPassword: false,
  sitePassword: "",
};

const checkInMachine = setup({
  types: {
    context: {} as CheckInContext,
    events: {} as CheckInEvent,
    input: {} as CheckInMachineInput,
  },
  actors: {
    authenticateRsvp: fromEffect({
      effect: ({ input }: { readonly input: CheckInContext }) =>
        Effect.gen(function* () {
          const client = yield* AppHttpClient;

          return yield* client.checkIn.authenticate({
            payload: {
              firstName: input.firstName,
              lastName: input.lastName,
            },
          });
        }),
    }),
    respondRsvp: fromEffect({
      effect: ({ input }: { readonly input: CheckInContext }) =>
        Effect.gen(function* () {
          const client = yield* AppHttpClient;

          if (input.attending !== "Yes" && input.attending !== "No") {
            return yield* Effect.fail(
              new Error("Select whether you are attending."),
            );
          }
          if (input.rsvpRevision === undefined) {
            return yield* Effect.fail(
              new Error(
                "Reload the page and sign in again before saving your RSVP.",
              ),
            );
          }

          const email = input.email.trim();
          const notes = input.notes.trim();
          const dietaryRequirements = input.dietaryRequirements.trim();
          if (dietaryRequirements.length > NOTES_MAX_LENGTH) {
            return yield* Effect.fail(
              new Error(
                "Dietary requirements must be 1000 characters or fewer.",
              ),
            );
          }
          if (!isValidRsvpEmail(email)) {
            return yield* Effect.fail(
              new Error("Enter a valid email address."),
            );
          }
          if (!isValidRsvpNotes(input.notes)) {
            return yield* Effect.fail(
              new Error("Notes must be 1000 characters or fewer."),
            );
          }

          return yield* client.checkIn.respond({
            payload: {
              attending: input.attending,
              expectedRevision: input.rsvpRevision,
              email,
              firstName: input.firstName,
              lastName: input.lastName,
              notes,
              dietaryRequirements,
            },
          });
        }),
    }),
  },
  actions: {
    assignField: assign(({ context, event }) => {
      if (event.type !== "FIELD_CHANGED") {
        return context;
      }

      return {
        ...context,
        [event.field]: event.value,
        errorMessage: null,
        message: context.stale ? context.message : null,
      };
    }),
    assignAttending: assign(({ context, event }) => {
      if (event.type !== "ATTENDING_CHANGED") {
        return context;
      }

      return {
        ...context,
        attending: event.value,
        errorMessage: null,
        message: context.stale ? context.message : null,
      };
    }),
    recordLoginError: assign((_, params: { readonly error: unknown }) => ({
      errorMessage: toErrorMessage(params.error),
      message: isForbiddenError(params.error)
        ? GuestListNotFoundMessage
        : isUnauthorizedError(params.error)
          ? SitePasswordMismatchMessage
          : GenericLoginFailureMessage,
    })),
    recordRsvpError: assign(
      ({ context }, params: { readonly error: unknown }) => ({
        stale:
          context.rsvpRevision === undefined ||
          matchesHttpError(params.error, "Conflict", 409),
        errorMessage: toErrorMessage(params.error),
        message:
          context.rsvpRevision === undefined
            ? "Reload the page and sign in again before saving your RSVP. Your edits have not been saved."
            : matchesHttpError(params.error, "Conflict", 409)
              ? "This RSVP changed since you loaded it. Reload the page and sign in again before saving. Your edits have not been saved."
              : isForbiddenError(params.error)
                ? GuestListNotFoundMessage
                : isUnauthorizedError(params.error)
                  ? SitePasswordMismatchMessage
                  : GenericRsvpFailureMessage,
      }),
    ),
  },
}).createMachine({
  context: ({ input }) => ({
    ...checkInMachineInitialContext,
    firstName: input?.firstName ?? checkInMachineInitialContext.firstName,
    lastName: input?.lastName ?? checkInMachineInitialContext.lastName,
  }),
  id: "Wedding RSVP",
  initial: "editingLogin",
  on: {
    FIELD_CHANGED: {
      actions: "assignField",
    },
    ATTENDING_CHANGED: {
      actions: "assignAttending",
    },
    PASSWORD_VISIBILITY_TOGGLED: {
      actions: assign(({ context }) => ({
        showPassword: !context.showPassword,
      })),
    },
    RESET: {
      actions: assign(() => ({
        attending: "" as AttendingSelection,
        rsvpRevision: undefined,
        stale: false,
        email: "",
        errorMessage: null,
        firstName: "",
        lastName: "",
        message: null,
        notes: "",
        dietaryRequirements: "",
        showPassword: false,
        sitePassword: "",
      })),
      target: ".editingLogin",
    },
  },
  states: {
    editingLogin: {
      on: {
        SUBMITTED: {
          target: "authenticating",
        },
      },
    },
    authenticating: {
      invoke: {
        input: ({ context }) => context,
        onDone: {
          actions: assign(({ event }) => ({
            attending: event.output.attending,
            rsvpRevision: event.output.rsvpRevision,
            email: event.output.email,
            errorMessage: null,
            firstName: event.output.firstName,
            lastName: event.output.lastName,
            message: null,
            notes: event.output.notes,
            dietaryRequirements: event.output.dietaryRequirements ?? "",
          })),
          target: "editingRsvp",
        },
        onError: {
          actions: {
            params: ({ event }) => ({ error: event.error }),
            type: "recordLoginError",
          },
          target: "loginFailure",
        },
        src: "authenticateRsvp",
      },
    },
    loginFailure: {
      on: {
        SUBMITTED: {
          target: "authenticating",
        },
      },
    },
    editingRsvp: {
      on: {
        RSVP_SUBMITTED: {
          guard: ({ context }) =>
            (context.attending === "Yes" || context.attending === "No") &&
            isValidRsvpEmail(context.email) &&
            isValidRsvpNotes(context.notes),
          target: "submittingRsvp",
        },
      },
    },
    submittingRsvp: {
      invoke: {
        input: ({ context }) => context,
        onDone: {
          actions: assign(({ event }) => ({
            errorMessage: null,
            message: `Thanks, ${event.output.firstName}. Your RSVP is saved.`,
            rsvpRevision: event.output.rsvpRevision,
          })),
          target: "success",
        },
        onError: {
          actions: {
            params: ({ event }) => ({ error: event.error }),
            type: "recordRsvpError",
          },
          target: "rsvpFailure",
        },
        src: "respondRsvp",
      },
    },
    rsvpFailure: {
      on: {
        RSVP_SUBMITTED: {
          guard: ({ context }) =>
            !context.stale &&
            (context.attending === "Yes" || context.attending === "No") &&
            isValidRsvpEmail(context.email) &&
            isValidRsvpNotes(context.notes),
          target: "submittingRsvp",
        },
      },
    },
    success: {
      on: {
        RSVP_SUBMITTED: {
          guard: ({ context }) =>
            (context.attending === "Yes" || context.attending === "No") &&
            isValidRsvpEmail(context.email) &&
            isValidRsvpNotes(context.notes),
          target: "submittingRsvp",
        },
      },
    },
  },
});

export {
  checkInMachine,
  isValidRsvpEmail,
  isValidRsvpNotes,
  EMAIL_MAX_LENGTH,
  NOTES_MAX_LENGTH,
};
export type {
  AttendingSelection,
  CheckInContext,
  CheckInEvent,
  CheckInField,
  CheckInMachineInput,
};
