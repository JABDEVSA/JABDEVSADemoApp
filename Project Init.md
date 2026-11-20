# Data Detective — project initiation

Requested: showcase Python and React through a usable data-analysis demo, including user registration/login and SQLite persistence.

Baseline: workspace was empty, with no repository, source, design standard, project history, CTO override files or checklist. Created working branch jab/data-detective. User-provided CTO instructions are the current overrides. No approved reference application was supplied; initial visual baseline is documented in DESIGN.md.

Environment: React/Vite http://127.0.0.1:5188; Java API http://127.0.0.1:5088; Python subprocess on this workstation; SQLite api/data/detective.db on this workstation. No VM/cloud/database-host mappings apply. No deployment, merge or remote publication authorised.

Latest CTO amendment, 2026-11-20 +02:00: publish the project source to GitHub under JABDEVSA with PUBLIC visibility. This supersedes the original restriction on remote source publication above. Deployment and merges remain unauthorised; publish the current working branch.

Scope: session authentication, private datasets, three deterministic sample CSVs, bounded CSV uploads, missing/duplicate/format/outlier profiling, numeric charts, searchable sortable paginated data, explicit cleaning preview, clean CSV export, saved dataset history, explanation of implementation and limitations. Original CSVs retained unchanged. No AI service required.

SQLite exception: SQLite does not implement stored procedures. CTO's explicit SQLite selection requires individual parameterised query scripts in database/queries instead; no application-inline SQL or foreign keys.

Acceptance: actual API/auth/isolation and analysis tests; local browser checks for registration/login, sample workflow, filtering/paging, cleaning/export and responsive UI. Report any unverified scope separately. No production-readiness claim.
