// STUB (tester) — signatures only; dev implements register/login orchestration. (spec §5)
import type {
  AccountStore,
  Credentials,
  LoginResult,
  RegisterResult,
  RegistrationInput,
} from './types'
import { InMemoryAccountStore } from './accountStore'
import { SqliteAccountStore } from './sqliteAccountStore'

export const DEFAULT_DB_PATH = 'auth.db'

export class AuthService {
  constructor(store: AccountStore = new InMemoryAccountStore()) {
    // dev: retain the store for register/login
  }

  register(input: RegistrationInput): RegisterResult {
    throw new Error('not implemented')
  }

  login(creds: Credentials): LoginResult {
    throw new Error('not implemented')
  }
}

export function createAuthService(dbPath: string = DEFAULT_DB_PATH): AuthService {
  return new AuthService(new SqliteAccountStore(dbPath))
}
