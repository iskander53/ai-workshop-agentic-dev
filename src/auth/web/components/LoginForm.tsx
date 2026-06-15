import { useState, type FormEvent } from 'react'
import { Field } from './Field'
import * as api from '../api'
import type { PublicAccount } from '../api'

export function LoginForm({
  onLoggedIn,
  onSwitch,
}: {
  onLoggedIn: (account: PublicAccount, via: 'login') => void
  onSwitch: () => void
}) {
  const [values, setValues] = useState({ login: '', password: '' })
  const [flash, setFlash] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (f: 'login' | 'password') => (val: string) =>
    setValues((v) => ({ ...v, [f]: val }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFlash('')
    const login = values.login.trim()
    const password = values.password
    if (!login || !password) {
      setFlash('Enter your login and password.')
      return
    }
    setBusy(true)
    const result = await api.login({ login, password })
    setBusy(false)
    if (result.ok) onLoggedIn(result.account, 'login')
    // Generic failure — identical for unknown login and wrong password.
    else setFlash(result.error)
  }

  return (
    <form onSubmit={submit} noValidate>
      {flash && (
        <div className="formflash formflash--err">
          <b>!</b>
          {flash}
        </div>
      )}
      <Field
        id="log-login"
        label="Login"
        value={values.login}
        onChange={set('login')}
        placeholder="ada_l"
        autoComplete="username"
      />
      <Field
        id="log-password"
        label="Password"
        type="password"
        value={values.password}
        onChange={set('password')}
        placeholder="••••••••"
        autoComplete="current-password"
      />
      <button className="submit" type="submit" disabled={busy}>
        {busy ? 'Checking…' : 'Log in'} <span className="submit__arrow">→</span>
      </button>
      <p className="swap">
        No account yet?{' '}
        <button type="button" onClick={onSwitch}>
          Create one
        </button>
      </p>
    </form>
  )
}
