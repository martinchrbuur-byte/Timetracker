# Work Hours Tracker Implementation Plan

## Current architecture
The shipped application is a local web application built with the Java standard library and a vanilla JavaScript frontend.

### Runtime layers
- **Bootstrap layer**: `Main` wires storage, domain service, and the HTTP server.
- **HTTP layer**: `WebServer` serves both static frontend files and JSON API endpoints.
- **Application/service layer**: `TimeEntryService` enforces check-in and check-out rules and prepares entry views.
- **Persistence layer**: `CsvStorageService` reads and writes the local CSV file through the `LocalStorageService` abstraction.
- **Domain layer**: `TimeEntry` represents one work session.
- **Frontend layer**: `web/index.html`, `web/styles.css`, and `web/app.js` render the UI and call the API.

## Active application flow
1. `Main` creates `CsvStorageService` with the path `data/time-entries.csv`.
2. `Main` creates `TimeEntryService`, which loads persisted entries into memory on startup.
3. `Main` starts `WebServer` on port `8080`.
4. `WebServer` serves the frontend from `web/` and exposes JSON endpoints under `/api/*`.
5. The browser UI calls the API for status, totals, history, and state-changing actions.
6. `TimeEntryService` persists changes back to CSV after successful writes.

## Component design

### `Main`
- Entry point for the application.
- Initializes storage and business logic.
- Starts the local web server.
- Registers a shutdown hook to stop the server cleanly.

### `WebServer`
- Uses `com.sun.net.httpserver.HttpServer` from `jdk.httpserver`.
- Serves the following API endpoints:
  - `GET /api/status`
  - `POST /api/check-in`
  - `POST /api/check-out`
  - `GET /api/today`
  - `GET /api/history`
  - `GET /api/today-total`
- Serves static files from `web/`.
- Adds simple CORS headers.
- Performs request-method validation and returns `405` for unsupported methods.
- Builds JSON responses manually without external libraries.

### `TimeEntryService`
- Maintains the in-memory list of loaded entries.
- Prevents duplicate open sessions.
- Handles session close operations.
- Returns today's entries, full history, today's total duration, and open-session state.
- Sorts entries by check-in timestamp.
- Reverts in-memory changes if persistence fails during check-in or check-out.

### `CsvStorageService`
- Ensures the `data/` directory and CSV file exist.
- Uses a fixed CSV header: `id,checkIn,checkOut`.
- Reads entries into domain objects on startup.
- Rewrites the file from memory on each state change.

### `TimeEntry`
- Fields:
  - `id: String`
  - `checkIn: LocalDateTime`
  - `checkOut: LocalDateTime | null`
- Derived behavior:
  - `isOpen()`
  - `getEntryDate()`
  - `getDuration()`

### Frontend assets
- `index.html` defines the single-page layout.
- `styles.css` provides the neutral card-and-table styling.
- `app.js`:
  - Loads initial state on page load.
  - Calls `fetch()` for backend requests.
  - Updates the feedback region after user actions.
  - Refreshes status, totals, and history after successful mutations.
  - Supports overriding the API base URL through the `apiBase` query parameter.

## API contract

### `GET /api/status`
Response shape:
- `status: string`

### `POST /api/check-in`
Response shape:
- `success: boolean`
- `message: string`

### `POST /api/check-out`
Response shape:
- `success: boolean`
- `message: string`

### `GET /api/today`
Response shape:
- Array of entries with:
  - `date: string`
  - `checkIn: string`
  - `checkOut: string`
  - `duration: string`

### `GET /api/history`
Response shape:
- Same entry shape as `/api/today`, but for all entries.

### `GET /api/today-total`
Response shape:
- `total: string`

## Persistence strategy
- File location: `data/time-entries.csv`
- Encoding: UTF-8
- Timestamp storage: Java `LocalDateTime` string output
- Write strategy: full overwrite after each successful mutation
- Empty check-out column represents an open session

## Error handling strategy
- Duplicate check-in and missing open-session checkout are handled as user-facing validation messages.
- Persistence failures return readable failure messages and avoid leaving partially applied state in memory.
- Startup load failures are logged to standard error, and the server still attempts to run.
- Failed HTTP requests in the frontend are surfaced in the feedback panel.

## Build and run instructions

### Prerequisites
- JDK 17+
- VS Code or another Java-capable environment

### Build
Use the included workspace task or compile manually with the required module:

- `javac --add-modules jdk.httpserver -d out ...`

### Run
- `java --add-modules jdk.httpserver -cp out app.Main`

### Default usage
1. Start the application.
2. Open `http://localhost:8080` in a browser.
3. Interact with the local UI.

## Repository structure

```text
/src
  /main
    /java
      /app
        Main.java
        /controller
          AppController.java
        /models
          TimeEntry.java
        /services
          CsvStorageService.java
          LocalStorageService.java
          TimeEntryService.java
        /ui
          ConsoleView.java
        /util
          DurationFormatter.java
        /web
          WebServer.java
/web
  app.js
  index.html
  styles.css
/docs
  design.md
  implementation-plan.md
  requirements.md
  roadmap.md
/data
  time-entries.csv   (created at runtime)
/README.md
```

## Notes on legacy CLI classes
- `AppController` and `ConsoleView` remain in the repository from the earlier CLI-oriented implementation.
- They are not currently wired into `Main` and are not part of the default runtime path.
- They can still serve as a fallback reference if a console mode is reintroduced later.

## Suggested next implementation steps
1. Add tests around `TimeEntryService` and CSV parsing.
2. Improve storage robustness with safer file-write semantics.
3. Add filtering and summarization endpoints for broader reporting.
4. Introduce release automation once runtime behavior is stable.
