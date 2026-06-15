import type { StoredView } from '../api'

export function Inspector({
  open,
  onClose,
  accounts,
  onReset,
  onSeed,
}: {
  open: boolean
  onClose: () => void
  accounts: StoredView[]
  onReset: () => void
  onSeed: () => void
}) {
  if (!open) return null
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Stored accounts">
        <div className="drawer__head">
          <div>
            <h3>What's actually stored</h3>
            <p>
              Exactly what lives in storage. Notice there is no plaintext password — only a salt and
              a one-way hash.
            </p>
          </div>
          <button className="drawer__x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="drawer__body">
          {accounts.length === 0 ? (
            <div className="empty">
              <b>Nothing yet</b>Register an account to see how it's stored.
            </div>
          ) : (
            accounts.map((a, i) => (
              <div className="acct" key={i}>
                <div className="acct__top">
                  <span className="acct__login">{a.login}</span>
                  <span className="acct__tag">account #{i + 1}</span>
                </div>
                <div className="kv">
                  <div>
                    <span className="k">name:</span> "{a.name}"
                  </div>
                  <div>
                    <span className="k">surname:</span> "{a.surname}"
                  </div>
                  <div>
                    <span className="k">country:</span> "{a.country}"
                  </div>
                  <div>
                    <span className="k">login:</span> "{a.login}"
                  </div>
                  <div className="plain">
                    <span className="k">password:</span> ✗ not stored
                  </div>
                  <div>
                    <span className="k">salt:</span> {a.salt}
                  </div>
                  <div className="secure">
                    <span className="k">passHash:</span> {a.passHash}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="drawer__foot">
          <button onClick={onSeed}>+ Seed demo account</button>
          <button className="danger" onClick={onReset}>
            Clear all
          </button>
        </div>
      </aside>
    </>
  )
}
