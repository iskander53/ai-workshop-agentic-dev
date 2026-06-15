import { describe, it, expect, beforeEach } from 'vitest'
import { AuthService } from './authService'
import { InMemoryAccountStore } from './accountStore'
import * as messages from './messages'

const PASSWORD = 'secret-pw'

let service: AuthService

beforeEach(() => {
  service = new AuthService(new InMemoryAccountStore())
  // Registered with mixed-case login to prove case-insensitive matching + casing preservation.
  const reg = service.register({
    name: 'Bob',
    surname: 'Stone',
    country: 'US',
    login: 'Bob',
    password: PASSWORD,
  })
  expect(reg.ok).toBe(true)
})

describe('AuthService.login (Test plan 7, 8, 9)', () => {
  // Item 7 — success, case-insensitive.
  it('authenticates with a case-insensitive login and identifies the account (item 7)', () => {
    const res = service.login({ login: 'BOB', password: PASSWORD })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.account.login).toBe('Bob') // original stored casing
      expect(res.account.name).toBe('Bob')
    }
  })

  // Item 8 — wrong password is a generic failure with no account.
  it('rejects a wrong password with the generic message and no account (item 8)', () => {
    const res = service.login({ login: 'Bob', password: 'wrong-pw' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe(messages.LOGIN_FAILED)
    }
    expect(res).not.toHaveProperty('account')
  })

  // Item 9 — unknown login fails identically to a wrong password (no enumeration).
  it('rejects an unknown login with the same generic message as a wrong password (item 9)', () => {
    const unknown = service.login({ login: 'ghost', password: 'whatever' })
    const wrongPw = service.login({ login: 'Bob', password: 'wrong-pw' })

    expect(unknown.ok).toBe(false)
    expect(wrongPw.ok).toBe(false)
    if (!unknown.ok && !wrongPw.ok) {
      expect(unknown.error).toBe(messages.LOGIN_FAILED)
      // Byte-for-byte identical — the response must not reveal which field was wrong.
      expect(unknown.error).toBe(wrongPw.error)
    }
  })
})
