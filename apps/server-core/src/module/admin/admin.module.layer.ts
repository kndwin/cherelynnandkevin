import { Layer } from "effect";
import { AdminHttpRoutesLive } from "@/module/admin/admin.http.routes.ts";
import { GuestRepository } from "@/module/check-in/guest.repository.default.ts";

export const AdminModuleLive = AdminHttpRoutesLive.pipe(Layer.provide(GuestRepository.layer));
