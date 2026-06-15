// Shared types for the auth entity. Type-only — no runtime logic. (spec §3)

export interface RegistrationInput {
  name: string
  surname: string
  country: string
  login: string
  password: string
}

export interface Credentials {
  login: string
  password: string
}

export type Field = 'name' | 'surname' | 'country' | 'login' | 'password'

// Empty object == valid.
export type FieldErrors = Partial<Record<Field, string>>

// Stored credential material (hex strings).
export interface StoredCredential {
  salt: string
  hash: string
}

// Persisted account — never leaves the module as-is.
export interface Account {
  id: string
  name: string
  surname: string
  country: string
  login: string // original casing, trimmed
  loginLower: string // login.toLowerCase() — uniqueness/lookup key
  credential: StoredCredential
}

// Safe projection returned to callers — NO password/hash/salt.
export interface PublicAccount {
  id: string
  name: string
  surname: string
  country: string
  login: string
}

export type RegisterResult =
  | { ok: true; account: PublicAccount }
  | { ok: false; errors: FieldErrors }

export type LoginResult =
  | { ok: true; account: PublicAccount }
  | { ok: false; error: string }

// Synchronous persistence port (both impls are sync).
export interface AccountStore {
  findByLogin(loginLower: string): Account | undefined
  add(account: Account): void
  all(): readonly Account[]
}
