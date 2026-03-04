# AI Maintenance Guide

## Design Boundaries

- `src/app.js` is the orchestration layer only (event wiring + UI/service coordination).
- `src/services/timeEntryService.js` is the single source of truth for business rules.
- `src/services/storageService.js` is the only module that talks to `localStorage`.
- `src/services/storageService.js` is the only module that talks to persistence providers (localStorage/Supabase).
- `src/ui/mainView.js` owns static markup and element references.
- `src/ui/checkView.js` owns state-to-DOM rendering only.
- `src/shared/dateTime.js` centralizes date parsing/formatting/conversion.
- `src/config/appConfig.js` owns runtime config resolution for provider selection.

## Invariants to Preserve

- At most one active session (`checkOutAt === null`) can exist at a time.
- Entry intervals must not overlap.
- `checkOutAt` cannot be earlier than `checkInAt`.
- Storage payload must stay compatible with `STORAGE_KEY` and `isTimeEntryRecord`.
- Supabase row mapping must stay compatible with `time_entries` (`check_in_at`, `check_out_at`).

## Safe Extension Workflow

1. Add or update business behavior in `timeEntryService.js` first.
2. Add regression coverage in `tests/regression/*.test.mjs`.
3. Wire UI interactions in `app.js` only after service tests pass.
4. Keep user-facing date behavior in `shared/dateTime.js`.
5. Run:
   - `npm run test:regression`
   - `npm test`

## Naming Conventions

- Use `entry` for a single time record.
- Use `entries` for lists.
- Use `next*` prefixes for proposed edits before persistence.
- Keep boolean names as `is*`, `has*`, or `should*`.

## Token-Efficient Coding Rules

- Prefer one reusable helper over repeated inline logic.
- Keep pure functions side-effect free where possible.
- Keep messages centralized in service modules.
- Avoid duplicate date conversion code outside `shared/dateTime.js`.
