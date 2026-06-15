# Auth — User Registration & Login (PRD)

## Overview
A new visitor can create an account with their personal details and a unique login, then later authenticate with that login and password. This covers account creation and credential verification only; the technical design (hashing, storage, session mechanics) lives in the architect's spec.md.

## Goals
- Let a new user register an account that uniquely identifies them by their chosen login.
- Let a returning user prove their identity by login + password.
- Keep passwords secret — never stored or exposed in a recoverable form.

## Actor(s)
- **Visitor** — an unauthenticated person creating an account or logging in.

## User stories
- As a visitor, I can register with my name, surname, country, a unique login, and a password so that I have an account.
- As a visitor, I can log in with my login and password so that I can be recognized as that account.
- As a visitor, I am told when my chosen login is already taken so that I can pick another.

## Data model

Account:

| Field | Required | Rules |
|-------|----------|-------|
| name | yes | Non-empty after trimming whitespace. |
| surname | yes | Non-empty after trimming whitespace. |
| country | yes | Non-empty after trimming whitespace. |
| login | yes | Non-empty; unique across all accounts (case-insensitive); min 3 characters. |
| password | yes | Min 8 characters; stored only in a non-recoverable (hashed) form, never in plaintext. |

## Functional requirements

**Registration**
1. The system accepts a registration request containing name, surname, country, login, and password.
2. The system rejects the request if any required field is missing or empty (after trimming), creating no account and reporting which field(s) failed.
3. The system rejects a login shorter than 3 characters or a password shorter than 8 characters, creating no account.
4. The system rejects a registration whose login already exists (compared case-insensitively), creating no account and reporting that the login is taken.
5. On a valid, non-duplicate request, the system creates exactly one account and reports success.
6. The system never persists or returns the password in plaintext; it stores only a non-recoverable representation.

**Login**
7. The system accepts a login request containing a login and a password.
8. The system grants authentication only when an account with that login (matched case-insensitively) exists AND the supplied password matches the stored credential.
9. The system rejects authentication when the login is unknown OR the password is wrong, returning the same generic failure in both cases (it does not reveal which was incorrect).
10. A successful login identifies the matched account; a failed login identifies no account.

## Acceptance criteria
1. Given valid name, surname, country, a never-used login, and an 8+ character password, when a visitor registers, then exactly one account is created and success is reported.
2. Given a registration request missing any one of name, surname, country, login, or password, when submitted, then registration is rejected, no account is created, and the missing field is identified.
3. Given an existing account with login `alice`, when a visitor registers with login `Alice` (differing only in case), then registration is rejected as a duplicate and no second account is created.
4. Given a registration with a login under 3 characters or a password under 8 characters, when submitted, then registration is rejected and no account is created.
5. Given a successfully registered account, when its stored data is inspected, then the password does not appear in plaintext anywhere it is stored.
6. Given a registered account with login `bob` and password `secret-pw`, when a visitor logs in with `bob` / `secret-pw` (login matched case-insensitively), then authentication succeeds and identifies that account.
7. Given a registered account with login `bob`, when a visitor logs in with `bob` and a wrong password, then authentication fails with a generic error and identifies no account.
8. Given no account with login `ghost`, when a visitor logs in with `ghost` and any password, then authentication fails with the same generic error as a wrong-password attempt.

## Out of scope
- Sessions, tokens/JWT, cookies, or "stay logged in" — login returns only success/identity, not a session.
- Email or phone verification, and email as a required field.
- Password reset / change / "forgot password".
- Account lockout, rate limiting, CAPTCHA, and brute-force protection.
- Roles, permissions, or any post-login authorization.
- UI / forms / screens — this PRD is behavior-only.
- Validating `country` against an official country list (ISO codes, etc.).
- Editing or deleting an account after creation.

## Assumptions (flag if wrong)
- `login` is a username string, not necessarily an email address; no format constraint beyond non-empty + min 3 characters.
- Login uniqueness and login matching are **case-insensitive** (`Alice` == `alice`).
- "Stored securely" means a one-way salted hash; the specific algorithm is the architect's choice. Passwords are never logged or returned by any operation.
- Minimums chosen in the absence of a stated rule: login ≥ 3 chars, password ≥ 8 chars. No max length or complexity (uppercase/symbol/number) rules are imposed.
- `country` is a free-text non-empty string.
- All fields are trimmed of surrounding whitespace before validation.
- One person may hold multiple accounts as long as each login is unique (no name/surname uniqueness).
