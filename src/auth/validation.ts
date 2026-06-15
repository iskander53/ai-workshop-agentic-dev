// Field-level registration rules (required + min-length). No store access. (spec §5)
import type { Field, FieldErrors, RegistrationInput } from './types'
import { LOGIN_TOO_SHORT, PASSWORD_TOO_SHORT, required } from './messages'

const FIELDS: Field[] = ['name', 'surname', 'country', 'login', 'password']
const LOGIN_MIN = 3
const PASSWORD_MIN = 8

export function validateRegistration(input: RegistrationInput): FieldErrors {
  const errors: FieldErrors = {}

  for (const field of FIELDS) {
    if (input[field].trim() === '') {
      errors[field] = required(field)
    }
  }

  if (errors.login === undefined && input.login.trim().length < LOGIN_MIN) {
    errors.login = LOGIN_TOO_SHORT
  }
  if (errors.password === undefined && input.password.trim().length < PASSWORD_MIN) {
    errors.password = PASSWORD_TOO_SHORT
  }

  return errors
}
