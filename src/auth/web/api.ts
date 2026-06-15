// Client for the auth HTTP API (src/auth/server.ts), reached via Vite's /api proxy.

export interface PublicAccount {
  id: string
  name: string
  surname: string
  country: string
  login: string
}

export type FieldErrors = Partial<
  Record<'name' | 'surname' | 'country' | 'login' | 'password', string>
>

export type RegisterResult =
  | { ok: true; account: PublicAccount }
  | { ok: false; errors: FieldErrors }

export type LoginResult = { ok: true; account: PublicAccount } | { ok: false; error: string }

// What the inspector renders — note: no plaintext password is ever returned.
export interface StoredView {
  name: string
  surname: string
  country: string
  login: string
  salt: string
  passHash: string
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json() as Promise<T>
}

export function register(input: {
  name: string
  surname: string
  country: string
  login: string
  password: string
}): Promise<RegisterResult> {
  return postJson('/api/register', input)
}

export function login(creds: { login: string; password: string }): Promise<LoginResult> {
  return postJson('/api/login', creds)
}

export function getAccounts(): Promise<StoredView[]> {
  return fetch('/api/accounts').then((r) => r.json() as Promise<StoredView[]>)
}

export function seed(): Promise<StoredView[]> {
  return postJson('/api/seed')
}

export function clearAll(): Promise<StoredView[]> {
  return postJson('/api/clear')
}
