import { fromEffect } from "@typeonce/effect-xstate";
import type { Todo } from "@cherelynnandkevin/client-api-contract/todo/http";
import { toErrorMessage } from "@/platform/error.ts";
import { Effect } from "effect";
import { assign, setup } from "xstate";
import { TodoClient } from "./todo.client.ts";

type Context = {
  readonly todos: readonly Todo[];
  readonly errorMessage: string | null;
  readonly pendingTitle: string;
  readonly pendingUpdate: { readonly id: string; readonly completed: boolean } | null;
  readonly pendingDeleteId: string | null;
};

type Events =
  | { readonly type: "load" }
  | { readonly type: "create"; readonly title: string }
  | { readonly type: "toggle"; readonly id: string; readonly completed: boolean }
  | { readonly type: "delete"; readonly id: string }
  | { readonly type: "retry" };

export const todoMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Events,
  },
  actors: {
    listTodos: fromEffect({
      effect: () =>
        Effect.gen(function* () {
          const client = yield* TodoClient;

          return yield* client.list();
        }),
    }),
    createTodo: fromEffect({
      effect: ({ input }: { readonly input: { readonly title: string } }) =>
        Effect.gen(function* () {
          const client = yield* TodoClient;

          return yield* client.create({ title: input.title });
        }),
    }),
    updateTodo: fromEffect({
      effect: ({ input }: { readonly input: { readonly id: string; readonly completed: boolean } }) =>
        Effect.gen(function* () {
          const client = yield* TodoClient;

          return yield* client.update(input.id, { completed: input.completed });
        }),
    }),
    deleteTodo: fromEffect({
      effect: ({ input }: { readonly input: { readonly id: string } }) =>
        Effect.gen(function* () {
          const client = yield* TodoClient;

          return yield* client.delete(input.id);
        }),
    }),
  },
  actions: {
    recordError: assign((_, params: { readonly message: unknown }) => ({
      errorMessage: toErrorMessage(params.message),
    })),
  },
}).createMachine({
  id: "Todo Module",
  context: {
    todos: [],
    errorMessage: null,
    pendingTitle: "",
    pendingUpdate: null,
    pendingDeleteId: null,
  },
  initial: "Loading",
  states: {
    Loading: {
      after: {
        10000: {
          target: "Error",
          actions: assign(() => ({
            errorMessage: "Timed out loading todos. Check the API process and try again.",
          })),
        },
      },
      invoke: {
        src: "listTodos",
        onDone: {
          target: "Ready",
          actions: assign(({ event }) => ({
            todos: event.output,
            errorMessage: null,
          })),
        },
        onError: {
          target: "Error",
          actions: {
            type: "recordError",
            params: ({ event }) => ({ message: event.error }),
          },
        },
      },
    },
    Ready: {
      on: {
        load: {
          target: "Loading",
        },
        create: {
          target: "Creating",
          actions: assign(({ event }) => ({ pendingTitle: event.title })),
        },
        toggle: {
          target: "Updating",
          actions: assign(({ event }) => ({
            pendingUpdate: { id: event.id, completed: event.completed },
          })),
        },
        delete: {
          target: "Deleting",
          actions: assign(({ event }) => ({ pendingDeleteId: event.id })),
        },
      },
    },
    Creating: {
      invoke: {
        src: "createTodo",
        input: ({ context }) => ({ title: context.pendingTitle }),
        onDone: {
          target: "Ready",
          actions: assign(({ context, event }) => ({
            todos: [event.output, ...context.todos],
            pendingTitle: "",
            errorMessage: null,
          })),
        },
        onError: {
          target: "Error",
          actions: {
            type: "recordError",
            params: ({ event }) => ({ message: event.error }),
          },
        },
      },
    },
    Updating: {
      invoke: {
        src: "updateTodo",
        input: ({ context }) => context.pendingUpdate ?? { id: "", completed: false },
        onDone: {
          target: "Ready",
          actions: assign(({ context, event }) => ({
            todos: context.todos.map((todo) => (todo.id === event.output.id ? event.output : todo)),
            pendingUpdate: null,
            errorMessage: null,
          })),
        },
        onError: {
          target: "Error",
          actions: {
            type: "recordError",
            params: ({ event }) => ({ message: event.error }),
          },
        },
      },
    },
    Deleting: {
      invoke: {
        src: "deleteTodo",
        input: ({ context }) => ({ id: context.pendingDeleteId ?? "" }),
        onDone: {
          target: "Ready",
          actions: assign(({ context, event }) => ({
            todos: context.todos.filter((todo) => todo.id !== event.output.id),
            pendingDeleteId: null,
            errorMessage: null,
          })),
        },
        onError: {
          target: "Error",
          actions: {
            type: "recordError",
            params: ({ event }) => ({ message: event.error }),
          },
        },
      },
    },
    Error: {
      on: {
        retry: {
          target: "Loading",
        },
      },
    },
  },
});
