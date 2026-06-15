// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../../src/auth/web/api')
import * as api from '../../../src/auth/web/api'
import { App } from '../../../src/auth/web/App'

const mockedApi = vi.mocked(api)
const byId = (id: string) => document.getElementById(id) as HTMLInputElement

beforeEach(() => {
  mockedApi.getAccounts.mockResolvedValue([])
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('App shell (Test plan 19)', () => {
  it('defaults to the register form', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
  })

  it('switches register↔login via tab and swap link, resetting to the form', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Create your account' })

    await user.click(screen.getByRole('tab', { name: 'Log in' }))
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create one' }))
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
  })

  it('a successful registration transitions to Success; Back returns to the form', async () => {
    const user = userEvent.setup()
    const account = {
      id: '1',
      name: 'Ada',
      surname: 'Lovelace',
      country: 'United Kingdom',
      login: 'ada_l',
    }
    mockedApi.register.mockResolvedValue({ ok: true, account })

    render(<App />)
    await screen.findByRole('heading', { name: 'Create your account' })
    await user.type(byId('reg-name'), 'Ada')
    await user.type(byId('reg-surname'), 'Lovelace')
    await user.type(byId('reg-country'), 'United Kingdom')
    await user.type(byId('reg-login'), 'ada_l')
    await user.type(byId('reg-password'), 'password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Success view (title's direct text is "You're in, ." — the name is a nested span)
    expect(await screen.findByText(/You're in,/)).toBeInTheDocument()
    expect(screen.getByText('Ada', { selector: '.success__name' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back to start/i }))
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
  })
})
