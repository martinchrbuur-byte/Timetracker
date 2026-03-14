# Work Hours Tracker (V1)

Simple Java application with a vanilla JavaScript front end for recording workday check-in and check-out timestamps.

## Run in VS Code (no paid dependencies)

Prerequisites:
- JDK 17+

Quick run (PowerShell):

```powershell
New-Item -ItemType Directory -Force out | Out-Null
javac --add-modules jdk.httpserver -d out (Get-ChildItem -Recurse src/main/java/*.java | ForEach-Object { $_.FullName })
java --add-modules jdk.httpserver -cp out app.Main
```

Then open `http://localhost:8080` in your browser.

## Use VS Code Live Server for the UI

1. Start the Java backend:

```powershell
java --add-modules jdk.httpserver -cp out app.Main
```

2. In VS Code, right-click `web/index.html` and choose **Open with Live Server**.
3. The frontend will call the backend at `http://localhost:8080` automatically.

Optional: override backend URL by adding query parameter, for example:
- `http://127.0.0.1:5500/web/index.html?apiBase=http://localhost:8080`

## Data storage

- Data is saved locally in `data/time-entries.csv`.
- V1 uses local persistence only.
- GitHub deployment and Supabase integration are planned for future versions.

## Docs

- `docs/requirements.md`
- `docs/design.md`
- `docs/implementation-plan.md`
- `docs/roadmap.md`
