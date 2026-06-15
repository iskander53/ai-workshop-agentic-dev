import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SqliteAccountStore } from './sqliteAccountStore'
import { AuthService } from './authService'
import * as messages from './messages'
import type { Account } from './types'

function account(over: Partial<Account>): Account {
  return {
    id: 'id-default',
    name: 'Ada',
    surname: 'Lovelace',
    country: 'United Kingdom',
    login: 'ada',
    loginLower: 'ada',
    credential: { salt: 'deadbeef', hash: 'cafef00d' },
    ...over,
  }
}

describe('SqliteAccountStore (Test plan 11, 12)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'auth-sqlite-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  // Item 11 — data survives across store instances on the same file.
  it('persists accounts across store instances on the same DB file (item 11)', () => {
    const dbPath = join(dir, 'auth.db')
    const acct = account({ id: 'id-1', login: 'ada', loginLower: 'ada' })

    const store1 = new SqliteAccountStore(dbPath)
    store1.add(acct)
    store1.close()

    const store2 = new SqliteAccountStore(dbPath)
    const found = store2.findByLogin('ada')
    store2.close()

    expect(found).toEqual(acct) // all fields incl. credential.salt/hash mapped faithfully
  })

  // Item 12 — the UNIQUE(login_lower) constraint rejects duplicates at the DB level.
  it('enforces unique login_lower at the DB level (item 12)', () => {
    const store = new SqliteAccountStore(':memory:')
    store.add(account({ id: '1', login: 'sam', loginLower: 'sam' }))

    // Same loginLower, different id/casing — must be rejected by the DB.
    expect(() => store.add(account({ id: '2', login: 'Sam', loginLower: 'sam' }))).toThrow()
    expect(store.all()).toHaveLength(1)
    store.close()
  })
})

describe('AuthService over SqliteAccountStore (Test plan 13)', () => {
  // Item 13 — end-to-end register/login against the real store.
  it('registers and authenticates end-to-end on SQLite (item 13)', () => {
    const store = new SqliteAccountStore(':memory:')
    const service = new AuthService(store)

    const reg = service.register({
      name: 'Bob',
      surname: 'Stone',
      country: 'US',
      login: 'bob',
      password: 'secret-pw',
    })
    expect(reg.ok).toBe(true)

    const good = service.login({ login: 'BOB', password: 'secret-pw' })
    expect(good.ok).toBe(true)
    if (good.ok) expect(good.account.login).toBe('bob')

    expect(service.login({ login: 'bob', password: 'nope' })).toMatchObject({
      ok: false,
      error: messages.LOGIN_FAILED,
    })
    expect(service.login({ login: 'ghost', password: 'x' })).toMatchObject({
      ok: false,
      error: messages.LOGIN_FAILED,
    })

    const dup = service.register({
      name: 'Bob',
      surname: 'Other',
      country: 'US',
      login: 'Bob',
      password: 'another-pw',
    })
    expect(dup.ok).toBe(false)
    if (!dup.ok) expect(dup.errors.login).toBe(messages.LOGIN_TAKEN)

    store.close()
  })
})
