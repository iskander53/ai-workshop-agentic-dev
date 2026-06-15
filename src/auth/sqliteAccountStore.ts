// STUB (tester) — signatures only; dev implements with node:sqlite DatabaseSync. (spec §5)
// `import type` is erased at runtime, so node:sqlite is not loaded by the stub.
import type { DatabaseSync } from 'node:sqlite'
import type { Account, AccountStore } from './types'

export class SqliteAccountStore implements AccountStore {
  constructor(database: string | DatabaseSync = ':memory:') {
    // dev: open DatabaseSync (if path) + ensure schema (CREATE TABLE IF NOT EXISTS)
  }

  findByLogin(loginLower: string): Account | undefined {
    throw new Error('not implemented')
  }

  add(account: Account): void {
    throw new Error('not implemented')
  }

  all(): readonly Account[] {
    throw new Error('not implemented')
  }

  close(): void {
    throw new Error('not implemented')
  }
}
