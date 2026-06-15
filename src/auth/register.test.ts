import { describe, it, expect } from 'vitest'
import { AuthService } from './authService'
import { InMemoryAccountStore } from './accountStore'
import * as messages from './messages'
import type { RegistrationInput } from './types'

const valid: RegistrationInput = {
  name: 'Ada',
  surname: 'Lovelace',
  country: 'United Kingdom',
  login: 'ada_l',
  password: 'password1',
}

function freshService() {
  const store = new InMemoryAccountStore()
  return { store, service: new AuthService(store) }
}

describe('AuthService.register (Test plan 1, 5, 6)', () => {
  // Item 1 — register success.
  it('creates exactly one account and returns the public account (item 1)', () => {
    const { store, service } = freshService()
    const res = service.register({ ...valid, name: '  Ada  ', login: '  ada_l  ' })

    expect(res.ok).toBe(true)
    expect(store.all()).toHaveLength(1)
    if (res.ok) {
      expect(res.account.name).toBe('Ada') // trimmed
      expect(res.account.login).toBe('ada_l') // trimmed
      expect(res.account.country).toBe('United Kingdom')
      // PublicAccount must not expose any credential material.
      expect(res.account).not.toHaveProperty('credential')
      expect(res.account).not.toHaveProperty('loginLower')
      expect(res.account).not.toHaveProperty('password')
    }
  })

  // Item 2/4 (store side) — rejected input creates no account.
  it('creates no account when a required field is missing (item 2)', () => {
    const { store, service } = freshService()
    const res = service.register({ ...valid, country: '   ' })
    expect(res.ok).toBe(false)
    expect(store.all()).toHaveLength(0)
  })

  // Item 5 — duplicate login is case-insensitive.
  it('rejects a duplicate login differing only in case, keeping one account (item 5)', () => {
    const { store, service } = freshService()
    const first = service.register({ ...valid, login: 'alice' })
    expect(first.ok).toBe(true)

    const second = service.register({ ...valid, login: 'Alice' })
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.errors.login).toBe(messages.LOGIN_TAKEN)
    }
    expect(store.all()).toHaveLength(1)
  })

  // Item 6 — password is never stored in plaintext.
  it('stores a salted hash, never the plaintext password (item 6)', () => {
    const { store, service } = freshService()
    const password = 'super-secret-pw'
    const res = service.register({ ...valid, login: 'bob', password })
    expect(res.ok).toBe(true)

    const stored = store.all()[0]
    expect(stored.credential.salt).toBeTruthy()
    expect(stored.credential.hash).toBeTruthy()
    expect(stored.credential.hash).not.toBe(password)
    // The plaintext must appear nowhere in the persisted record.
    expect(JSON.stringify(stored)).not.toContain(password)
  })
})
