// In-memory AccountStore for unit tests and demos. (spec §5)
import type { Account, AccountStore } from './types'

export class InMemoryAccountStore implements AccountStore {
  private readonly accounts: Account[] = []

  findByLogin(loginLower: string): Account | undefined {
    return this.accounts.find((a) => a.loginLower === loginLower)
  }

  add(account: Account): void {
    this.accounts.push(account)
  }

  all(): readonly Account[] {
    return this.accounts
  }
}
