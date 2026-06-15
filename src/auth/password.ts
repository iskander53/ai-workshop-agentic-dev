// STUB (tester) — signatures only; dev implements with node:crypto scrypt. (spec §5)
import type { StoredCredential } from './types'

export function hashPassword(password: string): StoredCredential {
  throw new Error('not implemented')
}

export function verifyPassword(password: string, cred: StoredCredential): boolean {
  throw new Error('not implemented')
}
