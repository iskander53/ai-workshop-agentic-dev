import { describe, it, expect } from 'vitest'
import { validateRegistration } from '../../../src/auth/validation'
import * as messages from '../../../src/auth/messages'
import type { Field, RegistrationInput } from '../../../src/auth/types'

const valid: RegistrationInput = {
  name: 'Ada',
  surname: 'Lovelace',
  country: 'United Kingdom',
  login: 'ada_l',
  password: 'password1',
}

describe('validateRegistration (Test plan 2, 3, 4)', () => {
  it('returns no errors for fully valid input', () => {
    expect(validateRegistration(valid)).toEqual({})
  })

  // Item 2 — required fields. name/surname/country have only the required rule,
  // so we can assert the exact message. login/password also carry length rules,
  // so for an empty value we only assert *an* error is reported (precedence-agnostic).
  for (const field of ['name', 'surname', 'country'] as const) {
    it(`reports "${field} is required" when ${field} is whitespace-only (item 2)`, () => {
      const errs = validateRegistration({ ...valid, [field]: '   ' })
      expect(errs[field]).toBe(messages.required(field))
    })
  }

  for (const field of ['login', 'password'] as Field[]) {
    it(`reports an error when ${field} is empty (item 2)`, () => {
      const errs = validateRegistration({ ...valid, [field]: '' })
      expect(errs[field]).toBeTruthy()
    })
  }

  // Item 3 — login min length 3.
  it.each(['a', 'ab'])('rejects login %j as too short (item 3)', (login) => {
    const errs = validateRegistration({ ...valid, login })
    expect(errs.login).toBe(messages.LOGIN_TOO_SHORT)
  })

  it('accepts a 3-character login (item 3)', () => {
    const errs = validateRegistration({ ...valid, login: 'abc' })
    expect(errs.login).toBeUndefined()
  })

  // Item 4 — password min length 8.
  it('rejects a 7-character password as too short (item 4)', () => {
    const errs = validateRegistration({ ...valid, password: '1234567' })
    expect(errs.password).toBe(messages.PASSWORD_TOO_SHORT)
  })

  it('accepts an 8-character password (item 4)', () => {
    const errs = validateRegistration({ ...valid, password: '12345678' })
    expect(errs.password).toBeUndefined()
  })
})
