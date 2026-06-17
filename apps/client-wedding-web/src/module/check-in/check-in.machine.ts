import { fromEffect } from "@typeonce/effect-xstate";
import { toErrorMessage } from "@/platform/error.ts";
import { AppHttpClient } from "@/platform/http.client.ts";
import { Effect } from "effect";
import { assign, setup } from "xstate";

interface CheckInContext {
  readonly email: string;
  readonly errorMessage: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly message: string | null;
  readonly showPassword: boolean;
  readonly sitePassword: string;
}

type CheckInField = "email" | "firstName" | "lastName" | "sitePassword";

type CheckInEvent =
  | { readonly field: CheckInField; readonly type: "FIELD_CHANGED"; readonly value: string }
  | { readonly type: "PASSWORD_VISIBILITY_TOGGLED" }
  | { readonly type: "SUBMITTED" }
  | { readonly type: "RESET" };

const checkInMachine = setup({
  types: {
    context: {} as CheckInContext,
    events: {} as CheckInEvent,
  },
  actors: {
    createCheckIn: fromEffect({
      effect: ({ input }: { readonly input: CheckInContext }) =>
        Effect.gen(function* () {
          const client = yield* AppHttpClient;

          return yield* client.checkIn.create({
            payload: {
              email: input.email,
              firstName: input.firstName,
              lastName: input.lastName,
              sitePassword: input.sitePassword,
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
        message: null,
      };
    }),
    recordError: assign((_, params: { readonly error: unknown }) => ({
      errorMessage: toErrorMessage(params.error),
      message: "We could not check you in yet. Please try again.",
    })),
  },
}).createMachine({
  context: {
    email: "",
    errorMessage: null,
    firstName: "",
    lastName: "",
    message: null,
    showPassword: false,
    sitePassword: "",
  },
  id: "Wedding Check-In",
  initial: "editing",
  on: {
    FIELD_CHANGED: {
      actions: "assignField",
    },
    PASSWORD_VISIBILITY_TOGGLED: {
      actions: assign(({ context }) => ({ showPassword: !context.showPassword })),
    },
    RESET: {
      actions: assign(() => ({
        email: "",
        errorMessage: null,
        firstName: "",
        lastName: "",
        message: null,
        showPassword: false,
        sitePassword: "",
      })),
      target: ".editing",
    },
  },
  states: {
    editing: {
      on: {
        SUBMITTED: {
          target: "submitting",
        },
      },
    },
    failure: {
      on: {
        SUBMITTED: {
          target: "submitting",
        },
      },
    },
    submitting: {
      invoke: {
        input: ({ context }) => context,
        onDone: {
          actions: assign(({ event }) => ({
            errorMessage: null,
            message: `Welcome, ${event.output.firstName}. Your check-in is saved.`,
          })),
          target: "success",
        },
        onError: {
          actions: {
            params: ({ event }) => ({ error: event.error }),
            type: "recordError",
          },
          target: "failure",
        },
        src: "createCheckIn",
      },
    },
    success: {},
  },
});

export { checkInMachine };
export type { CheckInContext, CheckInEvent, CheckInField };
