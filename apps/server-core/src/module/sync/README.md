# Website Guests export

Configure `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (PKCS8 PEM; literal
`\n` escapes accepted), and `GOOGLE_SHEETS_SPREADSHEET_ID` on the **server**.
Share the spreadsheet with the service account as an editor. Missing any value
disables export while the server starts normally; manual requests return 503.
No secrets are returned by status APIs or written to run history.

Only the dedicated **Website Guests** worksheet is application-owned. A snapshot
contains all guest fields, group id/name, revision and timestamps. The writer uses
one Sheets `batchUpdate` with `UpdateCells` over the entire owned grid: missing
tail rows/columns are cleared atomically with replacement. `stringValue` writes
literal RAW text (including `=` prefixes), never formulas. No other worksheet is
cleared, renamed or modified. External validation remains necessary against a
real shared spreadsheet; automated tests use mocked HTTP only.

The workflow is registered with Effect `Workflow.make` and `Activity.make`, backed
by `SingleRunner` with **SQL runner storage** and `ClusterWorkflowEngine`. Cluster
tables are initialized by Effect SQL storage; application tables are migration
`0006_sheets_sync.sql`. The replace activity acquires serialization and lease
ownership **before reading a fresh database snapshot**. Unfinished activity replay
does not reuse a cached pre-restart snapshot. A committed run with a missing
activity reply is recognized on replay and is not written again.

Cron is `0 * * * *` in `Australia/Sydney`. A persisted scheduling watermark
coalesces arbitrarily many missed hours into one latest-hour catch-up. A ten-second
reconciler recovers persisted queued/running dispatches and scheduling deferred
by overlap. History returns the newest 50 entries; older runs remain stored.

The database singleton reserves one run across manual and scheduled triggers.
Writer ownership has a 120-second lease, renewed every 20 seconds, plus an advisory
transaction lock `(172927, 1)` on a dedicated `PgClient.reserve` connection held
through fresh snapshot, HTTP write and run finalization. A paused writer whose
PostgreSQL connection remains live still holds the lock even after lease expiry,
so recovery cannot write concurrently. The dedicated lock transaction contains no
run row mutations; live run status remains visible on separate connections. HTTP
is abortable and capped at 60 seconds. Restart recovery waits for lease expiry;
idempotent activity replay may repeat a batch whose acknowledgement was lost.
Revision/audit changes happen only when RSVP values actually change.

**Deployment assumption:** one server node/SingleRunner, one shard group/shard.
Do not horizontally scale this runner without reviewing stable runner identities,
cluster assignment and external fencing. If the advisory-lock connection is
lost, PostgreSQL releases serialization but Google may still complete an already
sent request despite local abort. Google does not support our database fencing
token, so lost-connection/remote-completion uncertainty remains. This is **not an
exactly-once external-write guarantee**, including in the single-node deployment.

Local verification must use the disposable test runner, **not an existing local
application database**. From the repository root, with local Docker PostgreSQL up:

```sh
SAO_ALLOW_TESTS=1 \
TEST_DATABASE_ADMIN_URL="$(bun infra/docker/print-database-url.mjs | cut -d= -f2-)" \
  pnpm --filter @cherelynnandkevin/server-core test:disposable
```

The runner verifies localhost, creates its own unique `cak_test_<32 hex>` database,
migrates/seeds it, runs the full backend suite with `SAO_ALLOW_TESTS=1` and
`SAO_DISPOSABLE_DB=1`, then drops **only that invocation's database** in `finally`.
All database test guards require this naming pattern and both flags. Cluster and
singleton scheduling state is never reset in a user database. Sync tests rebuild
the SQL engine and simulate lease expiry rather than waiting 120 seconds; they
assert a guest edited during downtime is freshly exported after recovery. No
production database or real Google API is used in tests.
