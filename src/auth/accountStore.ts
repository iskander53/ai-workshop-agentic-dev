// STUB (tester) — signatures only; dev implements the in-memory store. (spec §5)
import type { Account, AccountStore } from './types'

export class InMemoryAccountStore implements AccountStore {
  findByLogin(loginLower: string): Account | undefined {
    throw new Error('not implemented')
  }

  add(account: Account): void {
    throw new Error('not implemented')
  }

  all(): readonly Account[] {
    throw new Error('not implemented')
  }
}
