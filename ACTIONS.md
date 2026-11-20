# Action and evidence ledger

Updated 2026-11-20 +02:00. Scope: Data Detective with Java API, React/TypeScript, Python analysis, SQLite, login and registration; CTO subsequently authorised public GitHub source publication. Baseline: empty folder. Source published on jab/data-detective at https://github.com/JABDEVSA/JABDEVSADemoApp; initial source commit ca0c211. API 127.0.0.1:5088; frontend 127.0.0.1:5188; local SQLite/Python.

| Requirement | Status | Actual evidence / remaining action |
|---|---|---|
| React/TypeScript UI and initial design | IMPLEMENTED; CTO ACCEPTANCE OPEN | Desktop/mobile screenshots; final pnpm check passed. CTO must review new baseline |
| Java POST API and SQLite scripts | IMPLEMENTED; LOCAL CHECKS PASS | Java compiled/ran; 9 integration tests with actual local SQLite |
| Registration/login/logout/session | LOCAL CHECKS PASS | Browser registration, bad/good login, reload persistence; API revocation/hash checks |
| Private dataset ownership | LOCAL CHECKS PASS | Two-account list/profile/rows/preview/export isolation assertions |
| Python samples/profile/explore | LOCAL CHECKS PASS | 13 analysis tests; all 3 samples through API; browser retail charts/filter/page/sort |
| CSV upload | LOCAL CHECKS PASS | Browser synthetic upload and API invalid-input/bounds checks |
| Cleaning preview and export | LOCAL CHECKS PASS | Browser preview/download; CSV parsed to 1,178 rows; original compared unchanged |
| SAST application timestamps | LOCAL CHECKS PASS | Explicit +02:00 identity/session/dataset storage and browser display; no legacy data existed |
| Local browser review | BOUNDED REVIEW PASS | Desktop and 390×844 mobile; no horizontal overflow; guide/navigation inspected |
| Hot reload | REPAIRED / VERIFIED | Stable root/component split; selected dataset survived edit; no new console warnings |
| Fixture cleanup | RECORDED | Exact integration users removed per run; browser user + 2 datasets removed; download and evidence retained |
| History, restart and handoff | RECORDED | README, HISTORY, evidence/verification.md; local API/frontend left running |
| Full CTO visual/functional acceptance | OPEN | CTO to review initial demo and provide feedback |
| Production security/accessibility/load audit | NOT CLAIMED | Outside bounded demo checks |
| Public GitHub source publication | PUBLISHED | Public JABDEVSA/JABDEVSADemoApp created; ca0c211 pushed through existing SSH key; API confirmed exact remote commit and public visibility. Default branch jab/data-detective. Existing named keyring credential used; no sign-in. See evidence/github-publication.json |
| Merge and deployment | NOT REQUESTED | No merge or deployment authority |

Exact next action: CTO opens http://127.0.0.1:5188, creates a local account and tries a sample or CSV. Future agent: read current scope/instructions/history first; preserve this baseline; repeat only changed/uncovered checks. Do not treat the local functional results as permission to deploy or as wider system-wide compliance.
