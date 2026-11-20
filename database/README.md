# Local SQLite database

Single configured database path: api/appsettings.json. Runtime data is ignored by Git. Schema is initialised from schema.sql. There are no foreign keys or cascades; the API owns coordination. SQLite has no stored procedures: each operation is documented here and has its own parameterised SQL file under queries/.

Tables: users (identity, unique normalised email, PBKDF2 hash/salt, SAST creation); sessions (SHA-256 token hash, user ID, SAST expiry); datasets (owner, original CSV, display name, SAST creation). Date values are ISO 8601 +02:00, with uniform nine-digit fractional seconds from Java OffsetDateTime.

Queries: user_by_email locates login identity; create_user creates an account; create_session records a hashed random token; session_user validates expiry and resolves identity; delete_session revokes logout; prune_sessions removes expired sessions; create_dataset saves an original; list_datasets lists owned history; get_dataset resolves an explicitly owned dataset. All values are bound parameters. Application code loads these scripts rather than embedding SQL.

No legacy database exists in this initial baseline. Local HTTP cookies are HttpOnly/SameSite=Strict; a future deployment must supply HTTPS and set SecureCookies=true in appsettings. No password recovery/email verification/production infrastructure is in this demo scope.

Test-only scripts: test_read_users inspects the exact fixture email; test_read_dataset checks an exact owned original; test_read_sessions checks hashes/expiry for an exact fixture owner. test_delete_datasets and test_delete_sessions remove records for a supplied fixture user ID; test_delete_user additionally requires the matching fixture email. They are never API routes. The test suite records created IDs and invokes these scripts during bounded cleanup.
