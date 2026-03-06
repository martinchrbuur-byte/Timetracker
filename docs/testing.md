# Testing

## Regression Suite

Run the edit-time regression scenarios:

```bash
npm run test:regression
```

Run all Node tests:

```bash
npm test
```

Current regression coverage includes 38 scenarios for:
- check-in/check-out baseline behavior,
- valid session time edits,
- invalid time ordering,
- overlap prevention,
- single active session enforcement,
- user-id isolation during check-in,
- delete-entry behavior,
- localized datetime parsing fallback,
- quick-correct checkout adjustments (+15m / -15m path),
- quick-correct overlap rejection,
- historic overview day grouping (earliest start/latest end),
- historic week/month/year range filtering,
- active-session end-time handling in historic overview,
- offline queue write fallback and reconnect flush behavior,
- integrity feedback evaluation (valid/warning/blocked scenarios).

Additional sign-up regression coverage includes:
- Supabase sign-up with immediate session return,
- sign-up requiring email confirmation (no immediate session),
- duplicate-email error mapping,
- weak-password rejection before network request,
- network failure mapping for sign-up.

Sign-up regression tests live in:
- `tests/regression/signup-flow.regression.test.mjs`

Integrity feedback regression tests live in:
- `tests/regression/integrity-feedback.regression.test.mjs`

## E2E Suite (Playwright)

Install dependencies and browser binary:

```bash
npm install
npx playwright install chromium
```

Run e2e tests:

```bash
npm run test:e2e
```

Run in headed mode:

```bash
npm run test:e2e:headed
```

E2E coverage currently validates:
- landing -> sign-up -> confirmation -> sign-in transition,
- landing -> sign-up -> authenticated app-home redirect when session is returned.

E2E assets:
- `playwright.config.mjs`
- `tests/e2e/server.mjs`
- `tests/e2e/signup-flow.e2e.spec.mjs`

## Historic Overview Focus

The historic period tests live in:
- `tests/regression/historic-overview.regression.test.mjs`

They verify:
- per-day aggregation (first start + last end),
- period boundaries for week, month, and year,
- correct handling of active sessions in the current day.

## Offline Queue + Sync Status Focus

Offline queue tests live in:
- `tests/regression/offline-sync.regression.test.mjs`

They verify:
- write operations queue when remote persistence is unavailable,
- cached entries remain readable while offline,
- queued operations flush successfully after connectivity recovery.