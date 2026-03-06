# Step 5A — Technical Plan

## Architecture
- Modular vanilla JavaScript in browser using ES modules.
- Single-page structure with lightweight hash-based auth routing for signed-out states.
- Layered flow: UI modules -> service layer -> storage service.
- Theme support via CSS tokens with runtime `data-theme` toggle on root element.
- Auth flow supports landing, sign-up, sign-in, and confirmation route states before authenticated app-home.

## Component / Module Structure
- `src/app.js`: app bootstrap, event binding, render cycle, auth route state machine, and sign-up/sign-in orchestration.
- `src/ui/mainView.js`: static shell markup and root DOM wiring.
- `src/ui/checkView.js`: dynamic UI rendering (signed-out route panels + authenticated dashboard state).
- `src/services/authService.js`: Supabase auth integration (`signUp`, `signIn`, `signOut`, `restoreSession`, `changePassword`).
- `public/styles.css`: token-based light/dark theme definitions.
- `src/models/timeEntry.js`: entry factory/model utilities.
- `src/services/timeEntryService.js`: domain logic for check-in/out and retrieval.
- `src/services/storageService.js`: localStorage read/write abstraction.

## Data Model
`TimeEntry` object:
- `id` (string)
- `checkInAt` (ISO timestamp string)
- `checkOutAt` (ISO timestamp string | null)

Derived fields in UI/service:
- `isActive = checkOutAt === null`
- `durationMinutes` for completed sessions

## Local Persistence (V1)
- Use `localStorage` key `workHours.entries.v1`.
- Serialize entries as JSON array.
- Validate loaded structures and fallback to empty array if corrupted.

## Event Flow (UI -> Logic -> Data)
1. User clicks action button.
2. `app.js` handler calls service method.
3. Service validates state and updates entries.
4. Storage service persists updated array.
5. UI re-renders status, buttons, message, and history.

### Auth Flow (Signed-Out -> Signed-In)
1. User opens landing and selects Create Account or Sign In.
2. `app.js` validates credentials and calls `authService`.
3. `authService` executes Supabase auth endpoint requests.
4. On success with session: auth session is saved and app renders authenticated dashboard.
5. On success without session: confirmation screen is shown and user is guided to sign-in.
6. On failure: mapped validation/network/auth errors are shown inline.

## Error Handling
- Guard against invalid transitions (double check-in/check-out).
- Catch storage parse/write errors and display safe message.
- Keep UI functional with in-memory fallback for current session if needed.
- Auth-specific failures are normalized into user-facing messages (duplicate email, weak password, network errors).

## VS Code + Live Server Run Instructions
1. Open workspace root in VS Code.
2. Open `public/index.html`.
3. Start Live Server using the editor action (`Go Live`) or extension command.
4. Use the browser tab launched by Live Server to interact with the app.

## Free Libraries
- `@playwright/test` for browser e2e coverage.

---

# Step 5B — File Structure (V1)

```
/public
  index.html
  styles.css

/src
  app.js
  /ui
    mainView.js
    checkView.js
  /models
    timeEntry.js
  /services
    authService.js
    timeEntryService.js
    storageService.js

/tests
  /regression
    *.regression.test.mjs
  /e2e
    server.mjs
    signup-flow.e2e.spec.mjs

playwright.config.mjs

/docs
  requirements.md
  design.md
  technical-plan.md
  roadmap.md
```
