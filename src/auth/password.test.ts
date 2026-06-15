import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password hashing (Test plan 10)', () => {
  it('verifies a password against its own hash, and rejects a wrong one (item 10)', () => {
    const password = 'correct horse battery staple'
    const cred = hashPassword(password)

    expect(verifyPassword(password, cred)).toBe(true)
    expect(verifyPassword('wrong password', cred)).toBe(false)
  })

  it('never returns the plaintext as the hash (item 10)', () => {
    const password = 'correct horse battery staple'
    const cred = hashPassword(password)
    expect(cred.hash).not.toBe(password)
    expect(cred.salt).toBeTruthy()
    expect(cred.hash).toBeTruthy()
  })

  it('uses a random salt — two hashes of the same password differ (item 10)', () => {
    const password = 'correct horse battery staple'
    const a = hashPassword(password)
    const b = hashPassword(password)
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })
})
