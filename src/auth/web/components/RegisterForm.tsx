import { useState, type FormEvent } from 'react'
import { Field } from './Field'
import * as api from '../api'
import type { FieldErrors, PublicAccount } from '../api'

const REQUIRED = ['name', 'surname', 'country', 'login', 'password'] as const
type Values = Record<(typeof REQUIRED)[number], string>
const LABELS: Record<string, string> = {
  name: 'First name',
  surname: 'Surname',
  country: 'Country',
  login: 'Login',
  password: 'Password',
}

// Instant client-side checks (required + min-length). Uniqueness comes from the API.
function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {}
  const v = {} as Values
  REQUIRED.forEach((f) => {
    v[f] = (values[f] || '').trim()
  })
  REQUIRED.forEach((f) => {
    if (!v[f]) errors[f] = `${LABELS[f]} is required.`
  })
  if (v.login && v.login.length < 3) errors.login = 'Login must be at least 3 characters.'
  if (v.password && v.password.length < 8)
    errors.password = 'Password must be at least 8 characters.'
  return errors
}

export function RegisterForm({
  onRegistered,
  onSwitch,
}: {
  onRegistered: (account: PublicAccount, via: 'register') => void
  onSwitch: () => void
}) {
  const blank: Values = { name: '', surname: '', country: '', login: '', password: '' }
  const [values, setValues] = useState<Values>(blank)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const set = (f: keyof Values) => (val: string) => setValues((v) => ({ ...v, [f]: val }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    const result = await api.register({
      name: values.name.trim(),
      surname: values.surname.trim(),
      country: values.country.trim(),
      login: values.login.trim(),
      password: values.password,
    })
    setBusy(false)
    if (result.ok) onRegistered(result.account, 'register')
    else setErrors(result.errors)
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid2">
        <Field
          id="reg-name"
          label="First name"
          value={values.name}
          onChange={set('name')}
          error={errors.name}
          placeholder="Ada"
          autoComplete="given-name"
        />
        <Field
          id="reg-surname"
          label="Surname"
          value={values.surname}
          onChange={set('surname')}
          error={errors.surname}
          placeholder="Lovelace"
          autoComplete="family-name"
        />
      </div>
      <Field
        id="reg-country"
        label="Country"
        value={values.country}
        onChange={set('country')}
        error={errors.country}
        placeholder="United Kingdom"
        autoComplete="country-name"
      />
      <Field
        id="reg-login"
        label="Login"
        hint="unique · min 3"
        value={values.login}
        onChange={set('login')}
        error={errors.login}
        placeholder="ada_l"
        autoComplete="username"
      />
      <Field
        id="reg-password"
        label="Password"
        hint="min 8"
        type="password"
        value={values.password}
        onChange={set('password')}
        error={errors.password}
        placeholder="••••••••"
        autoComplete="new-password"
      />
      <button className="submit" type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Create account'} <span className="submit__arrow">→</span>
      </button>
      <p className="swap">
        Already have one?{' '}
        <button type="button" onClick={onSwitch}>
          Log in instead
        </button>
      </p>
    </form>
  )
}
