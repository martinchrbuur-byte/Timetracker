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

Current regression coverage includes 7 scenarios for:
- check-in/check-out baseline behavior,
- valid session time edits,
- invalid time ordering,
- overlap prevention,
- single active session enforcement.