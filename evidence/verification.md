# Local verification — 2026-11-20 +02:00

## Requested scope and environment

Data Detective demonstration with login/register, private datasets, three samples, CSV analysis/exploration, cleaning preview and export. Latest CTO amendment: Java API, React with TypeScript, Python analysis and SQLite. Fresh empty workspace; no existing approved layout or source was replaced. Initial design is pending CTO review.

All components ran on this Windows workstation: Vite 6.4.6 at http://127.0.0.1:5188, Java 17 API at http://127.0.0.1:5088, Python 3.12.14 subprocess, SQLite via sqlite-jdbc 3.54.1.0 at api/data/detective.db. Frontend dependencies include React 19.3.1 and Recharts 3.11.0. Source remains on local working branch jab/data-detective; no Git identity or remote is configured. No commit, merge, push, frontend production build, packaging or deployment was performed.

## Actual results

| Scope | Actual evidence | Result |
|---|---|---|
| TypeScript source | pnpm check after final component split | PASS, no type errors |
| Java compilation | scripts/start-api.ps1 compiles Main.java, starts listener | PASS for local execution only |
| Python analysis | 13 tests in python-tests.txt | PASS for enumerated assertions |
| API + real SQLite | 9 tests in api-tests.txt | PASS for enumerated assertions |
| Registration | Browser created temporary Demo Reviewer account and continued into the chosen sample | PASS |
| Login/logout/session | Invalid password message, successful login, logout, reload persistence; API revocation test | PASS |
| Password/session storage | PBKDF2 salt/hash differ from password; session token hash differs from cookie; HttpOnly/SameSite attributes | PASS |
| Account isolation | Second account sees no datasets and cannot profile/read/preview/export the first account's ID | PASS |
| Samples | All three generated/profiled through actual API: 1,200 / 850 / 640 rows and seven columns | PASS |
| Retail browser profile | 1,200 rows, 97% health, 67 missing cells, 22 exact duplicates, 34 spacing issues, 14 numeric outliers | PASS |
| Search/page/sort | Gauteng returns 307 rows; page 2 of 31; ascending revenue begins 142.06, 150.95, 154.39 | PASS |
| File upload | Browser file chooser uploaded synthetic 3-row browser-upload.csv | PASS |
| Cleaning preview | Retail trim/deduplicate: 1,178 rows, 99.2% health; uploaded fixture trim/fill=0/deduplicate: 2 rows, 100% health | PASS |
| Download | Browser download completed; actual CSV parsed to 1,178 rows and seven expected headers; retained as retail-cleaned.csv | PASS |
| Original preservation | API test compared stored original bytes after preview/export; unchanged | PASS |
| Input boundaries | Duplicate/empty headers, malformed CSV, row/column/size bounds, nonfinite/mixed numeric data, invalid JSON shape and disallowed origin | PASS for enumerated tests |
| SAST | API creates uniformly formatted +02:00 identity/dataset/session values; database checked; browser renders explicit +02:00 with Africa/Johannesburg | PASS for these new application layers |
| Desktop visual | Overview, charts, table, auth/upload dialogs, cleanup screens inspected | PASS for inspected views; CTO design acceptance remains OPEN |
| Mobile visual | 390×844 override; visible content width=375 and document width=375 (scrollbar accounted for); overview, cleanup, navigation and guide inspected | PASS for inspected views |
| Hot reload | Existing Retail sales dataset remained visible after a source edit; no new console errors/warnings | PASS after repair |

## Repairs and retained failure history

- Initial pnpm install rejected ignored esbuild build scripts. Repaired by explicitly allowing esbuild in pnpm-workspace.yaml; dependency installation then succeeded.
- Initial Recharts 2 dependency produced a deprecation notice; upgraded to 3.11.0 before testing.
- Initial C# scaffold restore produced a transitive SQLite package advisory. CTO changed the backend to Java before application implementation; the C# project and its five generated restore files were removed. The Java implementation uses pinned sqlite-jdbc 3.54.1.0 instead. A broad generated-directory cleanup command was blocked by automatic policy; cleanup was completed using explicit individual-file patches after enumerating the five generated files.
- Maven Central did not publish the requested SHA-256 sidecar for the pinned dependency. Setup now verifies the published SHA-1 sidecars over HTTPS; all pinned jars downloaded and matched. This is download-integrity evidence, not a dependency security audit.
- Browser development logs showed a duplicate React root after hot editing the combined entry/component file, plus transient chart sizing warnings. Split the stable root into main.tsx and the refreshable component into App.tsx; supplied chart initial dimensions. An independent hot edit kept the open dataset and produced zero new warnings. Historical messages remain historical evidence, not current failures.
- A few browser automation locators were narrowed to dialog scope or exact DOM casing after ambiguity; these were automation targeting issues, not observed application failures.

## Cleanup and retained outputs

Each integration run removed only its two freshly generated user IDs and their dependent records. The browser reviewer was signed out, then its exact fixture email/ID was removed with two owned datasets and zero remaining sessions. See cleanup.txt. No retained user data, accounts, credentials, permissions or unrelated work were modified.

The synthetic exported file remains at C:/Users/Johan Botha/Downloads/Retail sales-cleaned.csv, with an evidence copy in this directory. Screenshots contain synthetic sample data only. Temporary logs/upload fixture and local Python path remain ignored under .runtime and api/appsettings.Local.json; runtime SQLite, classes and Java jars are ignored. The frontend and API remain running for CTO's requested local preview.

## Separate statuses and next action

Implementation and the bounded local checks above are evidenced. Full CTO acceptance is OPEN: review the initial design and register a personal local account to try the journey. No public sharing URL exists; publication, authorised branch integration and deployment are NOT REQUESTED. A production security/accessibility/load audit, additional browser/device coverage, password recovery and email verification are not claimed. The broader system-wide SAST migration is outside this new project and remains unassessed.

Next action: CTO reviews http://127.0.0.1:5188, selects a sample or uploads a CSV, and provides design/functionality feedback. For later work, first read Project Init.md, AGENTS.md, HISTORY.md and ACTIONS.md. Restart commands are in README.md; source hashes for this handoff are in source-manifest.json.
