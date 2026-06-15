// Salted, one-way password hashing via node:crypto scrypt. (spec §5)
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { StoredCredential } from './types'

const KEY_LEN = 64
const SALT_BYTES = 16

export function hashPassword(password: string): StoredCredential {
  const salt = randomBytes(SALT_BYTES).toString('hex')
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password: string, cred: StoredCredential): boolean {
  const expected = Buffer.from(cred.hash, 'hex')
  if (expected.length !== KEY_LEN) return false
  const actual = scryptSync(password, cred.salt, KEY_LEN)
  return timingSafeEqual(actual, expected)
}
