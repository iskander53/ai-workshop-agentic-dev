import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { LOGIN_TAKEN } from '../../../src/auth/messages'

// Boots the REAL transport (src/auth/server.ts) on an ephemeral port and drives
// it over real fetch: web client → HTTP → AuthService → SQLite. (Test plan 20)
const serverPath = fileURLToPath(new URL('../../../src/auth/server.ts', import.meta.url))

let child: ChildProcess
let base: string

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.once('error', reject)
    srv.listen(0, () => {
      const addr = srv.address()
      const port = addr && typeof addr === 'object' ? addr.port : 0
      srv.close(() => resolve(port))
    })
  })
}

async function waitForReady(url: string, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error('server did not become ready')
}

function postJson(path: string, body?: unknown) {
  return fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: (await r.json()) as any }))
}

beforeAll(async () => {
  const port = await freePort()
  base = `http://localhost:${port}`
  // tsx loader so server.ts (TS + extensionless imports) runs under the current node.
  child = spawn(process.execPath, ['--import', 'tsx', serverPath], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  })
  await waitForReady(`${base}/api/accounts`)
}, 30000)

afterAll(() => {
  child?.kill()
})

describe('HTTP API end-to-end (Test plan 20)', () => {
  it('registers, rejects duplicates, authenticates, fails generically, and never leaks plaintext', async () => {
    const reg = await postJson('/api/register', {
      name: 'Bob',
      surname: 'Stone',
      country: 'Canada',
      login: 'bob',
      password: 'secret-pw',
    })
    expect(reg.status).toBe(200)
    expect(reg.body.ok).toBe(true)
    expect(reg.body.account.login).toBe('bob')

    // Duplicate (case-insensitive) → field error, no second account.
    const dup = await postJson('/api/register', {
      name: 'Bob',
      surname: 'Stone',
      country: 'Canada',
      login: 'BOB',
      password: 'another-pw',
    })
    expect(dup.body.ok).toBe(false)
    expect(dup.body.errors.login).toBe(LOGIN_TAKEN)

    // Login, case-insensitive.
    const good = await postJson('/api/login', { login: 'BOB', password: 'secret-pw' })
    expect(good.body.ok).toBe(true)
    expect(good.body.account.login).toBe('bob')

    // Wrong password and unknown login → identical generic failure.
    const wrong = await postJson('/api/login', { login: 'bob', password: 'nope' })
    const unknown = await postJson('/api/login', { login: 'ghost', password: 'whatever' })
    expect(wrong.body.ok).toBe(false)
    expect(unknown.body.ok).toBe(false)
    expect(unknown.body.error).toBe(wrong.body.error)

    // Inspector view: bob present with salt + passHash and NO plaintext anywhere.
    const accountsRes = await fetch(base + '/api/accounts')
    const raw = await accountsRes.text()
    const accounts = JSON.parse(raw) as Array<Record<string, string>>
    const bob = accounts.find((a) => a.login === 'bob')
    expect(bob).toBeTruthy()
    expect(bob!.salt).toBeTruthy()
    expect(bob!.passHash).toBeTruthy()
    expect(bob).not.toHaveProperty('password')
    expect(raw).not.toContain('secret-pw')
  })
})
