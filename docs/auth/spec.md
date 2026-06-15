---
entity: auth
status: ready
prd_synced: bf293d3fc03fddd3154246fce23838820c92531b
updated: 2026-06-15
---

# Auth — Technical Spec

## 1. Summary
`auth` provides account **registration** and **login** as pure TypeScript logic, satisfying [docs/auth/prd.md](./prd.md). An `AuthService` validates and creates accounts through an injected `AccountStore`, hashing passwords with a salted, one-way KDF so the plaintext is never persisted; it authenticates by re-hashing the supplied password and comparing in constant time. Login failures return a single generic result for both unknown-login and wrong-password (no account enumeration). Accounts are persisted in **SQLite** (`SqliteAccountStore`, the production default) behind the `AccountStore` port; an `InMemoryAccountStore` is retained for fast, deterministic unit tests. Transport (HTTP) and UI are out of scope (the design handoff under `docs/auth/design_handoff_auth_register_login/` is a UI reference only).

## 2. File & folder structure
```
src/auth/
  index.ts                  # public barrel — exports AuthService, createAuthService, stores, types, messages
  types.ts                  # RegistrationInput, Credentials, Account, PublicAccount, results, AccountStore
  messages.ts               # user-facing error/validation message constants
  password.ts               # hashPassword / verifyPassword (salted scrypt via node:crypto)
  validation.ts             # validateRegistration — field-level rules (no store access)
  accountStore.ts           # InMemoryAccountStore implementing AccountStore (tests/demo)
  sqliteAccountStore.ts     # SqliteAccountStore implementing AccountStore (node:sqlite, production default)
  authService.ts            # AuthService.register / AuthService.login orchestration + createAuthService factory

docs/auth/tests/            # executable Vitest tests (import implementation from ../../../src/auth/*)
  validation.test.ts        # field validation rules (Test plan 2, 3, 4)
  register.test.ts          # AuthService.register behavior (Test plan 1, 5, 6)
  login.test.ts             # AuthService.login behavior (Test plan 7, 8, 9)
  password.test.ts          # password hashing/verification (Test plan 10)
  sqliteAccountStore.test.ts # SQLite persistence/uniqueness + end-to-end (Test plan 11, 12, 13)
```
Executable tests live under `docs/<entity>/tests/` (Vitest glob `docs/**/tests/**/*.test.ts`), not colocated in `src/`. They import the implementation via a relative path to `src/auth/`.

## 3. Types & data models
Defined in `src/auth/types.ts` unless noted.

```ts
// Input to register (all raw strings; trimmed during processing)
interface RegistrationInput {
  name: string; surname: string; country: string; login: string; password: string;
}

// Input to login
interface Credentials { login: string; password: string; }

// The five registerable fields — keys used in FieldErrors
type Field = 'name' | 'surname' | 'country' | 'login' | 'password';
type FieldErrors = Partial<Record<Field, string>>;  // empty object == valid

// Stored credential material (password.ts)
interface StoredCredential { salt: string; hash: string; }  // hex strings

// Persisted account (never leaves the module as-is)
interface Account {
  id: string;            // opaque, crypto.randomUUID()
  name: string; surname: string; country: string;
  login: string;         // original casing, trimmed
  loginLower: string;    // login.toLowerCase() — uniqueness/lookup key
  credential: StoredCredential;
}

// Safe projection returned to callers — NO password/hash/salt
interface PublicAccount {
  id: string; name: string; surname: string; country: string; login: string;
}

// Result of register()
type RegisterResult =
  | { ok: true; account: PublicAccount }
  | { ok: false; errors: FieldErrors };

// Result of login()
type LoginResult =
  | { ok: true; account: PublicAccount }
  | { ok: false; error: string };   // always the same generic message

// Persistence port — synchronous (both impls are sync: in-memory + node:sqlite DatabaseSync).
// Production impl: SqliteAccountStore. Test/demo impl: InMemoryAccountStore.
interface AccountStore {
  findByLogin(loginLower: string): Account | undefined;
  add(account: Account): void;
  all(): readonly Account[];
}
```

### SQLite schema (`SqliteAccountStore`)
One table; `login_lower` carries a `UNIQUE` constraint so duplicate logins are rejected at the DB level (defense-in-depth behind `AuthService`'s friendly pre-check). `StoredCredential` maps to the `salt`/`hash` columns.
```sql
CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  surname     TEXT NOT NULL,
  country     TEXT NOT NULL,
  login       TEXT NOT NULL,           -- original casing
  login_lower TEXT NOT NULL UNIQUE,    -- lookup + uniqueness key
  salt        TEXT NOT NULL,
  hash        TEXT NOT NULL
);
```

## 4. Classes & modules
- **`password`** (`password.ts`) — pure functions to hash and verify a password with a per-account random salt; the only place credential material is computed.
- **`validation`** (`validation.ts`) — `validateRegistration`; field-shape rules only (required/min-length). Knows nothing about existing accounts.
- **`InMemoryAccountStore`** (`accountStore.ts`) — `AccountStore` backed by an array/Map; case-insensitive lookup by `loginLower`. Store for unit tests and demos.
- **`SqliteAccountStore`** (`sqliteAccountStore.ts`) — `AccountStore` backed by `node:sqlite` `DatabaseSync`; ensures the schema on construction, persists/reads the `accounts` table, and maps rows ↔ `Account`. Production default. The single place the SQLite driver is referenced (swap point).
- **`AuthService`** (`authService.ts`) — orchestrates register/login over an injected `AccountStore`: trims input, runs validation, enforces duplicate-login, hashes on register, verifies on login, and projects `Account → PublicAccount`. Store-agnostic — unchanged by the SQLite decision.
- **`messages`** (`messages.ts`) — exported message constants so tests assert against names, not string literals.

## 5. Methods / functions

`password.ts`
- `hashPassword(password: string): StoredCredential` — generates a 16-byte random salt (hex) and returns `{ salt, hash }` where `hash = scrypt(password, salt, 64)` (hex). No validation; assumes a non-empty password. Pure aside from RNG.
- `verifyPassword(password: string, cred: StoredCredential): boolean` — recomputes `scrypt(password, cred.salt, 64)` and compares to `cred.hash` with `crypto.timingSafeEqual`. Returns `false` (never throws) on length/format mismatch.

`validation.ts`
- `validateRegistration(input: RegistrationInput): FieldErrors` — trims every field; for each empty field adds `messages.required(field)`; if trimmed `login` length < 3 adds `messages.LOGIN_TOO_SHORT`; if `password` length < 8 adds `messages.PASSWORD_TOO_SHORT`. Returns `{}` when all rules pass. Does **not** check uniqueness (no store access).

`accountStore.ts`
- `InMemoryAccountStore` implements `AccountStore`:
  - `findByLogin(loginLower)` — returns the matching account or `undefined`.
  - `add(account)` — appends; assumes uniqueness already enforced by caller.
  - `all()` — returns a read-only snapshot.

`sqliteAccountStore.ts`
- `SqliteAccountStore` implements `AccountStore`:
  - `constructor(database: string | DatabaseSync = ':memory:')` — if a path string, opens `new DatabaseSync(path)`; ensures the schema via `exec(CREATE TABLE IF NOT EXISTS …)`. Accepts an existing `DatabaseSync` for sharing/testing.
  - `findByLogin(loginLower)` — `SELECT … WHERE login_lower = ?`, maps the row to `Account` (or `undefined`).
  - `add(account)` — `INSERT` the row (incl. `salt`/`hash`). The `UNIQUE(login_lower)` constraint throws `ERR_SQLITE_ERROR` on a duplicate (race safety); the normal friendly path is `AuthService`'s pre-check, so this throw is not expected in single-threaded flows.
  - `all()` — `SELECT * FROM accounts`, mapped to `Account[]`.
  - `close(): void` — closes the underlying database (beyond the `AccountStore` port; for app lifecycle/test cleanup).

`authService.ts`
- `constructor(store: AccountStore = new InMemoryAccountStore())` — store is injectable; default stays in-memory so unit tests need no DB. Production is wired via `createAuthService`.
- `createAuthService(dbPath: string = DEFAULT_DB_PATH): AuthService` *(factory, exported)* — `new AuthService(new SqliteAccountStore(dbPath))`. `DEFAULT_DB_PATH` is a module constant (e.g. `'auth.db'`); the app may pass its own path. This is the intended production entry point.
- `register(input: RegistrationInput): RegisterResult` —
  1. `const errors = validateRegistration(input)`.
  2. If no field errors, compute `loginLower = input.login.trim().toLowerCase()`; if `store.findByLogin(loginLower)` exists, set `errors.login = messages.LOGIN_TAKEN`.
  3. If `errors` non-empty → `{ ok: false, errors }`; **no account created**.
  4. Else build `Account` (`id = crypto.randomUUID()`, trimmed fields, `credential = hashPassword(input.password)`), `store.add(it)`, return `{ ok: true, account: toPublic(it) }`. Exactly one account added.
- `login(creds: Credentials): LoginResult` —
  1. `account = store.findByLogin(creds.login.trim().toLowerCase())`.
  2. If no account → `{ ok: false, error: messages.LOGIN_FAILED }` (still runs/ignores a verify or returns directly; either way no enumeration).
  3. If `verifyPassword(creds.password, account.credential)` is false → same `{ ok: false, error: messages.LOGIN_FAILED }`.
  4. Else → `{ ok: true, account: toPublic(account) }`.
- `toPublic(a: Account): PublicAccount` *(private helper)* — strips `loginLower` and `credential`.

`messages.ts` (constants/factories)
- `required(field: Field): string` → e.g. `"Name is required."`
- `LOGIN_TOO_SHORT = "Login must be at least 3 characters."`
- `PASSWORD_TOO_SHORT = "Password must be at least 8 characters."`
- `LOGIN_TAKEN = "That login is already taken."`
- `LOGIN_FAILED = "That login and password don't match."`

## 6. Dependencies
- **Internal:** `authService` → `validation`, `password`, `accountStore` (default), `messages`, `types`; `createAuthService` → `sqliteAccountStore`. `index.ts` re-exports the public surface.
- **External:** none. Uses Node built-ins only:
  - `node:crypto` (`randomBytes`, `scryptSync`, `timingSafeEqual`, `randomUUID`) — KDF + ids. `password.ts` is the single swap point if a different KDF is later mandated.
  - `node:sqlite` (`DatabaseSync`) — persistence (confirmed available, synchronous, enforces `UNIQUE` in Node v23.7.0). Emits an `ExperimentalWarning`. `sqliteAccountStore.ts` is the single swap point if `better-sqlite3` (or another driver) is later mandated.
  - No npm packages are added; the project stays dependency-free.

## 7. Test plan (TDD)
Each item becomes one or more `*.test.ts` cases the tester writes before implementation. PRD acceptance-criterion mapping in parentheses.

1. **register success** (PRD AC1) — given valid name/surname/country, an unused login, and an 8+ char password, `register` returns `{ ok: true }`, the `PublicAccount` echoes the trimmed fields, and `store.all()` length increases by exactly 1.
2. **register missing field** (PRD AC2) — for each of the five fields, omitting/blanking it (incl. whitespace-only) returns `{ ok:false }` with that field set to `messages.required(field)` and `store.all()` unchanged.
3. **register login too short** (PRD AC4) — a 1–2 char login returns `{ ok:false, errors.login === LOGIN_TOO_SHORT }`; no account stored.
4. **register password too short** (PRD AC4) — a <8 char password returns `{ ok:false, errors.password === PASSWORD_TOO_SHORT }`; no account stored.
5. **register duplicate, case-insensitive** (PRD AC3) — after registering login `alice`, registering `Alice` (else valid) returns `{ ok:false, errors.login === LOGIN_TAKEN }` and `store.all()` still has exactly one account.
6. **password never stored in plaintext** (PRD AC5) — after a successful register, the stored `Account.credential` contains a non-empty `salt` and `hash`, the `hash !== password`, and no stored value equals the plaintext password.
7. **login success, case-insensitive** (PRD AC6) — given a registered `bob`/`secret-pw`, `login({login:'BOB', password:'secret-pw'})` returns `{ ok:true }` identifying that account.
8. **login wrong password is generic** (PRD AC7) — registered `bob` with a wrong password returns `{ ok:false, error === LOGIN_FAILED }` and no account.
9. **login unknown login is identical failure** (PRD AC8) — `login` for a non-existent login returns `{ ok:false, error === LOGIN_FAILED }` — byte-for-byte the same message as item 8 (no enumeration).
10. **password unit round-trip** — `verifyPassword(pw, hashPassword(pw))` is `true`; `verifyPassword('wrong', cred)` is `false`; two `hashPassword(pw)` calls yield different `salt`/`hash` (random salt).
11. **SQLite persistence across instances** — using a temp-file DB path, register an account via one `SqliteAccountStore`, construct a second store on the **same path**, and `findByLogin` returns the account (data survived the instance; `close()` between them). Maps all fields incl. `credential.salt`/`hash` faithfully.
12. **SQLite enforces unique login at the DB level** — inserting two accounts whose `login_lower` collide (bypassing `AuthService`, calling `store.add` directly) throws an `ERR_SQLITE_ERROR`; the table holds exactly one row.
13. **AuthService end-to-end over SQLite** — with `new AuthService(new SqliteAccountStore(':memory:'))`: register `bob`/`secret-pw` succeeds; `login('BOB','secret-pw')` succeeds and identifies the account; wrong password and unknown login both return the generic `LOGIN_FAILED`; a duplicate register returns `errors.login === LOGIN_TAKEN`. (Re-verifies AC1/AC3/AC6/AC7/AC8 against the real store.)

> Impact on existing tests: items **1–10 are unaffected** — the `AccountStore` port is unchanged and they continue to run against `InMemoryAccountStore`. Items 11–13 are **new**, exercising the SQLite store directly.

## 8. Open questions / assumptions
- **SQLite driver:** `node:sqlite` (`DatabaseSync`) per the user's direction — zero-dependency and synchronous, matching the existing `AccountStore` port. It is flagged **experimental** in Node 23 (emits `ExperimentalWarning`) and requires Node ≥ 22.5; the swap to `better-sqlite3` is isolated to `sqliteAccountStore.ts`. Flag if production must run on an older Node or requires a stable driver.
- **Uniqueness is enforced in two layers:** `AuthService` pre-checks `findByLogin` for the friendly `LOGIN_TAKEN` field error; the `UNIQUE(login_lower)` column constraint is defense-in-depth against concurrent inserts. `add()` surfaces a constraint violation as a thrown error rather than a `FieldErrors` result (not expected on the normal path).
- **DB path / lifecycle:** `DEFAULT_DB_PATH` (e.g. `'auth.db'`) is a placeholder; the application owns the real path/config and calling `close()`. Migrations beyond `CREATE TABLE IF NOT EXISTS` are out of scope.
- **KDF choice:** scrypt via `node:crypto` (zero-dependency) instead of bcrypt/argon2; satisfies the PRD's "one-way salted hash, never plaintext". Swap is isolated to `password.ts`. Flag if a specific KDF/work factor is mandated.
- **Empty-field login:** an empty login and/or password yields the same generic `LOGIN_FAILED` (no separate "enter your login" message). The handoff's "Enter your login and password." is a UI-only nicety; keeping one message preserves non-enumeration. Flag if the API must distinguish empty input.
- **No session/token:** `login` returns only the identified `PublicAccount`, never a session/JWT (PRD out of scope).
- **Synchronous hashing:** `scryptSync` is used for simplicity; the suite is small. If hashing must be async/non-blocking under load, switch to the callback/promise `scrypt` — signatures would become `Promise`-returning (flag before tester writes tests).
- **Identity:** `id` via `crypto.randomUUID()`; tests assert identity by `login`/fields, not `id`, to stay deterministic. `createdAt` from the handoff is omitted (not required by the PRD).
- **`country`** is a free-text non-empty string; not validated against any country list (PRD out of scope).

## 9. Changelog
- 2026-06-15 (`bf293d3`): initial spec derived from `prd.md` @ bf293d3 — 8-section auth logic (register/login over an injected `AccountStore`, zero-dep scrypt hashing) and a 10-item TDD test plan covering all 8 PRD acceptance criteria.
- 2026-06-15 (no PRD change; architecture directive "use node sqlite"): persistence set to **SQLite** via `node:sqlite` (`DatabaseSync`). Added `SqliteAccountStore` + `createAuthService` factory; added the `accounts` schema with `UNIQUE(login_lower)`; added Test-plan items 11–13. `AccountStore` port and items 1–10 unchanged; `InMemoryAccountStore` retained for unit tests. `prd_synced` unchanged (`bf293d3`).
- 2026-06-15 (tester; convention change): executable Vitest tests moved from `src/auth/*.test.ts` to `docs/auth/tests/*.test.ts`; Vitest `include` glob updated to `docs/**/tests/**/*.test.ts`. No behavior/test-plan change. `prd_synced` unchanged.
