import { Layer } from "effect";
import { TodoHttpHandlersLive } from "@/module/todo/todo.http.handlers.ts";
import { TodoRepository } from "@/module/todo/todo.repository.default.ts";
import { TodoService } from "@/module/todo/todo.service.default.ts";

const TodoServiceProvidedLive = TodoService.layer.pipe(Layer.provide(TodoRepository.layer));

export const TodoModuleLive = TodoHttpHandlersLive.pipe(Layer.provide(TodoServiceProvidedLive));
