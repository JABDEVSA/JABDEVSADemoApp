# JABDEVSADemoApp — Data Detective

Address the user as CTO. Read Project Init.md, HISTORY.md and ACTIONS.md before work or resume.

## Current scope and architecture
CTO requested a Python/React Data Detective demo with login, registration and SQLite on 20 November 2026, then explicitly amended the backend to Java and the React frontend to TypeScript. Java supersedes the earlier general C# requirement in this project. Local development only; deployment requires an explicit instruction. React/TypeScript frontend, Java POST-only API, server-side Python analysis and local SQLite. SQLite explicitly supersedes MSSQL for this project. SQLite has no stored procedures: parameterised SQL resides in individual database/queries files, with no embedded SQL in application code. No foreign keys or cascades.

## Cardinal instructions
- Public source publication is authorised for JABDEVSA/JABDEVSADemoApp. Use the existing named JABDEVSA GitHub CLI keyring credential for API administration and the existing SSH key with pinned known hosts for Git transport. Default CLI account discovery can miss the saved named account; do not infer missing access or initiate sign-in from that alone. Never print tokens or place them in project files. Continue source work on jab/data-detective; merging and deployment need their own explicit authority.
- TIME-SAST-001: all newly written application timestamps use Africa/Johannesburg with explicit +02:00 offsets. Java OffsetDateTime, Python fixed +02:00; never depend on host timezone. Preserve instants, precision and retained original evidence. Any legacy migration remains incomplete until proved across every layer.
- COMPLETE-EVIDENCE-001: record scope, baseline and environment before changes; reconcile actual evidence, failures, cleanup and open items. Implementation, tests, acceptance, publication and deployment are separate statuses. Update HISTORY.md and ACTIONS.md before handoff. Never infer full acceptance from a build.
- CI-001: preserve the baseline in DESIGN.md, app shell, navigation, typography, tables, paging and responsive patterns. Inspect affected UI and diffs; build success is not visual evidence.
- GLOBAL-DEPLOY-001: develop locally -> test locally -> build/package/publish -> deploy/restart -> done. Only on explicit deployment authority: publish through authorised working-branch/develop flow and designated deployment repository; pull/rebuild/restart on specified server; clean unused images/build cache. No backups, snapshots, recovery archives, rollback or separate release verification stages. Command success is not functional Pass. Preserve credentials, data, access and unrelated work. Do not redeploy for documentation alone.
- Source edits stay on a working branch; merge to develop only on explicit instruction. Deployment repositories use develop.
- Keep React hot reload running for local development. Do not run npm run build except for deployment preparation.
- Configuration belongs in appsettings.json, not environment variables. No secrets in logs or Git. Use IP addresses/ports locally; no VM or cloud is authorised in this task.
- Keep files below 100 MB. All business calculations, cleaning and pagination occur server-side.
