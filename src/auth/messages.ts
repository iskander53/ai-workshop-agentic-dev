// User-facing message catalog (spec §5). This is contract data the tests assert
// against (spec §4: "tests assert against names, not string literals"), so it is
// provided in full rather than stubbed.
import type { Field } from './types'

export const LOGIN_TOO_SHORT = 'Login must be at least 3 characters.'
export const PASSWORD_TOO_SHORT = 'Password must be at least 8 characters.'
export const LOGIN_TAKEN = 'That login is already taken.'
export const LOGIN_FAILED = "That login and password don't match."

export function required(field: Field): string {
  const label = field.charAt(0).toUpperCase() + field.slice(1)
  return `${label} is required.`
}
