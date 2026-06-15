import type { PublicAccount } from '../api'

export function Success({
  account,
  via,
  onDone,
}: {
  account: PublicAccount
  via: 'register' | 'login'
  onDone: () => void
}) {
  return (
    <div className="success">
      <div className="success__badge">✓</div>
      <h2 className="success__title">
        {via === 'register' ? "You're in, " : 'Hello again, '}
        <span className="success__name">{account.name}</span>.
      </h2>
      <p className="success__lead">
        {via === 'register'
          ? 'Your account is live. This is the identity the system now recognizes you by.'
          : 'Authentication succeeded. The system matched your login to exactly one account.'}
      </p>
      <div className="success__meta">
        <span className="chip">
          <b>login</b>
          {account.login}
        </span>
        <span className="chip">
          <b>name</b>
          {account.name} {account.surname}
        </span>
        <span className="chip">
          <b>country</b>
          {account.country}
        </span>
      </div>
      <button className="ghostbtn" onClick={onDone}>
        ← Back to start
      </button>
    </div>
  )
}
