---
entity: auth
status: ready
prd_synced: bf293d3fc03fddd3154246fce23838820c92531b # prd.md / handoff commit this spec was last derived from
updated: 2026-06-15
---

# Auth — Technical Spec

## 1. Summary
`auth` lets a visitor **register** an account (name, surname, country, a unique login, a password) and later **log in** with that login + password — delivered **end to end**: a React UI (recreated from the design handoff) → an HTTP/JSON API → the `AuthService` core → SQLite storage. The core validates and creates accounts through an injected `AccountStore`, hashing passwords with a salted, one-way KDF (scrypt) so plaintext is never persisted; it authenticates by re-hashing the supplied password and comparing in constant time. Login failures return a single generic result for both unknown-login and wrong-password (no account enumeration). The browser cannot use `node:sqlite`/`node:crypto`, so a thin **`node:http`** server (`src/auth/server.ts`) exposes the core over `/api/*`; the UI (`src/auth/web/`) reaches it through a `fetch` client (`web/api.ts`), proxied by Vite in dev. A storage **inspector** view surfaces exactly what is persisted (salt + hash, never plaintext) to make the security rule tangible. Satisfies [docs/auth/prd.md](./prd.md) and the design handoff under [design_handoff_auth_register_login/](./design_handoff_auth_register_login/). **The UI and the HTTP transport are in scope** — the feature is specified, and built, to work wired together.

## 2. File & folder structure
```
src/auth/                          # CORE — node-only auth logic (unchanged by the UI/transport)
  index.ts                  # public barrel — AuthService, createAuthService, stores, types, messages
  types.ts                  # RegistrationInput, Credentials, Account, PublicAccount, results, AccountStore
  messages.ts               # user-facing error/validation message constants
  password.ts               # hashPassword / verifyPassword (salted scrypt via node:crypto)
  validation.ts             # validateRegistration — field-level rules (no store access)
  accountStore.ts           # InMemoryAccountStore implementing AccountStore (tests/demo)
  sqliteAccountStore.ts     # SqliteAccountStore implementing AccountStore (node:sqlite, production default)
  authService.ts            # AuthService.register / login orchestration + createAuthService factory

  server.ts                 # TRANSPORT — node:http JSON API over AuthService (zero web framework). Port 8787.

  web/                      # FRONTEND — React 18 + TS recreation of the handoff (its own DOM tsconfig)
    index.html              # Vite entry; Google-Fonts <link> (Bricolage Grotesque, Hanken Grotesk, Space Mono)
    main.tsx                # browser entry: createRoot(...).render(<App/>) ; imports styles.css
    App.tsx                 # shell: tabs, view routing, session, inspector wiring; uses the api module
    api.ts                  # fetch client for /api/* (register, login, getAccounts, seed, clearAll) + DTO types
    styles.css              # design tokens (CSS custom props) + component styles, recreated from the handoff
    vite-env.d.ts           # Vite client types
    tsconfig.json           # DOM/React tsconfig for the web app (root tsconfig excludes this dir)
    components/
      BrandPanel.tsx        # left brand panel (mode-dependent headline/subhead/rules)
      Field.tsx             # labelled input w/ hint, error state, password Show/Hide
      RegisterForm.tsx      # 5-field form → api.register → per-field errors / success
      LoginForm.tsx         # login form → api.login → generic failure banner / success
      Success.tsx           # identified-account view (chips, back)
      Inspector.tsx         # storage drawer: per-account dump (salt + hash, "✗ not stored")

vite.config.ts                     # Vite: root src/auth/web, @vitejs/plugin-react, /api proxy → :8787, build → dist/auth-web
vitest.config.ts                   # (to update) include {ts,tsx} + jsdom for *.test.tsx (see §6/§7)
tsconfig.json                      # root node tsconfig; excludes src/auth/web
package.json                       # scripts: test, typecheck, dev:api (tsx server.ts), dev:web (vite), build:web

docs/auth/tests/                   # executable Vitest tests (import implementation from ../../../src/auth/*)
  validation.test.ts        # field validation rules (Test plan 2, 3, 4)        [exists]
  register.test.ts          # AuthService.register behavior (Test plan 1, 5, 6)  [exists]
  login.test.ts             # AuthService.login behavior (Test plan 7, 8, 9)     [exists]
  password.test.ts          # password hashing/verification (Test plan 10)       [exists]
  sqliteAccountStore.test.ts # SQLite persistence/uniqueness + e2e (Test plan 11–13) [exists]
  field.test.tsx            # Field component (Test plan 14)                      [new]
  registerForm.test.tsx     # RegisterForm validation + submit→success (Test plan 15) [new]
  loginForm.test.tsx        # LoginForm generic failure + empty + success (Test plan 16) [new]
  success.test.tsx          # Success view (Test plan 17)                         [new]
  inspector.test.tsx        # Inspector dump/empty/seed/clear (Test plan 18)      [new]
  app.test.tsx              # tabs / view routing / swap (Test plan 19)           [new]
  httpApi.e2e.test.ts       # boot server + real fetch register/login/inspect (Test plan 20 — END-TO-END) [new]
```
Executable tests live under `docs/<entity>/tests/` (Vitest glob), not colocated in `src/`. `.test.ts` import the core; `.test.tsx` import the React components from `../../../src/auth/web/*` and need the jsdom environment (§7).

## 3. Types & data models
Defined in `src/auth/types.ts` unless noted.

```ts
interface RegistrationInput { name: string; surname: string; country: string; login: string; password: string; }
interface Credentials { login: string; password: string; }

type Field = 'name' | 'surname' | 'country' | 'login' | 'password';
type FieldErrors = Partial<Record<Field, string>>;  // empty == valid

interface StoredCredential { salt: string; hash: string; }  // hex

interface Account {
  id: string;                 // crypto.randomUUID()
  name: string; surname: string; country: string;
  login: string;              // original casing, trimmed
  loginLower: string;         // toLowerCase() — uniqueness/lookup key
  credential: StoredCredential;
}

interface PublicAccount { id: string; name: string; surname: string; country: string; login: string; }

type RegisterResult = { ok: true; account: PublicAccount } | { ok: false; errors: FieldErrors };
type LoginResult    = { ok: true; account: PublicAccount } | { ok: false; error: string };   // same generic msg

interface AccountStore {
  findByLogin(loginLower: string): Account | undefined;
  add(account: Account): void;
  all(): readonly Account[];
}
```

### Transport / client DTOs
The HTTP layer returns the core results as JSON. The **inspector view** is the credential material with **no plaintext**:
```ts
// shape returned by GET /api/accounts (server.ts storedView()) and rendered by the inspector:
interface StoredView { name: string; surname: string; country: string; login: string; salt: string; passHash: string; }
```
`src/auth/web/api.ts` re-declares `PublicAccount`, `FieldErrors`, `RegisterResult`, `LoginResult`, and `StoredView` locally (the web app is a separate DOM TS project and does not import the node core types). These must stay in sync with `src/auth/types.ts` — see §8.

### SQLite schema (`SqliteAccountStore`)
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

### Core (unchanged)
- **`password`** (`password.ts`) — hash/verify with a per-account random salt; the only place credential material is computed.
- **`validation`** (`validation.ts`) — `validateRegistration`; field-shape rules only (required/min-length). No store access.
- **`InMemoryAccountStore`** (`accountStore.ts`) — `AccountStore` over an array/Map; case-insensitive lookup. Tests/demo.
- **`SqliteAccountStore`** (`sqliteAccountStore.ts`) — `AccountStore` over `node:sqlite` `DatabaseSync`; ensures schema, maps rows ↔ `Account`. Production default; sole SQLite swap point.
- **`AuthService`** (`authService.ts`) — orchestrates register/login over an injected `AccountStore`; trims, validates, enforces duplicate-login, hashes on register, verifies on login, projects `Account → PublicAccount`. `createAuthService(dbPath)` wires the SQLite store.
- **`messages`** (`messages.ts`) — exported message constants (tests assert against names).

### Transport (`src/auth/server.ts`)
- A single **`node:http`** server (zero web framework) holding a module-scoped `service = new AuthService(new SqliteAccountStore(':memory:'))`. Routes `/api/*` to the core and returns JSON; the sole place `node:http` is referenced. Listens on `process.env.PORT || 8787`. `storedView()` maps `store.all()` → `StoredView[]` (salt + hash, never plaintext). Run via `npm run dev:api` (`tsx src/auth/server.ts`). Uses an in-memory DB so the demo server starts clean each run; `clear` re-creates the store.

### Frontend (`src/auth/web/` — React 18 + TS; `tweaks-panel.jsx` from the handoff is design tooling, NOT implemented)
- **`api`** (`web/api.ts`) — a `fetch` client module (free functions, not a class): `register`, `login`, `getAccounts`, `seed`, `clearAll`, all hitting `/api/*` (Vite proxies `/api` → `:8787` in dev). The seam between UI and transport.
- **`App`** (`App.tsx`) — shell: holds `mode` (`register|login`), `view` (`form|success`), `session` (`{account, via}`), `inspectorOpen`, `accounts: StoredView[]`. Renders `BrandPanel`, tabs, the active form, or `Success`; wires the floating inspector toggle + `Inspector`. Loads accounts via `api.getAccounts()` on mount and after each action. Imports the `api` module directly (no injected port).
- **`BrandPanel`** (`mode`) — left column; mode-dependent headline ("Make it *yours.*" / "Welcome *back.*"), subhead, three numbered rules. Decorative CSS shapes.
- **`Field`** — labelled input with optional hint, error state (`.field--bad` + `.field__err`), and an inline Show/Hide toggle for `type="password"` (out of tab order).
- **`RegisterForm`** (`onRegistered`, `onSwitch`) — five fields; on submit calls `api.register`, renders returned `FieldErrors` per field, and on success calls `onRegistered(account, 'register')`. Busy label "Creating…".
- **`LoginForm`** (`onLoggedIn`, `onSwitch`) — login + password; empty submit shows "Enter your login and password." (no API call); otherwise calls `api.login` and on failure shows the generic banner "That login and password don't match." (identical for unknown login and wrong password). Busy label "Checking…".
- **`Success`** (`account`, `via`, `onDone`) — badge, mode-dependent title with the first name highlighted, lead, three chips (`login` / `name surname` / `country`), "← Back to start".
- **`Inspector`** (`open`, `onClose`, `accounts`, `onReset`, `onSeed`) — slide-in drawer over a scrim; per-account monospace dump (`name/surname/country/login`, then `password: ✗ not stored`, `salt:`, `passHash:`), empty state, footer Seed/Clear.

## 5. Methods / functions

### Core (unchanged)
- `hashPassword(password): StoredCredential` — 16-byte hex salt + `scrypt(password, salt, 64)` (hex).
- `verifyPassword(password, cred): boolean` — recompute scrypt, `timingSafeEqual`; `false` (never throws) on mismatch.
- `validateRegistration(input): FieldErrors` — trim; `required(field)` per empty; `LOGIN_TOO_SHORT` (<3), `PASSWORD_TOO_SHORT` (<8); `{}` when valid. No uniqueness.
- `AuthService.register(input): RegisterResult` — validate → duplicate pre-check (`findByLogin`, `LOGIN_TAKEN`) → on errors `{ok:false,errors}` (no account); else build `Account` (`randomUUID`, trimmed, `hashPassword`), `store.add`, `{ok:true, account: toPublic}`.
- `AuthService.login(creds): LoginResult` — `findByLogin(trim().toLowerCase())`; missing or `verifyPassword` false → `{ok:false, error: LOGIN_FAILED}` (identical, no enumeration); else `{ok:true, account: toPublic}`.
- `createAuthService(dbPath = DEFAULT_DB_PATH): AuthService` — production wiring over SQLite.

### Transport — HTTP API (`server.ts`)
JSON in/out; `content-type: application/json`. Note the server returns the **core result object with HTTP 200** and lets the `ok` flag in the body discriminate success/failure (see §8 — not 201/401/422):
- `POST /api/register` — body `RegistrationInput` → `200` `RegisterResult` (`{ok:true,account}` or `{ok:false,errors}`).
- `POST /api/login` — body `Credentials` → `200` `LoginResult` (`{ok:true,account}` or `{ok:false,error}` = generic `LOGIN_FAILED`).
- `GET /api/accounts` — `200` `StoredView[]` (from `storedView()`; salt + hash, never plaintext).
- `POST /api/seed` — idempotently registers `bob`/`secret-pw` (name "Bob"/"Stone", country "Canada") → `200` `StoredView[]`. *(demo affordance)*
- `POST /api/clear` — recreates the in-memory store/service (wipes all) → `200` `StoredView[]`. *(demo affordance)*
- Unknown route → `404 {error:'not found'}`; body parse failure → `400 {ok:false, error:'bad request'}`.

### Frontend client (`web/api.ts`)
- `register(input): Promise<RegisterResult>` → POST `/api/register`.
- `login(creds): Promise<LoginResult>` → POST `/api/login`.
- `getAccounts(): Promise<StoredView[]>` → GET `/api/accounts`.
- `seed(): Promise<StoredView[]>` → POST `/api/seed`.
- `clearAll(): Promise<StoredView[]>` → POST `/api/clear`.

### React components (props)
- `App()` — no props; owns the state in §4 and calls the `api` module.
- `BrandPanel({ mode })`; `Field({ id, label, hint?, error?, type?, value, onChange, placeholder?, autoComplete? })` (`onChange(value: string)`).
- `RegisterForm({ onRegistered, onSwitch })`; `LoginForm({ onLoggedIn, onSwitch })`.
- `Success({ account, via, onDone })`; `Inspector({ open, onClose, accounts, onReset, onSeed })`.

`messages.ts` (unchanged) — `required(field)`, `LOGIN_TOO_SHORT`, `PASSWORD_TOO_SHORT`, `LOGIN_TAKEN`, `LOGIN_FAILED = "That login and password don't match."` (the login banner copy equals this constant).

## 6. Dependencies
- **Internal:** `authService` → `validation`, `password`, `accountStore`, `messages`, `types`; `createAuthService` → `sqliteAccountStore`. `server.ts` → `authService`, `sqliteAccountStore`. `web/*` → `web/api.ts` (the only thing that touches the network); the web app never imports the node core.
- **External (already in `package.json`):**
  - Runtime: `react`, `react-dom` (18).
  - Dev/build: `vite`, `@vitejs/plugin-react`, `tsx` (runs `server.ts`), `typescript`, `vitest`, `@types/node`, `@types/react`, `@types/react-dom`.
  - Core: Node built-ins only — `node:http` (transport), `node:crypto` (scrypt/UUID), `node:sqlite` (`DatabaseSync`, Node ≥ 22.5). No web framework, no extra npm in the core.
- **To add for the new component tests (14–19):** `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and a `vitest.config.ts` update (below). The e2e test (20) runs in the existing node env.
- **Visual checks (21):** the **Playwright MCP** (configured globally — no project dependency).
- **Fonts:** loaded via Google Fonts `<link>` in `web/index.html`.

> **vitest.config.ts change** (currently `include: ['docs/**/tests/**/*.test.ts']`, `environment: 'node'`): widen `include` to `docs/**/tests/**/*.test.{ts,tsx}` and select jsdom for component tests — e.g. `environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']]` (keep `node` default for `*.test.ts` so the core + e2e tests are unaffected), plus a `@testing-library/jest-dom` setup file.

## 7. Test plan (TDD)
PRD acceptance-criterion mapping in parentheses.

**Core (exist — unchanged)**
1. **register success** (AC1) — valid input + unused login + 8+ char password → `{ok:true}`, `PublicAccount` echoes trimmed fields, `store.all()` +1.
2. **register missing field** (AC2) — each field blank/whitespace → `{ok:false}`, that field = `required(field)`; store unchanged.
3. **register login too short** (AC4) — 1–2 char login → `errors.login === LOGIN_TOO_SHORT`; no account.
4. **register password too short** (AC4) — <8 char password → `errors.password === PASSWORD_TOO_SHORT`; no account.
5. **register duplicate, case-insensitive** (AC3) — after `alice`, `Alice` → `errors.login === LOGIN_TAKEN`; one account.
6. **password never stored in plaintext** (AC5) — stored `credential` has non-empty salt/hash, `hash !== password`, no stored value equals plaintext.
7. **login success, case-insensitive** (AC6) — `BOB`/`secret-pw` → `{ok:true}` identifying the account.
8. **login wrong password is generic** (AC7) — `error === LOGIN_FAILED`; no account.
9. **login unknown login is identical failure** (AC8) — non-existent login → `error === LOGIN_FAILED`, byte-for-byte == item 8.
10. **password unit round-trip** — `verify(pw, hash(pw))` true; `verify('wrong', cred)` false; two hashes differ.
11. **SQLite persistence across instances** — temp-file DB; write via one store, read via a second on the same path; salt/hash survive.
12. **SQLite enforces unique login at DB level** — colliding `login_lower` via direct `add` → `ERR_SQLITE_ERROR`; one row.
13. **AuthService end-to-end over SQLite** — over `:memory:`: register/login/duplicate/wrong/unknown per AC1/AC3/AC6/AC7/AC8.

**Frontend (new — jsdom + Testing Library; forms exercised with `fetch` mocked or `api` stubbed)**
14. **Field** — `type="password"` Show/Hide toggles the input `type`; an `error` prop renders `.field--bad` + a `.field__err` message; the toggle is out of tab order.
15. **RegisterForm** — submitting with `api.register` resolving field errors renders them per field and does NOT call `onRegistered`; a success result calls `onRegistered(account, 'register')`; busy label "Creating…" while pending.
16. **LoginForm** — empty submit → banner "Enter your login and password." and `api.login` NOT called; an `{ok:false, error: LOGIN_FAILED}` result → banner "That login and password don't match." — **identical** for unknown-login and wrong-password stubs; success → `onLoggedIn(account, 'login')`.
17. **Success** — `via:'register'` title "You're in, {name}." vs `via:'login'` "Hello again, {name}."; name highlighted; three chips show `login` / `name surname` / `country`; "← Back to start" calls `onDone`.
18. **Inspector** — `open=false` renders nothing; with accounts, each card shows `password: ✗ not stored`, the `salt`, the `passHash`, and **no** field equals a plaintext password; empty state when none; Seed calls `onSeed`, Clear calls `onReset`.
19. **App shell** — defaults to register/form; switching tabs register↔login resets to the form view and clears any session; swap links switch mode; a successful submit transitions to Success; Back returns to the form. (`api.getAccounts` stubbed.)
20. **End-to-end (HTTP) — REQUIRED.** Start the `server.ts` handler on an ephemeral port (or import & `listen(0)`); via real `fetch`: `POST /api/register` bob → `{ok:true, account}`; duplicate → `{ok:false, errors.login === LOGIN_TAKEN}`; `POST /api/login` `BOB`/`secret-pw` → `{ok:true}` identifying the account; wrong password and unknown login → `{ok:false, error}` **identical** generic; `GET /api/accounts` → bob present with `salt` + `passHash` and **no plaintext password anywhere in the JSON**. Proves web client → HTTP → AuthService → SQLite works wired together.
21. **Visual parity (Playwright) — REQUIRED.** Run both servers (`npm run dev:api` + `npm run dev:web`), drive the **Playwright MCP** at the handoff's viewport, and match each reference in [design_handoff_auth_register_login/screenshots/](./design_handoff_auth_register_login/screenshots/) **exactly**:
    - `01-register.png` — Register form, default view.
    - `02-login-error.png` — Login form showing the generic failure banner.
    - `03-success.png` — Success view after registering "Ada".
    - `04-storage-inspector.png` — Inspector drawer open: `salt` + `passHash` shown, `password: ✗ not stored`.
    Match layout, the pink/yellow/ink tokens, typography (Bricolage Grotesque / Hanken Grotesk / Space Mono), `3px`/`2.5px` ink borders, hard offset shadows, tabs, fields/focus, chips — and verify the ≤860px single-column (brand-as-banner) layout.

> Impact on existing tests: items **1–13 unaffected** — the core (`AuthService`, stores, `messages`) is unchanged; the UI/transport sit on top. Items **14–21 are new**. Component tests (14–19) require the `vitest.config.ts` + dep changes in §6; the e2e test (20) runs in the current node env.

## 8. Open questions / assumptions
- **UI framework:** React 18 + TS, built/served with **Vite** (`root: src/auth/web`, dev proxy `/api` → `:8787`, build → `dist/auth-web`). Matches the React handoff and the project's TS/Vitest tooling.
- **Transport shape — HTTP status codes.** `server.ts` returns the core result object with **HTTP 200** for register/login and lets the `ok` flag discriminate (failures are not `4xx`). This is intentional and simple, but is **not** conventional REST. Flag if status codes must be `201`/`401`/`422`; the client (`web/api.ts`) currently keys off `ok`, not status, so a change touches both.
- **Demo server uses an in-memory SQLite store** (`:memory:`) created at module load, and `POST /api/clear` recreates it — so the dev API resets on restart and `clear` wipes everything. Production should wire `createAuthService(dbPath)` (a file DB) and gate/remove `seed`/`clear` and `GET /api/accounts`. Flag for the hardened deployment.
- **Inspector exposes credential material** (`salt` + `passHash`, never plaintext) via `GET /api/accounts` to make AC5 tangible. With `seed`/`clear`, these are **dev/demo affordances**; gate or remove them (and the inspector) in production.
- **Duplicated DTO types.** `web/api.ts` re-declares `PublicAccount`/`FieldErrors`/`RegisterResult`/`LoginResult`/`StoredView` because the web app is a separate DOM TS project (root `tsconfig.json` excludes `src/auth/web`). They must stay in sync with `src/auth/types.ts`; if drift becomes a risk, extract a shared DOM-safe types module. Flag.
- **No client-side hashing.** Production hashing/storage is server-side scrypt + SQLite. The handoff prototype's client-side SHA-256 + `localStorage` was demo-only and is NOT carried over — the inspector reads server truth via `GET /api/accounts`.
- **Validation is server-authoritative** — `RegisterForm` submits and renders the `FieldErrors` the server returns (single source: shared `validation.ts` + `AuthService`).
- **UI copy** is rendered from API messages; the login banner equals `LOGIN_FAILED`. Field-required wording follows `messages.ts` ("Name is required.") and is not pinned by any screenshot; align `messages.ts` labels only if exact handoff copy is later required (would touch the constants — flag to tester).
- **SQLite driver / KDF / DB lifecycle / sync hashing / identity / country** — unchanged: `node:sqlite` (experimental, Node ≥ 22.5; swap isolated to `sqliteAccountStore.ts`); scrypt via `node:crypto` (swap isolated to `password.ts`); `DEFAULT_DB_PATH` placeholder; `scryptSync` for simplicity; `id` via `randomUUID` (tests assert by login/fields); `country` free-text non-empty.
- **Sessions/tokens remain out of scope** per the PRD — `login` returns only the identified `PublicAccount`; no cookie/JWT. (UI/transport in scope does not pull product-excluded features in.)
- **Viewport for parity:** desktop two-column (≥860px); reference screenshots frame the ~1040px card. Also verify the ≤860px single-column.

## 9. Changelog
- 2026-06-15 (`bf293d3`): initial spec from `prd.md` — 8-section auth logic (register/login over an injected `AccountStore`, zero-dep scrypt hashing) + a 10-item TDD plan covering all 8 PRD ACs.
- 2026-06-15 (architecture directive "use node sqlite"): persistence set to **SQLite** via `node:sqlite`; added `SqliteAccountStore` + `createAuthService`; `accounts` schema with `UNIQUE(login_lower)`; Test-plan items 11–13. Core port + items 1–10 unchanged.
- 2026-06-15 (tester; convention): executable tests moved to `docs/auth/tests/*.test.ts`.
- 2026-06-15 (architect; **UI + transport folded in — end-to-end**): **removed the "UI/transport out of scope" exclusion.** Documented the **transport** (`src/auth/server.ts`: zero-dep `node:http` JSON API over `AuthService`, port 8787, `/api/register|login|accounts|seed|clear`) and the **frontend** (`src/auth/web/`: React 18 + TS recreation of the handoff — `App`, `api.ts` fetch client, `components/{BrandPanel,Field,RegisterForm,LoginForm,Success,Inspector}`, `styles.css`, Vite). Aligned the spec to the in-worktree implementation (function-style `api` client, `StoredView`, results returned as HTTP 200 + discriminated body, in-memory demo store). Added Test-plan items 14–19 (component), **20 (end-to-end HTTP)**, **21 (Playwright visual parity vs the 4 handoff screenshots)**, and the `vitest.config.ts`/dep changes they need. Items 1–13 and the core (`AuthService`, stores, `messages`) unchanged.
