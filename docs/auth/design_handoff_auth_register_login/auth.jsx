/* auth.jsx — PRD behavior + auth UI components */
const { useState, useEffect, useRef, useCallback } = React;

/* ------------------------------------------------------------------ */
/* Storage + crypto — implements the PRD's "stored securely" rule.    */
/* Passwords are salted + SHA-256 hashed; plaintext is never persisted.*/
/* ------------------------------------------------------------------ */
const STORE_KEY = "auth_proto_accounts_v1";

function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
  catch { return []; }
}
function saveAccounts(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}
function randomSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + ":" + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const REQUIRED = ["name", "surname", "country", "login", "password"];
const LABELS = { name: "First name", surname: "Surname", country: "Country", login: "Login", password: "Password" };

/* Returns { errors:{field:msg}, ok:bool } per FR2/FR3/FR4 */
function validateRegistration(values, accounts) {
  const errors = {};
  const v = {};
  REQUIRED.forEach((f) => { v[f] = (values[f] || "").trim(); });

  REQUIRED.forEach((f) => {
    if (!v[f]) errors[f] = `${LABELS[f]} is required.`;
  });
  if (v.login && v.login.length < 3) errors.login = "Login must be at least 3 characters.";
  if (v.password && v.password.length < 8) errors.password = "Password must be at least 8 characters.";

  if (v.login && !errors.login) {
    const taken = accounts.some((a) => a.loginLower === v.login.toLowerCase());
    if (taken) errors.login = `“${v.login}” is already taken — try another.`;
  }
  return { errors, ok: Object.keys(errors).length === 0, trimmed: v };
}

/* ------------------------------------------------------------------ */
/* Brand panel                                                         */
/* ------------------------------------------------------------------ */
function BrandPanel({ mode }) {
  const copy = mode === "register"
    ? { title: <>Make it <em>yours.</em></>, sub: "One login, one password. Pick a name nobody else has and you're in." }
    : { title: <>Welcome <em>back.</em></>, sub: "Your login and password are all it takes. We never stored the password itself." };
  return (
    <div className="brand">
      <div className="brand__shape brand__shape--y"></div>
      <div className="brand__shape brand__shape--ring"></div>
      <div className="brand__shape brand__shape--dot"></div>
      <div>
        <span className="brand__kicker"><b></b>Accounts</span>
        <h1 className="brand__title">{copy.title}</h1>
        <p className="brand__sub">{copy.sub}</p>
      </div>
      <div className="brand__foot">
        <div className="brand__rule"><span className="num">1</span><span className="txt">Unique, case-insensitive logins</span></div>
        <div className="brand__rule"><span className="num">2</span><span className="txt">3+ char login · 8+ char password</span></div>
        <div className="brand__rule"><span className="num">3</span><span className="txt">Passwords saved as a one-way hash</span></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Field                                                               */
/* ------------------------------------------------------------------ */
function Field({ id, label, hint, error, type = "text", value, onChange, placeholder, autoComplete }) {
  const [reveal, setReveal] = useState(false);
  const isPw = type === "password";
  const inputType = isPw && reveal ? "text" : type;
  return (
    <div className={"field" + (error ? " field--bad" : "")}>
      <label htmlFor={id}>{label}{hint && <span className="hint">{hint}</span>}</label>
      <div className={isPw ? "pw-wrap" : undefined}>
        <input
          id={id}
          type={inputType}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPw && (
          <button type="button" className="pw-toggle" onClick={() => setReveal((r) => !r)} tabIndex={-1}>
            {reveal ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error && <div className="field__err">{error}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Register form                                                       */
/* ------------------------------------------------------------------ */
function RegisterForm({ onRegistered, onSwitch }) {
  const blank = { name: "", surname: "", country: "", login: "", password: "" };
  const [values, setValues] = useState(blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (f) => (val) => setValues((v) => ({ ...v, [f]: val }));

  async function submit(e) {
    e.preventDefault();
    const accounts = loadAccounts();
    const { errors: errs, ok, trimmed } = validateRegistration(values, accounts);
    setErrors(errs);
    if (!ok) return;
    setBusy(true);
    const salt = randomSalt();
    const passHash = await hashPassword(trimmed.password, salt);
    const account = {
      name: trimmed.name, surname: trimmed.surname, country: trimmed.country,
      login: trimmed.login, loginLower: trimmed.login.toLowerCase(),
      salt, passHash, createdAt: new Date().toISOString(),
    };
    saveAccounts([...accounts, account]);
    setBusy(false);
    onRegistered(account, "register");
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid2">
        <Field id="reg-name" label="First name" value={values.name} onChange={set("name")} error={errors.name} placeholder="Ada" autoComplete="given-name" />
        <Field id="reg-surname" label="Surname" value={values.surname} onChange={set("surname")} error={errors.surname} placeholder="Lovelace" autoComplete="family-name" />
      </div>
      <Field id="reg-country" label="Country" value={values.country} onChange={set("country")} error={errors.country} placeholder="United Kingdom" autoComplete="country-name" />
      <Field id="reg-login" label="Login" hint="unique · min 3" value={values.login} onChange={set("login")} error={errors.login} placeholder="ada_l" autoComplete="username" />
      <Field id="reg-password" label="Password" hint="min 8" type="password" value={values.password} onChange={set("password")} error={errors.password} placeholder="••••••••" autoComplete="new-password" />
      <button className="submit" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create account"} <span className="submit__arrow">→</span>
      </button>
      <p className="swap">Already have one? <button type="button" onClick={onSwitch}>Log in instead</button></p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Login form — FR8/FR9: generic failure, case-insensitive match      */
/* ------------------------------------------------------------------ */
function LoginForm({ onLoggedIn, onSwitch }) {
  const [values, setValues] = useState({ login: "", password: "" });
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (f) => (val) => setValues((v) => ({ ...v, [f]: val }));

  async function submit(e) {
    e.preventDefault();
    setFlash("");
    const login = values.login.trim();
    const password = values.password;
    if (!login || !password) {
      setFlash("Enter your login and password.");
      return;
    }
    setBusy(true);
    const accounts = loadAccounts();
    const match = accounts.find((a) => a.loginLower === login.toLowerCase());
    let ok = false;
    if (match) {
      const hash = await hashPassword(password, match.salt);
      ok = hash === match.passHash;
    }
    setBusy(false);
    if (ok) {
      onLoggedIn(match, "login");
    } else {
      // FR9: identical generic error whether login is unknown or password wrong
      setFlash("That login and password don't match.");
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {flash && (
        <div className="formflash formflash--err"><b>!</b>{flash}</div>
      )}
      <Field id="log-login" label="Login" value={values.login} onChange={set("login")} placeholder="ada_l" autoComplete="username" />
      <Field id="log-password" label="Password" type="password" value={values.password} onChange={set("password")} placeholder="••••••••" autoComplete="current-password" />
      <button className="submit" type="submit" disabled={busy}>
        {busy ? "Checking…" : "Log in"} <span className="submit__arrow">→</span>
      </button>
      <p className="swap">No account yet? <button type="button" onClick={onSwitch}>Create one</button></p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Success / identified account                                        */
/* ------------------------------------------------------------------ */
function Success({ account, via, onDone }) {
  return (
    <div className="success">
      <div className="success__badge">✓</div>
      <h2 className="success__title">
        {via === "register" ? "You're in, " : "Hello again, "}
        <span className="success__name">{account.name}</span>.
      </h2>
      <p className="success__lead">
        {via === "register"
          ? "Your account is live. This is the identity the system now recognizes you by."
          : "Authentication succeeded. The system matched your login to exactly one account."}
      </p>
      <div className="success__meta">
        <span className="chip"><b>login</b>{account.login}</span>
        <span className="chip"><b>name</b>{account.name} {account.surname}</span>
        <span className="chip"><b>country</b>{account.country}</span>
      </div>
      <button className="ghostbtn" onClick={onDone}>← Back to start</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Storage inspector — proves AC5 (no plaintext password anywhere)     */
/* ------------------------------------------------------------------ */
function Inspector({ open, onClose, accounts, onReset, onSeed }) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-scrim" onClick={onClose}></div>
      <aside className="drawer" role="dialog" aria-label="Stored accounts">
        <div className="drawer__head">
          <div>
            <h3>What's actually stored</h3>
            <p>Exactly what lives in storage. Notice there is no plaintext password — only a salt and a one-way hash.</p>
          </div>
          <button className="drawer__x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="drawer__body">
          {accounts.length === 0 ? (
            <div className="empty"><b>Nothing yet</b>Register an account to see how it's stored.</div>
          ) : accounts.map((a, i) => (
            <div className="acct" key={i}>
              <div className="acct__top">
                <span className="acct__login">{a.login}</span>
                <span className="acct__tag">account #{i + 1}</span>
              </div>
              <div className="kv">
                <div><span className="k">name:</span> "{a.name}"</div>
                <div><span className="k">surname:</span> "{a.surname}"</div>
                <div><span className="k">country:</span> "{a.country}"</div>
                <div><span className="k">login:</span> "{a.login}"</div>
                <div className="plain"><span className="k">password:</span> ✗ not stored</div>
                <div><span className="k">salt:</span> {a.salt}</div>
                <div className="secure"><span className="k">passHash:</span> {a.passHash}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="drawer__foot">
          <button onClick={onSeed}>+ Seed demo account</button>
          <button className="danger" onClick={onReset}>Clear all</button>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, {
  loadAccounts, saveAccounts, randomSalt, hashPassword,
  validateRegistration, BrandPanel, Field, RegisterForm, LoginForm, Success, Inspector,
});
