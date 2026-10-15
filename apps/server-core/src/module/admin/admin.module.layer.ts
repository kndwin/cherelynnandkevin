import { Layer } from "effect";
import { AdminHttpRoutesLive } from "@/module/admin/admin.http.routes.ts";
import { GuestRepository } from "@/module/check-in/guest.repository.default.ts";
import { OperationsRepository } from "./operations.repository.ts";
import { SheetsSyncLive } from "@/module/sync/sync.service.ts";

export const AdminModuleLive = AdminHttpRoutesLive.pipe(Layer.provide(Layer.mergeAll(GuestRepository.layer, OperationsRepository.layer, SheetsSyncLive)));
