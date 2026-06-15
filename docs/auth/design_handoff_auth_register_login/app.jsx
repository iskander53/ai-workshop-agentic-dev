/* app.jsx — shell, tabs, view routing, tweaks, mount */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "pink": "#FF2E7E",
  "yellow": "#FFDD2D",
  "display": "Bricolage Grotesque",
  "corner": "round"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [mode, setMode] = useState("register");      // register | login
  const [view, setView] = useState("form");          // form | success
  const [session, setSession] = useState(null);      // { account, via }
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [accounts, setAccounts] = useState(() => loadAccounts());

  const refresh = useCallback(() => setAccounts(loadAccounts()), []);

  // sync CSS vars to tweaks
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--pink", t.pink);
    r.style.setProperty("--yellow", t.yellow);
    r.style.setProperty("--pink-deep", shade(t.pink, -0.14));
    r.style.setProperty("--display", `"${t.display}", system-ui, sans-serif`);
    r.setAttribute("data-corner", t.corner === "sharp" ? "sharp" : "round");
  }, [t.pink, t.yellow, t.display, t.corner]);

  function handleDone(account, via) {
    setSession({ account, via });
    setView("success");
    refresh();
  }
  function reset() {
    setView("form");
    setSession(null);
  }
  function switchTo(m) {
    setMode(m);
    setView("form");
    setSession(null);
  }

  async function seedDemo() {
    const list = loadAccounts();
    if (list.some((a) => a.loginLower === "bob")) { refresh(); return; }
    const salt = randomSalt();
    const passHash = await hashPassword("secret-pw", salt);
    saveAccounts([...list, {
      name: "Bob", surname: "Stone", country: "Canada",
      login: "bob", loginLower: "bob", salt, passHash,
      createdAt: new Date().toISOString(),
    }]);
    refresh();
  }
  function clearAll() {
    saveAccounts([]);
    refresh();
    reset();
  }

  return (
    <>
      <div className="card">
        <BrandPanel mode={mode} />
        <div className="panel">
          {view === "form" ? (
            <>
              <div className="tabs" role="tablist">
                <button className="tab" role="tab" aria-selected={mode === "register"} onClick={() => switchTo("register")}>Register</button>
                <button className="tab" role="tab" aria-selected={mode === "login"} onClick={() => switchTo("login")}>Log in</button>
              </div>
              <div className="panel__head">
                <h2 className="panel__title">{mode === "register" ? "Create your account" : "Log in"}</h2>
                <p className="panel__lead">{mode === "register" ? "Five details and a login nobody else has taken." : "Use the login and password you registered with."}</p>
              </div>
              {mode === "register"
                ? <RegisterForm onRegistered={handleDone} onSwitch={() => switchTo("login")} />
                : <LoginForm onLoggedIn={handleDone} onSwitch={() => switchTo("register")} />}
            </>
          ) : (
            <Success account={session.account} via={session.via} onDone={reset} />
          )}
        </div>
      </div>

      <button className="inspector-toggle" onClick={() => { refresh(); setInspectorOpen(true); }}>
        Inspect storage <b>{accounts.length}</b>
      </button>
      <Inspector
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        accounts={accounts}
        onReset={clearAll}
        onSeed={seedDemo}
      />

      <TweaksPanel>
        <TweakSection label="Color" />
        <TweakColor label="Pink" value={t.pink}
          options={["#FF2E7E", "#FF4D8D", "#FF1F5E", "#E5007A"]}
          onChange={(v) => setTweak("pink", v)} />
        <TweakColor label="Yellow" value={t.yellow}
          options={["#FFDD2D", "#FFE234", "#FFC400", "#FFEF7A"]}
          onChange={(v) => setTweak("yellow", v)} />
        <TweakSection label="Type & shape" />
        <TweakSelect label="Display font" value={t.display}
          options={["Bricolage Grotesque", "Unbounded", "Space Grotesk"]}
          onChange={(v) => setTweak("display", v)} />
        <TweakRadio label="Corners" value={t.corner}
          options={["round", "sharp"]}
          onChange={(v) => setTweak("corner", v)} />
      </TweaksPanel>
    </>
  );
}

/* lighten/darken a hex color by amt (-1..1) */
function shade(hex, amt) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  let r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  const f = amt < 0 ? 1 + amt : 1 - amt;
  const t2 = amt < 0 ? 0 : 255;
  r = Math.round(r * f + t2 * (1 - f));
  g = Math.round(g * f + t2 * (1 - f));
  b = Math.round(b * f + t2 * (1 - f));
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
