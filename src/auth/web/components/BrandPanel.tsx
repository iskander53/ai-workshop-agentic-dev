export function BrandPanel({ mode }: { mode: 'register' | 'login' }) {
  const copy =
    mode === 'register'
      ? {
          title: (
            <>
              Make it <em>yours.</em>
            </>
          ),
          sub: "One login, one password. Pick a name nobody else has and you're in.",
        }
      : {
          title: (
            <>
              Welcome <em>back.</em>
            </>
          ),
          sub: 'Your login and password are all it takes. We never stored the password itself.',
        }

  return (
    <div className="brand">
      <div className="brand__shape brand__shape--y" />
      <div className="brand__shape brand__shape--ring" />
      <div className="brand__shape brand__shape--dot" />
      <div>
        <span className="brand__kicker">
          <b />
          Accounts
        </span>
        <h1 className="brand__title">{copy.title}</h1>
        <p className="brand__sub">{copy.sub}</p>
      </div>
      <div className="brand__foot">
        <div className="brand__rule">
          <span className="num">1</span>
          <span className="txt">Unique, case-insensitive logins</span>
        </div>
        <div className="brand__rule">
          <span className="num">2</span>
          <span className="txt">3+ char login · 8+ char password</span>
        </div>
        <div className="brand__rule">
          <span className="num">3</span>
          <span className="txt">Passwords saved as a one-way hash</span>
        </div>
      </div>
    </div>
  )
}
