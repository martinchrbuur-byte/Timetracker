# Step 5A — Technical Plan

## Architecture
- Modular vanilla JavaScript in browser using ES modules.
- Single-page structure (no routing required for V1).
- Layered flow: UI modules -> service layer -> storage service.

## Component / Module Structure
- `src/app.js`: app bootstrap, event binding, render cycle.
- `src/ui/mainView.js`: static shell markup and root DOM wiring.
- `src/ui/checkView.js`: dynamic UI rendering (status, table, messages).
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

## Error Handling
- Guard against invalid transitions (double check-in/check-out).
- Catch storage parse/write errors and display safe message.
- Keep UI functional with in-memory fallback for current session if needed.

## VS Code + Live Server Run Instructions
1. Open workspace root in VS Code.
2. Open `public/index.html`.
3. Start Live Server using the editor action (`Go Live`) or extension command.
4. Use the browser tab launched by Live Server to interact with the app.

## Free Libraries
- None for V1 (dependency-free implementation).

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
    timeEntryService.js
    storageService.js

/docs
  requirements.md
  design.md
  technical-plan.md
  roadmap.md
```
