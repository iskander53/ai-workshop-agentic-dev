// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../../src/auth/web/api')
import * as api from '../../../src/auth/web/api'
import { RegisterForm } from '../../../src/auth/web/components/RegisterForm'
import { LOGIN_TAKEN } from '../../../src/auth/messages'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockedApi = vi.mocked(api)
const byId = (id: string) => document.getElementById(id) as HTMLInputElement

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(byId('reg-name'), 'Ada')
  await user.type(byId('reg-surname'), 'Lovelace')
  await user.type(byId('reg-country'), 'United Kingdom')
  await user.type(byId('reg-login'), 'ada_l')
  await user.type(byId('reg-password'), 'password1')
}

describe('RegisterForm (Test plan 15)', () => {
  it('renders server field errors and does NOT call onRegistered', async () => {
    const user = userEvent.setup()
    const onRegistered = vi.fn()
    mockedApi.register.mockResolvedValue({ ok: false, errors: { login: LOGIN_TAKEN } })

    render(<RegisterForm onRegistered={onRegistered} onSwitch={() => {}} />)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(LOGIN_TAKEN)).toBeInTheDocument()
    expect(onRegistered).not.toHaveBeenCalled()
  })

  it('calls onRegistered(account, "register") on success', async () => {
    const user = userEvent.setup()
    const onRegistered = vi.fn()
    const account = {
      id: '1',
      name: 'Ada',
      surname: 'Lovelace',
      country: 'United Kingdom',
      login: 'ada_l',
    }
    mockedApi.register.mockResolvedValue({ ok: true, account })

    render(<RegisterForm onRegistered={onRegistered} onSwitch={() => {}} />)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(onRegistered).toHaveBeenCalledWith(account, 'register'))
  })

  it('shows the busy label "Creating…" while the request is pending', async () => {
    const user = userEvent.setup()
    let resolve!: (v: { ok: true; account: api.PublicAccount }) => void
    mockedApi.register.mockReturnValue(new Promise((r) => (resolve = r)))

    render(<RegisterForm onRegistered={() => {}} onSwitch={() => {}} />)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('button', { name: /creating/i })).toBeDisabled()
    resolve({
      ok: true,
      account: { id: '1', name: 'Ada', surname: 'L', country: 'UK', login: 'ada_l' },
    })
  })

  it('client validation blocks submit and never calls api.register when fields are blank', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onRegistered={() => {}} onSwitch={() => {}} />)
    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(mockedApi.register).not.toHaveBeenCalled()
  })
})
