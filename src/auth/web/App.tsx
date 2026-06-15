import { useCallback, useEffect, useState } from 'react'
import { BrandPanel } from './components/BrandPanel'
import { RegisterForm } from './components/RegisterForm'
import { LoginForm } from './components/LoginForm'
import { Success } from './components/Success'
import { Inspector } from './components/Inspector'
import * as api from './api'
import type { PublicAccount, StoredView } from './api'

type Mode = 'register' | 'login'
type View = 'form' | 'success'
type Via = 'register' | 'login'

export function App() {
  const [mode, setMode] = useState<Mode>('register')
  const [view, setView] = useState<View>('form')
  const [session, setSession] = useState<{ account: PublicAccount; via: Via } | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [accounts, setAccounts] = useState<StoredView[]>([])

  const refresh = useCallback(async () => {
    setAccounts(await api.getAccounts())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function handleDone(account: PublicAccount, via: Via) {
    setSession({ account, via })
    setView('success')
    void refresh()
  }
  function reset() {
    setView('form')
    setSession(null)
  }
  function switchTo(m: Mode) {
    setMode(m)
    setView('form')
    setSession(null)
  }

  async function seedDemo() {
    setAccounts(await api.seed())
  }
  async function clearAll() {
    setAccounts(await api.clearAll())
    reset()
  }

  return (
    <>
      <div className="card">
        <BrandPanel mode={mode} />
        <div className="panel">
          {view === 'form' ? (
            <>
              <div className="tabs" role="tablist">
                <button
                  className="tab"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => switchTo('register')}
                >
                  Register
                </button>
                <button
                  className="tab"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => switchTo('login')}
                >
                  Log in
                </button>
              </div>
              <div className="panel__head">
                <h2 className="panel__title">
                  {mode === 'register' ? 'Create your account' : 'Log in'}
                </h2>
                <p className="panel__lead">
                  {mode === 'register'
                    ? 'Five details and a login nobody else has taken.'
                    : 'Use the login and password you registered with.'}
                </p>
              </div>
              {mode === 'register' ? (
                <RegisterForm onRegistered={handleDone} onSwitch={() => switchTo('login')} />
              ) : (
                <LoginForm onLoggedIn={handleDone} onSwitch={() => switchTo('register')} />
              )}
            </>
          ) : (
            session && <Success account={session.account} via={session.via} onDone={reset} />
          )}
        </div>
      </div>

      <button
        className="inspector-toggle"
        onClick={() => {
          void refresh()
          setInspectorOpen(true)
        }}
      >
        Inspect storage <b>{accounts.length}</b>
      </button>
      <Inspector
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        accounts={accounts}
        onReset={clearAll}
        onSeed={seedDemo}
      />
    </>
  )
}
