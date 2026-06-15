---
entity: auth
status: ready
prd_synced: bf293d3fc03fddd3154246fce23838820c92531b
updated: 2026-06-15
---

# Auth — Technical Spec

## 1. Summary
`auth` provides account **registration** and **login** as pure TypeScript logic, satisfying [docs/auth/prd.md](./prd.md). An `AuthService` validates and creates accounts in an injected `AccountStore`, hashing passwords with a salted, one-way KDF so the plaintext is never persisted; it authenticates by re-hashing the supplied password and comparing in constant time. Login failures return a single generic result for both unknown-login and wrong-password (no account enumeration). The default store is in-memory; persistence tech, transport (HTTP), and UI are out of scope (the design handoff under `docs/auth/design_handoff_auth_register_login/` is a UI reference only).

## 2. File & folder structure
```
src/auth/
  index.ts            # public barrel — exports AuthService, InMemoryAccountStore, types, messages
  types.ts            # RegistrationInput, Credentials, Account, PublicAccount, results, AccountStore
  messages.ts         # user-facing error/validation message constants
  password.ts         # hashPassword / verifyPassword (salted scrypt via node:crypto)
  validation.ts       # validateRegistration — field-level rules (no store access)
  accountStore.ts     # InMemoryAccountStore implementing AccountStore
  authService.ts      # AuthService.register / AuthService.login orchestration
  password.test.ts    # Vitest — password hashing/verification (Test plan 9, 10)
  validation.test.ts  # Vitest — field validation rules (Test plan 2, 3, 4)
  register.test.ts    # Vitest — AuthService.register behavior (Test plan 1, 5, 6)
  login.test.ts       # Vitest — AuthService.login behavior (Test plan 7, 8)
```

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

// Persistence port (default impl InMemoryAccountStore)
interface AccountStore {
  findByLogin(loginLower: string): Account | undefined;
  add(account: Account): void;
  all(): readonly Account[];
}
```

## 4. Classes & modules
- **`password`** (`password.ts`) — pure functions to hash and verify a password with a per-account random salt; the only place credential material is computed.
- **`validation`** (`validation.ts`) — `validateRegistration`; field-shape rules only (required/min-length). Knows nothing about existing accounts.
- **`InMemoryAccountStore`** (`accountStore.ts`) — `AccountStore` backed by an array/Map; case-insensitive lookup by `loginLower`. Default store for tests and demos.
- **`AuthService`** (`authService.ts`) — orchestrates register/login over an injected `AccountStore`: trims input, runs validation, enforces duplicate-login, hashes on register, verifies on login, and projects `Account → PublicAccount`.
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

`authService.ts`
- `constructor(store: AccountStore = new InMemoryAccountStore())` — store is injectable for tests/persistence swap.
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
- **Internal:** `authService` → `validation`, `password`, `accountStore`, `messages`, `types`. `index.ts` re-exports the public surface.
- **External:** none. Uses Node's built-in `node:crypto` (`randomBytes`, `scryptSync`, `timingSafeEqual`, `randomUUID`) — keeps the project dependency-free. No bcrypt/argon2 package is added; `password.ts` is the single swap point if a different KDF is later mandated.

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

## 8. Open questions / assumptions
- **KDF choice:** scrypt via `node:crypto` (zero-dependency) instead of bcrypt/argon2; satisfies the PRD's "one-way salted hash, never plaintext". Swap is isolated to `password.ts`. Flag if a specific KDF/work factor is mandated.
- **Empty-field login:** an empty login and/or password yields the same generic `LOGIN_FAILED` (no separate "enter your login" message). The handoff's "Enter your login and password." is a UI-only nicety; keeping one message preserves non-enumeration. Flag if the API must distinguish empty input.
- **No session/token:** `login` returns only the identified `PublicAccount`, never a session/JWT (PRD out of scope).
- **Synchronous hashing:** `scryptSync` is used for simplicity; the suite is small. If hashing must be async/non-blocking under load, switch to the callback/promise `scrypt` — signatures would become `Promise`-returning (flag before tester writes tests).
- **Identity:** `id` via `crypto.randomUUID()`; tests assert identity by `login`/fields, not `id`, to stay deterministic. `createdAt` from the handoff is omitted (not required by the PRD).
- **`country`** is a free-text non-empty string; not validated against any country list (PRD out of scope).

## 9. Changelog
- 2026-06-15 (`bf293d3`): initial spec derived from `prd.md` @ bf293d3 — 8-section auth logic (register/login over an injected `AccountStore`, zero-dep scrypt hashing) and a 10-item TDD test plan covering all 8 PRD acceptance criteria.
