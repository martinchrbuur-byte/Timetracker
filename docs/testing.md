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

Current regression coverage includes 14 scenarios for:
- check-in/check-out baseline behavior,
- valid session time edits,
- invalid time ordering,
- overlap prevention,
- single active session enforcement,
- user-id isolation during check-in,
- delete-entry behavior,
- localized datetime parsing fallback,
- historic overview day grouping (earliest start/latest end),
- historic week/month/year range filtering,
- active-session end-time handling in historic overview.

## Historic Overview Focus

The historic period tests live in:
- `tests/regression/historic-overview.regression.test.mjs`

They verify:
- per-day aggregation (first start + last end),
- period boundaries for week, month, and year,
- correct handling of active sessions in the current day.