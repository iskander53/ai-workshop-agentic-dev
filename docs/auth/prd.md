# Auth — Registration & Login (PRD)

## Overview
A simple user **registration** and **login** flow. A new user signs up with their
personal details and credentials; an existing user logs in with those credentials.

This document describes *what* the feature must do (behavior & rules). The technical
design — modules, classes, password-hashing choice, storage — is the architect's job in `spec.md`.

## Goals
- Let a person create an account with their details and a unique login.
- Let a returning person authenticate with their login + password.
- Store passwords **securely** (hashed, never plaintext, never returned).

## User
A single actor: an **end user** registering and signing in. No admin/roles in scope.

## User stories
- As a new user, I can register with my name, surname, country, a unique login, and a password.
- As a registered user, I can log in with my login and password.
- As a user, I’m confident my password is never stored or exposed in plaintext.

## Data model — a user
| Field | Required | Rules |
|-------|----------|-------|
| `name` | yes | non-empty, 1–100 chars |
| `surname` | yes | non-empty, 1–100 chars |
| `country` | yes | non-empty string (see Assumptions — free-form for now) |
| `login` | yes | **unique**, 3–30 chars, letters/digits/`. _ -`; uniqueness & matching are **case-insensitive** |
| `password` | yes | min 8 chars; **stored hashed**, never persisted or returned in plaintext |

## Functional requirements

### Registration
1. With valid data and an unused login, create the user and return their **public profile** (`name`, `surname`, `country`, `login`) — **never** the password or its hash.
2. If the `login` is already taken (case-insensitive), reject with a clear "login already taken" error; no user is created.
3. If any field is missing or violates its rule, reject with a validation error identifying the offending field(s); no user is created.
4. The stored password must be a hash produced by a strong algorithm — the persisted value must differ from the input and not be reversible. (Algorithm choice is the architect's.)

### Login
5. With a correct `login` + `password`, authenticate and return the user’s public profile (plus a simple session token — see Assumptions).
6. With a wrong password, reject with a **generic** "invalid credentials" error.
7. With a non-existent login, reject with the **same** generic "invalid credentials" error — do not reveal whether the login exists (no user enumeration).
8. Login matches the `login` field case-insensitively, consistent with registration.

## Acceptance criteria
These drive the architect's Test plan and the tester's failing tests:
1. Register with valid data → user created; returned profile has no password/hash.
2. Register with an already-taken login (different case) → rejected as duplicate; no second user.
3. Register with a missing/invalid field → validation error naming the field; no user created.
4. After registration, the stored password value is a hash (≠ the plaintext input).
5. No returned object (registration or login) ever contains the password or its hash.
6. Login with correct credentials → success, returns the public profile.
7. Login with a wrong password → generic "invalid credentials".
8. Login with a non-existent login → the **same** generic "invalid credentials".
9. Login is case-insensitive on `login`.

## Out of scope
Email/identity verification, password reset/change, social/OAuth login, full session
lifecycle (refresh/logout/expiry), rate limiting & lockout, account roles/permissions,
and any specific database/persistence technology.

## Assumptions (flag if wrong)
- **Storage:** behind a simple repository abstraction; an in-memory implementation is fine for this flow (the architect decides; tests rely on it). No real DB in scope.
- **Session:** login returns a simple opaque token as a placeholder; real session management is out of scope.
- **Country:** a free-form non-empty string for now (could later be constrained to an ISO‑3166 list).
- **Surface:** a service/function-level API (in-process). No HTTP layer/endpoints unless the architect adds them.
