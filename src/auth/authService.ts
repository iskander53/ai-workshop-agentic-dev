// Register/login orchestration over an injected AccountStore. (spec §5)
import { randomUUID } from 'node:crypto'
import type {
  Account,
  AccountStore,
  Credentials,
  LoginResult,
  PublicAccount,
  RegisterResult,
  RegistrationInput,
} from './types'
import { InMemoryAccountStore } from './accountStore'
import { SqliteAccountStore } from './sqliteAccountStore'
import { validateRegistration } from './validation'
import { hashPassword, verifyPassword } from './password'
import { LOGIN_FAILED, LOGIN_TAKEN } from './messages'

export const DEFAULT_DB_PATH = 'auth.db'

export class AuthService {
  private readonly store: AccountStore

  constructor(store: AccountStore = new InMemoryAccountStore()) {
    this.store = store
  }

  register(input: RegistrationInput): RegisterResult {
    const errors = validateRegistration(input)

    if (Object.keys(errors).length === 0) {
      const loginLower = input.login.trim().toLowerCase()
      if (this.store.findByLogin(loginLower)) {
        errors.login = LOGIN_TAKEN
      }
    }

    if (Object.keys(errors).length > 0) {
      return { ok: false, errors }
    }

    const login = input.login.trim()
    const account: Account = {
      id: randomUUID(),
      name: input.name.trim(),
      surname: input.surname.trim(),
      country: input.country.trim(),
      login,
      loginLower: login.toLowerCase(),
      credential: hashPassword(input.password),
    }
    this.store.add(account)
    return { ok: true, account: toPublic(account) }
  }

  login(creds: Credentials): LoginResult {
    const account = this.store.findByLogin(creds.login.trim().toLowerCase())
    if (!account || !verifyPassword(creds.password, account.credential)) {
      return { ok: false, error: LOGIN_FAILED }
    }
    return { ok: true, account: toPublic(account) }
  }
}

function toPublic(a: Account): PublicAccount {
  return { id: a.id, name: a.name, surname: a.surname, country: a.country, login: a.login }
}

export function createAuthService(dbPath: string = DEFAULT_DB_PATH): AuthService {
  return new AuthService(new SqliteAccountStore(dbPath))
}
