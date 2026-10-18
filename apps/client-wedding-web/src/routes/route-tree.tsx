import { Outlet, createRootRoute, createRoute, redirect } from "@tanstack/react-router";
import { CheckInPanel, WeddingHomePanel } from "@/module/check-in/check-in.panel.tsx";
import { GamesPanel } from "@/module/games/games.panel.tsx";
import { AdminLayout } from "@/module/admin/admin.layout.tsx";
import { AdminPanel } from "@/module/admin/admin.panel.tsx";
import { AdminOperations } from "@/module/admin/admin.operations.tsx";
import { AdminSyncs } from "@/module/admin/admin.syncs.tsx";

const root = createRootRoute({ component: Outlet });
const wedding = createRoute({ getParentRoute: () => root, id: "wedding", component: CheckInPanel });
const home = createRoute({ getParentRoute: () => wedding, path: "/", component: WeddingHomePanel });
const wordle = createRoute({ getParentRoute: () => wedding, path: "games/wordle", component: GamesPanel });
const connections = createRoute({ getParentRoute: () => wedding, path: "games/connections", component: GamesPanel });
const admin = createRoute({ getParentRoute: () => root, path: "admin", component: AdminLayout });
const adminIndex = createRoute({ getParentRoute: () => admin, path: "/", beforeLoad: () => { throw redirect({ to: "/admin/guests" }); } });
const guests = createRoute({ getParentRoute: () => admin, path: "guests", component: AdminPanel });
const operations = createRoute({ getParentRoute: () => admin, path: "operations", component: AdminOperations });
const syncs = createRoute({ getParentRoute: () => admin, path: "syncs", component: AdminSyncs });

export const routeTree = root.addChildren([wedding.addChildren([home, wordle, connections]), admin.addChildren([adminIndex, guests, operations, syncs])]);
