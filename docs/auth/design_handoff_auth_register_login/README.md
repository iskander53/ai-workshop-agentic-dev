# Handoff: Auth — User Registration & Login

## Overview
A two-mode authentication surface — **Register** and **Log in** — built from the "Auth — User Registration & Login" PRD. A visitor creates an account (name, surname, country, a unique login, a password) and later authenticates with login + password. The prototype implements the PRD's *behavior* faithfully (validation, case-insensitive unique logins, securely-hashed passwords, generic login failures) on top of a bold pink/yellow visual direction.

There is also a **storage inspector** (a developer/demo affordance) that surfaces exactly what is persisted, to make the "password is never stored in plaintext" requirement tangible.

---

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — a prototype showing intended look and behavior. **They are not production code to copy directly.** The task is to **recreate this design in the target codebase's existing environment** (React, Vue, Svelte, SwiftUI, native, etc.) using its established components, form library, validation approach, and styling system. If no environment exists yet, pick the most appropriate framework for the project and implement there.

Critically: the prototype hashes passwords **client-side in the browser** and stores accounts in **`localStorage`** purely to *demonstrate* the PRD behavior in a static file. **Do not ship that.** Real implementations must do credential hashing and storage **server-side** per the architect's `spec.md`. Treat the client logic here as an executable description of the *rules*, not the *architecture*.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, border treatments, interaction and error states are all specified below. Recreate the UI to match, using the codebase's existing primitives where they exist (inputs, buttons, drawer/modal). The exact hex/spacing/type values are provided so you can map them onto design tokens or match them directly.

---

## Screenshots
Reference renders of each state are in **`screenshots/`**:
- `01-register.png` — Register form (default view)
- `02-login-error.png` — Login form showing the generic failure banner
- `03-success.png` — Success / identified-account view (post-register)
- `04-storage-inspector.png` — Storage inspector drawer (proves salt + hash, no plaintext)

---

## Screens / Views

The whole experience is **one centered card** (max-width `1040px`, min-height `600px`) split into two columns: a **brand panel** (left) and a **form panel** (right). The card has a `3px` solid ink border, `22px` radius, and a hard offset shadow `8px 8px 0 #1A1208`. There are three logical views inside the right panel: **Register form**, **Login form**, and **Success**. A floating **Inspect storage** button and slide-in **drawer** sit above everything.

Grid: `grid-template-columns: 0.92fr 1fr` (brand slightly narrower than form). Below `860px` it collapses to a single column (brand stacks on top, becomes a banner with `min-height: 240px`).

### 1. Brand panel (persistent, left column)
- **Purpose**: Sets tone and states the rules up front.
- **Background**: solid `--pink` (`#FF2E7E`), white text, `3px` ink right border (bottom border when stacked).
- **Decoration** (purely decorative, absolutely positioned, `pointer-events: none`):
  - Yellow filled circle, `220×220`, `3px` ink border, top-right, offset off-canvas (`right:-70px; top:-70px`).
  - Translucent white ring, `150×150`, `16px` border `color-mix(#fff 18%, transparent)`, `left:-58px; top:168px`.
  - Small ink dot `16×16` at `left:116px; top:250px`.
- **Kicker pill**: text "ACCOUNTS", `12px`/700/uppercase, letter-spacing `0.16em`, ink background, yellow text, with a `7px` yellow dot before it; `100px` radius, padding `7px 13px`.
- **Headline** (`.brand__title`): display font, 800, `clamp(38px, 5vw, 60px)`, line-height `0.92`, letter-spacing `-0.02em`. Copy depends on mode:
  - Register: "Make it **yours.**"
  - Login: "Welcome **back.**"
  - The emphasized word is wrapped in a yellow highlight box (ink text, `#FFDD2D` background, `8px` radius, `0 10px` padding, `box-decoration-break: clone`).
- **Subhead** (`.brand__sub`): `15.5px`, line-height `1.5`, max-width `30ch`, white at 92% opacity.
  - Register: "One login, one password. Pick a name nobody else has and you're in."
  - Login: "Your login and password are all it takes. We never stored the password itself."
- **Footer rules** (`.brand__foot`): three rows, each a `26px` yellow numbered circle (ink border, display font 800 `13px`) + `13.5px`/500 white text:
  1. "Unique, case-insensitive logins"
  2. "3+ char login · 8+ char password"
  3. "Passwords saved as a one-way hash"

### 2. Register form (right column, default view)
- **Purpose**: Create exactly one account.
- **Tabs** (`.tabs`): pill segmented control, two tabs "Register" / "Log in". Container: `--paper-2` bg, `2.5px` ink border, `100px` radius, `4px` padding. Selected tab: ink background, yellow text. Unselected hover: yellow tint. `white-space: nowrap`.
- **Heading**: title (display, 700, `30px`, letter-spacing `-0.02em`) "Create your account"; lead (`14.5px`, ink @ 68%) "Five details and a login nobody else has taken."
- **Fields** (top→bottom), `14px` vertical gap:
  - Row of two (`grid 1fr 1fr`): **First name** (placeholder "Ada"), **Surname** (placeholder "Lovelace").
  - **Country** (full width, placeholder "United Kingdom").
  - **Login** (full width, placeholder "ada_l", right-aligned hint "unique · min 3").
  - **Password** (full width, `type=password`, placeholder "••••••••", hint "min 8", with an inline **Show/Hide** toggle button).
- **Submit button** (`.submit`): yellow bg, `3px` ink border, display font 800 `17px`, label "Create account →", hard shadow `4px 4px 0 ink`. Hover nudges up-left and grows shadow; active presses down (`translate(2px,2px)`, shadow `1px 1px 0`). While submitting: label "Creating…", `disabled`.
- **Swap line**: "Already have one? **Log in instead**" (the link is a pink-deep underlined button).

### 3. Login form (right column)
- **Purpose**: Authenticate an existing account.
- **Tabs/heading** as above; title "Log in", lead "Use the login and password you registered with."
- **Generic error banner** (`.formflash--err`, only when present): appears at top of form. Pink-tinted bg, `2.5px` ink border, `13.5px`/600 pink-deep text, with a circular `!` badge. Copy: "That login and password don't match." (shown identically for unknown login *and* wrong password). For empty submit: "Enter your login and password."
- **Fields**: **Login** (placeholder "ada_l"), **Password** (`type=password`, Show/Hide).
- **Submit**: "Log in →" / busy "Checking…".
- **Swap line**: "No account yet? **Create one**".

### 4. Field component (`.field`)
- Label: `12.5px`/700, with optional right-aligned `.hint` (`11.5px`/500, ink @ 50%).
- Input: white bg, `2.5px` ink border, `14px` radius, padding `12px 14px`, `15px`/500 text. Placeholder ink @ 38%.
- **Focus**: no outline; hard shadow `4px 4px 0 --pink`.
- **Error state** (`.field--bad`): border becomes `--pink-deep`, bg a faint pink tint, and a `.field__err` message appears below — `12px`/600 pink-deep, prefixed with a small `▲` glyph.
- **Password reveal**: `.pw-toggle` button pinned right-inside the input, `--paper-2` bg → yellow on hover, label toggles "Show"/"Hide" (`tabIndex={-1}` so it's skipped in tab order).

### 5. Success view (replaces the form after register or login)
- **Badge**: `64×64` yellow circle, `3px` ink border, hard shadow, display-font `✓`.
- **Title** (display, 800, `34px`): "You're in, **{firstName}**." (register) or "Hello again, **{firstName}**." (login). Name is in `--pink-deep`.
- **Lead** (`15px`, ink @ 70%, max-width `34ch`):
  - Register: "Your account is live. This is the identity the system now recognizes you by."
  - Login: "Authentication succeeded. The system matched your login to exactly one account."
- **Meta chips** (`.chip`): three pills (paper-2 bg, `2px` ink border, `100px` radius) — `login`, `name` (first + surname), `country`. Each has a small uppercase label in ink @ 55%.
- **Back button** (`.ghostbtn`): white bg, ink border, hard shadow, "← Back to start" → returns to the form view.

### 6. Storage inspector (floating, demo/dev affordance)
- **Toggle** (`.inspector-toggle`): fixed bottom-right pill, ink bg, yellow text, hard shadow. Label "Inspect storage" + a pink count badge of stored accounts.
- **Drawer** (`.drawer`): right-side slide-in, `min(440px, 92vw)` wide, paper bg, `3px` ink left border; dim scrim behind (`color-mix(ink 38%, transparent)`), closes on scrim click or `×`.
  - Header: "What's actually stored" + explanatory line about salt + one-way hash.
  - Per account card (`.acct`): login title + "account #N" tag, then a monospace (`Space Mono`) key/value dump: `name`, `surname`, `country`, `login`, then **`password: ✗ not stored`** (pink), `salt:` (hex), and **`passHash:`** (green, full SHA-256 hex). This visibly proves no plaintext password is persisted.
  - Empty state: "Nothing yet / Register an account to see how it's stored."
  - Footer: **+ Seed demo account** (creates `bob` / `secret-pw`) and **Clear all** (pink danger button).

---

## Interactions & Behavior

### Navigation
- Tabs switch between Register and Login; switching resets to the form view and clears any success session.
- Submitting a valid register or a successful login transitions the right panel to the **Success** view.
- "Back to start" returns to the form view (same mode).
- Swap links ("Log in instead" / "Create one") switch modes.

### Registration validation (run on submit, before any account is created)
All fields are **trimmed** before validation. Errors are reported **per field** (the field that failed is identified):
1. Each of `name`, `surname`, `country`, `login`, `password` is required → "{Label} is required." if empty after trim.
2. `login` < 3 chars → "Login must be at least 3 characters."
3. `password` < 8 chars → "Password must be at least 8 characters."
4. `login` already exists (compared **case-insensitively**) → "“{login}” is already taken — try another."
5. Only when **zero** errors: create exactly one account, then show Success.

### Login authentication
1. Requires non-empty login and password (else "Enter your login and password.").
2. Look up account by `loginLower === input.trim().toLowerCase()` (**case-insensitive match**).
3. If found, hash the supplied password with that account's stored `salt` and compare to stored `passHash`.
4. Grant only when an account exists **and** the hash matches.
5. **Generic failure** ("That login and password don't match.") for BOTH unknown login and wrong password — never reveal which was wrong.
6. Success identifies exactly the matched account; failure identifies none.

### Password handling (security rule — re-implement server-side)
- On register: generate a random 16-byte salt (hex), compute `SHA-256(salt + ":" + password)`, store **only** `salt` + `passHash`. The plaintext password is never persisted or returned.
- The prototype uses Web Crypto `crypto.subtle.digest` client-side **for demo only**. In production, hashing and the credential store belong on the server, and you should use a slow password hash (bcrypt/scrypt/Argon2) rather than a bare SHA-256 — follow the architect's `spec.md`.

### Animations / states
- Buttons: `transform`/`box-shadow` transition ~`0.1s ease` for the press effect; inputs transition border/shadow ~`0.12s`.
- Submit buttons show a busy label and `disabled` during the async hash.
- No page-level entrance animations.

### Responsive
- ≤ `860px`: card becomes single column, brand panel becomes a top banner, panel padding reduces to `28px 24px 30px`, body padding `16px`.

---

## State Management
State lives in the top-level `App` component (see `app.jsx`):
- `mode`: `"register" | "login"` — which form is shown.
- `view`: `"form" | "success"` — form vs. success screen.
- `session`: `{ account, via }` — the identified account and whether it came from `"register"` or `"login"`.
- `inspectorOpen`: boolean — drawer visibility.
- `accounts`: array of stored account objects (mirrors `localStorage`).

Form-local state (in `RegisterForm` / `LoginForm`):
- `values` (field map), `errors` (field→message map), `busy` (async submit), and a `reveal` boolean per password field.

**Data fetching**: none in the prototype (localStorage). In the real app: a `POST /register` (returns success or field/duplicate errors) and a `POST /login` (returns success + account identity, or a single generic failure). No session/token is returned per the PRD — that's out of scope.

Account object shape (storage demo):
```
{ name, surname, country, login, loginLower, salt, passHash, createdAt }
```

---

## Design Tokens

### Colors
| Token | Value | Use |
|------|-------|-----|
| `--pink` | `#FF2E7E` | Brand panel bg, primary accent, focus shadow |
| `--pink-deep` | `#E11D6B` (derived ~−14%) | Errors, links, name highlight, danger button |
| `--yellow` | `#FFDD2D` | Submit buttons, badges, highlight box, accents |
| `--ink` | `#1A1208` | Text, borders, shadows |
| `--paper` | `#FFFBF2` | Page + card background |
| `--paper-2` | `#FFF4DE` | Tabs track, chips, toggle bg |
| success green | `#137A4B` | `passHash` line in inspector |
| Body backdrop | radial pink/yellow glows over `--paper` |

(Tweakable alternates offered in the panel — Pink: `#FF2E7E / #FF4D8D / #FF1F5E / #E5007A`; Yellow: `#FFDD2D / #FFE234 / #FFC400 / #FFEF7A`.)

### Typography
- **Display**: "Bricolage Grotesque" (weights 600/700/800). Used for headlines, titles, numbered badges, submit labels, success title. *(Tweakable: Unbounded, Space Grotesk.)*
- **Body**: "Hanken Grotesk" (400/500/600/700). Labels, inputs, leads, chips.
- **Mono**: "Space Mono" — inspector key/value dump only.
- Scale in use: 60/34/30px display headings · 15.5/15/14.5px body · 13.5/12.5/12/11.5px labels & hints. Heading letter-spacing `-0.02em`.

### Spacing
- Card padding: brand `40px 38px`, form `38px 40px 34px` (mobile `28px 24px 30px`).
- Field gap `14px`; in-field label/control gap `6px`.
- Body page padding `32px` (mobile `16px`).

### Radius
- `--radius` `22px` (card/panels), `--radius-sm` `14px` (inputs, buttons, chips). Pills/circles `100px`/`50%`.
- "Sharp" tweak overrides to `4px` / `3px`.

### Shadows / borders
- Hard offset shadows (no blur): card `8px 8px 0 ink`; buttons `4px 4px 0 ink` (→ `5px 5px` hover, `1px 1px` active); ghost `3px 3px 0 ink`; input focus `4px 4px 0 pink`.
- Borders: `3px` solid ink (card, panels, submit), `2.5px` (inputs, tabs, chips, drawer).

---

## Assets
- **Fonts**: Google Fonts — Bricolage Grotesque, Hanken Grotesk, Unbounded, Space Grotesk, Space Mono (loaded via `<link>` in the HTML head). Use the codebase's font-loading approach.
- **No images or icon files** — all decoration is CSS shapes; the only "icons" are text glyphs (`✓`, `▲`, `→`, `×`, `!`). Swap for the codebase's icon set if preferred.

---

## Files
In this bundle (and in the project root):
- **`Auth Prototype.html`** — entry point: all CSS (design tokens + component styles in `<style>`), font links, and React/Babel script tags.
- **`auth.jsx`** — the PRD behavior + UI components: storage/crypto helpers (`loadAccounts`, `saveAccounts`, `randomSalt`, `hashPassword`), `validateRegistration`, and components `BrandPanel`, `Field`, `RegisterForm`, `LoginForm`, `Success`, `Inspector`.
- **`app.jsx`** — `App` shell: tab/view routing, state, the seed/clear demo actions, tweak→CSS-var wiring, and mount.
- **`tweaks-panel.jsx`** — the in-prototype tweak controls (color/font/corner). **Design-tooling only — not part of the feature; drop it when implementing.**

> Note: `auth.jsx`/`app.jsx` are loaded via in-browser Babel and share scope through `window` — that's a prototype convenience, not a pattern to carry into the real app.
