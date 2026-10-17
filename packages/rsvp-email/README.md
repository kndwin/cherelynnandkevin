# RSVP confirmations — delivery disabled by default

From the repository root:

```sh
pnpm --filter @cherelynnandkevin/rsvp-email dev
pnpm --filter @cherelynnandkevin/rsvp-email check
pnpm --filter @cherelynnandkevin/rsvp-email test
```

The local React Email preview is at http://localhost:3004 and includes attending
fixtures with fictional data. `renderConfirmation` accepts attending Yes only and returns subject,
HTML and plain text. User content is rendered as escaped React text, never HTML.

Public self-save with saved attending Yes writes an immutable snapshot to `rsvp_email_drafts` in the same
database transaction as the RSVP. Private notes are excluded. A unique
guest/revision/kind key prevents repeated unchanged saves creating another draft.
An outbox storage failure fails the save and rolls back the RSVP and audit entry;
there is no successful attending Yes self-save without its corresponding draft.
Attending No saves persist normally without creating a draft. Related-guest and
admin saves do not create drafts. Existing historical drafts are not deleted.

With `RSVP_EMAIL_ENABLED=false` (the default), rows are `draft_disabled` and no
dispatcher runs. Rendering alone never sends email. Historical disabled rows
are never promoted, even on unchanged saves after enabling delivery.
Snapshots intentionally survive guest deletion and contain personal data, so
retention/deletion policy must be resolved before operational delivery rollout.

## Backend configuration (server-only)

### One-off real template test (interactive Bun command)

This bypasses the database and dispatcher, regardless of `RSVP_EMAIL_ENABLED`.
It renders the actual `renderConfirmation` HTML and text with explicitly synthetic
guest and dietary details, then makes at most one direct Cloudflare REST request.
It does **not** create or change an RSVP. Use only an authorized test recipient.
Cloudflare email-send entitlement, a verified sender and an account email-send
token are required. No dependency or server startup is needed.

From the repository root in **zsh**, enter the token using a hidden read (the
token itself is not entered as a shell command or stored in command history):

```zsh
read -rs 'CLOUDFLARE_EMAIL_API_TOKEN?Cloudflare email API token (hidden): '; printf '\n'
export CLOUDFLARE_EMAIL_API_TOKEN
pnpm --filter @cherelynnandkevin/rsvp-email test:send
unset CLOUDFLARE_EMAIL_API_TOKEN
```

Do not paste credentials into arguments, source files, shell commands or logs.
Run the `unset` even if you cancel or the command fails. The token is environment-only;
the script never asks for it in an echoed prompt. It prompts for missing
`CLOUDFLARE_ACCOUNT_ID`, `RSVP_EMAIL_FROM` (verified bare address), and
`RSVP_EMAIL_TEST_TO` (bare recipient); these nonsecret values may also be set in
the environment. It displays sender and recipient and requires exact `SEND`
confirmation before HTTP. Any other answer cancels. Noninteractive runs fail closed.

Only a queued/delivered outcome for the recipient counts as accepted, not proof
of inbox delivery. Rejections/bounces/suppressions fail; transport errors, 5xx,
malformed or unrecognized results are unknown. No response bodies or exception
details are printed and **no retries** occur, including for rate limits. For unknown
outcomes investigate Cloudflare evidence before rerunning to avoid duplicates.

Set `RSVP_EMAIL_ENABLED=true` only after separately authorizing live sending.
Required: `CLOUDFLARE_ACCOUNT_ID` (32 hexadecimal characters),
`CLOUDFLARE_EMAIL_API_TOKEN` (account email-send permission), `RSVP_EMAIL_FROM`
(verified bare sender address). Optional: `RSVP_EMAIL_REPLY_TO` (bare address).
Incomplete/invalid enabled configuration fails server startup closed. Account
entitlement and sender-domain verification are prerequisites. Never expose these
values in client/VITE variables. No deployment or live send is part of local tests.

New enabled attending-Yes revisions become pending in the RSVP transaction.
The Bun/Effect scoped dispatcher checks current invitation, attendance, revision
and email under a guest row lock before claiming; obsolete rows are cancelled.
Claim transactions lock guest then draft, matching RSVP writers (including
unchanged saves that conflict with an existing draft key), and recheck pending
eligibility after locking. The committed claim is the cutoff: later guest edits
cannot recall this email. Claims commit before HTTP.
Delivered or queued recipient outcomes mean `accepted`, not guaranteed inbox
delivery. Bounce/suppression/configuration/validation errors are terminal failed.
Only explicit Cloudflare 429/code 10004 rejections retry (60s, 120s; at most three
attempts). Network/timeouts, 5xx and malformed outcomes become `unknown`; sending
claims older than five minutes also become unknown. No provider idempotency is
assumed and no unknown claim is automatically resent.

## Recovery and verification

Inspect status/attempt counts using an authorized database connection; do not log
snapshots or credentials. Unknown rows require manual investigation with provider
evidence; do not bulk reset them to pending. Resending may duplicate an email.
Historical draft disposition and personal-data retention require a separate
operational decision. Disable dispatch before maintenance; disabling does not
recall an already-started provider request. Pending rows resume when re-enabled.
There is deliberately no public retry endpoint.

Run server/package `check` and `test` scripts. Tests require `SAO_ALLOW_TESTS=1`.
Database tests additionally require the guarded local `test:disposable` runner
with `TEST_DATABASE_ADMIN_URL`; this runner forces email disabled. Provider tests
use mock HTTP only. Migration 0011 is rerunnable and never promotes disabled rows.
