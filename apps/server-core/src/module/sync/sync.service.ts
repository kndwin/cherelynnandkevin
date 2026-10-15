import { Context, Cron, Effect, Layer, Schedule } from "effect";
import * as ClusterWorkflowEngine from "effect/unstable/cluster/ClusterWorkflowEngine";
import * as SingleRunner from "effect/unstable/cluster/SingleRunner";
import * as WorkflowEngine from "effect/unstable/workflow/WorkflowEngine";
import { SheetsSyncConfig } from "./sync.config.ts";
import { SheetsWriter } from "./sheets.writer.ts";
import { SyncBusyError, SyncNotConfiguredError, SyncRepository } from "./sync.repository.ts";
import { SheetsSyncWorkflow, SheetsSyncWorkflowLive } from "./sync.workflow.ts";

export const HourlySydney = Cron.parseUnsafe("0 * * * *", "Australia/Sydney");
export const latestDueHour = (now: Date) => Cron.prev(HourlySydney, new Date(now.getTime() + 1));

export class SheetsSyncService extends Context.Service<SheetsSyncService>()("SheetsSyncService", {
  make: Effect.gen(function* () {
    const config = yield* SheetsSyncConfig;
    const repository = yield* SyncRepository;
    const engine = yield* WorkflowEngine.WorkflowEngine;
    const dispatch = (runId: string) => SheetsSyncWorkflow.execute({ runId }, { discard: true }).pipe(Effect.provideService(WorkflowEngine.WorkflowEngine, engine), Effect.asVoid);
    const tick = (now = new Date()) => Effect.gen(function* () {
      if (!config.configured) return;
      // Dispatch persisted active/queued work before checking the watermark.
      const active = yield* repository.active();
      if (active) { yield* dispatch(active.id); return; }
      const run = yield* repository.reserve("scheduled", latestDueHour(now)).pipe(
        Effect.catchTag("SyncBusyError", () => Effect.succeed(null)),
      );
      if (run) yield* dispatch(run.id);
    });
    const safeTick = () => tick().pipe(Effect.catchCause(() => Effect.void));
    yield* safeTick();
    // Cron handles the exact hourly boundary and Sydney DST. Reconciliation
    // recovers dispatch/lease failures and deferred overlap; watermark prevents duplicates.
    yield* safeTick().pipe(Effect.repeat(Schedule.cron(HourlySydney)), Effect.forkScoped);
    yield* safeTick().pipe(Effect.repeat(Schedule.spaced("10 seconds")), Effect.forkScoped);
    return {
      tick,
      trigger: () => Effect.gen(function* () {
        if (!config.configured) return yield* new SyncNotConfiguredError({});
        const run = yield* repository.reserve("manual");
        if (!run) return yield* new SyncBusyError({});
        yield* dispatch(run.id);
        return run;
      }),
      status: () => Effect.gen(function* () {
        const history = yield* repository.history();
        const activeRun = yield* repository.active();
        return { configured: config.configured, configurationStatus: config.configured ? "configured" as const : "not-configured" as const,
          activeRun, latestRun: history[0] ?? null, nextScheduledAt: Cron.next(HourlySydney).toISOString(), history };
      }),
    };
  }),
}) {
  static readonly layer = Layer.effect(SheetsSyncService)(SheetsSyncService.make);
}

// Both cluster messages and runner coordination use SQL. No memory fallback.
export const DurableSyncEngineLive = ClusterWorkflowEngine.layer.pipe(Layer.provideMerge(SingleRunner.layer({ runnerStorage: "sql", shardingConfig: {
  shardsPerGroup: 1, entityMessagePollInterval: "1 second", entityReplyPollInterval: "1 second", refreshAssignmentsInterval: "1 second",
} })));
const Dependencies = Layer.mergeAll(SyncRepository.layer, SheetsSyncConfig.layer, SheetsWriter.layer.pipe(Layer.provide(SheetsSyncConfig.layer)));
const ConfiguredSyncLive = SheetsSyncService.layer.pipe(
  Layer.provide(SheetsSyncWorkflowLive.pipe(Layer.provide(Dependencies))),
  Layer.provide(Dependencies),
  Layer.provide(DurableSyncEngineLive),
);

export const SheetsSyncLive = Layer.unwrap(Effect.gen(function* () {
  const config = yield* SheetsSyncConfig;
  if (config.configured) return ConfiguredSyncLive;
  // Disabled integrations do not initialize cluster infrastructure or launch
  // jobs. History remains available; no in-memory workflow engine is supplied.
  return Layer.effect(SheetsSyncService, Effect.gen(function* () {
    const repository = yield* SyncRepository;
    return {
      tick: (_now?: Date) => Effect.void,
      trigger: () => Effect.fail(new SyncNotConfiguredError({})),
      status: () => Effect.gen(function* () {
        const history = yield* repository.history();
        return { configured: false, configurationStatus: "not-configured" as const,
          activeRun: yield* repository.active(), latestRun: history[0] ?? null,
          nextScheduledAt: Cron.next(HourlySydney).toISOString(), history };
      }),
    };
  })).pipe(Layer.provide(SyncRepository.layer));
})).pipe(Layer.provide(SheetsSyncConfig.layer));
