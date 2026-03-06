# Token-Efficiency Standard

## Purpose and Scope
This standard defines how code is written in this repository so humans and AI systems can read, modify, and extend features with minimal tokens and low ambiguity.

Scope:
- All files under `src/`
- All new tests under `tests/`
- All future architecture and maintenance docs under `docs/`

## Coding Rules for Minimal Token Cost
1. Keep modules focused: one domain responsibility per file.
2. Prefer shared helpers over repeated inline logic.
3. Prefer early returns over deep nested branching.
4. Keep function bodies short (target <= 35 lines; hard limit 60 lines).
5. Keep argument lists small (target <= 4 inputs; otherwise pass an object).
6. Export only what external modules use.
7. Avoid wrapper layers that only forward calls.
8. Preserve existing business invariants and message contracts.

## Naming Conventions Optimized for AI Reasoning
1. Use short, specific names: `readEntries`, `buildResult`, `requireAuth`.
2. Use consistent verb prefixes:
   - `get` for computed reads
   - `read/load` for external reads
   - `save/update/delete` for mutations
   - `build/format/normalize` for pure transforms
3. Avoid synonyms for the same concept (choose one term and reuse it).
4. Prefer full words over abbreviations unless globally understood (`id`, `iso`).

## Comment Rules
1. Comments are optional; code clarity is primary.
2. If used, comments must be functional and short (1 line preferred).
3. Describe *why* only when not obvious from code.
4. No narrative history, storytelling, or TODO prose.
5. No comments that restate code line-by-line.

## Module Boundary Rules
1. `models/`: shape guards, normalizers, factories only.
2. `shared/`: pure utilities only; no storage/network side effects.
3. `services/`: domain logic and IO orchestration.
4. `ui/`: rendering and UI state projection only.
5. `app.js`: event wiring and state transitions only.
6. Cross-module imports must flow through these boundaries; avoid circular dependencies.

## Duplication Avoidance Rules
1. If logic appears in 2+ places, extract a shared helper.
2. Centralize repeated fallback/error handling patterns.
3. Centralize provider branching (`local` vs `supabase`) in shared dispatch helpers.
4. Reuse data conversion helpers instead of re-parsing in each module.

## Predictable Data Shapes and Stable Invariants
1. Use canonical record validators (`isTimeEntryRecord`, `isUserProfileRecord`).
2. Normalize at boundaries (storage read, API read, user input parse).
3. Keep invariant fields stable:
   - `TimeEntry`: `id`, `checkInAt`, `checkOutAt`, `userId`
   - `UserProfile`: `id`, `name`, `createdAt`
4. Keep message text stable unless requirement explicitly changes it.
5. Prefer `null` for absent optional values over mixed sentinel types.

## PR Checklist (Required)
- [ ] No business behavior change unless explicitly required.
- [ ] No duplicate logic introduced across modules.
- [ ] Shared helper reused for repeated patterns.
- [ ] Function and variable names follow repository naming rules.
- [ ] Comments are short and functional only.
- [ ] Data shapes remain canonical and normalized.
- [ ] New module exports are minimal and intentional.
- [ ] Regression tests pass (`npm run test:regression`).

## AI Collaboration Guide
1. Prompts should specify: target file(s), invariant behavior, and exact expected output.
2. Request smallest safe change first; then ask for follow-up optimization.
3. Ask AI to reuse existing helpers before creating new ones.
4. Ask for diff-based output grouped by module responsibility.
5. When editing, state non-negotiable constraints explicitly:
   - no API contract changes
   - no message changes
   - no extra features
