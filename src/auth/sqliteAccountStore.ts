// SQLite-backed AccountStore via node:sqlite DatabaseSync (production default). (spec §5)
// The single place the SQLite driver is referenced — swap point for better-sqlite3 etc.
import { DatabaseSync } from 'node:sqlite'
import type { Account, AccountStore } from './types'

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  surname     TEXT NOT NULL,
  country     TEXT NOT NULL,
  login       TEXT NOT NULL,
  login_lower TEXT NOT NULL UNIQUE,
  salt        TEXT NOT NULL,
  hash        TEXT NOT NULL
);`

interface AccountRow {
  id: string
  name: string
  surname: string
  country: string
  login: string
  login_lower: string
  salt: string
  hash: string
}

export class SqliteAccountStore implements AccountStore {
  private readonly db: DatabaseSync

  constructor(database: string | DatabaseSync = ':memory:') {
    this.db = typeof database === 'string' ? new DatabaseSync(database) : database
    this.db.exec(CREATE_TABLE)
  }

  findByLogin(loginLower: string): Account | undefined {
    const row = this.db
      .prepare('SELECT * FROM accounts WHERE login_lower = ?')
      .get(loginLower) as unknown as AccountRow | undefined
    return row ? toAccount(row) : undefined
  }

  add(account: Account): void {
    this.db
      .prepare(
        `INSERT INTO accounts (id, name, surname, country, login, login_lower, salt, hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        account.id,
        account.name,
        account.surname,
        account.country,
        account.login,
        account.loginLower,
        account.credential.salt,
        account.credential.hash,
      )
  }

  all(): readonly Account[] {
    const rows = this.db.prepare('SELECT * FROM accounts').all() as unknown as AccountRow[]
    return rows.map(toAccount)
  }

  close(): void {
    this.db.close()
  }
}

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    surname: row.surname,
    country: row.country,
    login: row.login,
    loginLower: row.login_lower,
    credential: { salt: row.salt, hash: row.hash },
  }
}
