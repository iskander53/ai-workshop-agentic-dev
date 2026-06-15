// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../../src/auth/web/api')
import * as api from '../../../src/auth/web/api'
import { LoginForm } from '../../../src/auth/web/components/LoginForm'
import { LOGIN_FAILED } from '../../../src/auth/messages'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockedApi = vi.mocked(api)
const byId = (id: string) => document.getElementById(id) as HTMLInputElement

describe('LoginForm (Test plan 16)', () => {
  it('empty submit shows the prompt and does NOT call api.login', async () => {
    const user = userEvent.setup()
    render(<LoginForm onLoggedIn={() => {}} onSwitch={() => {}} />)
    await user.click(screen.getByRole('button', { name: /log in/i }))
    expect(screen.getByText('Enter your login and password.')).toBeInTheDocument()
    expect(mockedApi.login).not.toHaveBeenCalled()
  })

  it('shows the SAME generic banner for wrong password and unknown login', async () => {
    const user = userEvent.setup()
    mockedApi.login.mockResolvedValue({ ok: false, error: LOGIN_FAILED })

    const wrong = render(<LoginForm onLoggedIn={() => {}} onSwitch={() => {}} />)
    await user.type(byId('log-login'), 'bob')
    await user.type(byId('log-password'), 'wrong-pw')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    const wrongBanner = (await screen.findByText(LOGIN_FAILED)).textContent
    wrong.unmount()

    render(<LoginForm onLoggedIn={() => {}} onSwitch={() => {}} />)
    await user.type(byId('log-login'), 'ghost')
    await user.type(byId('log-password'), 'whatever1')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    const unknownBanner = (await screen.findByText(LOGIN_FAILED)).textContent

    expect(unknownBanner).toBe(wrongBanner) // byte-for-byte identical — no enumeration
  })

  it('calls onLoggedIn(account, "login") on success', async () => {
    const user = userEvent.setup()
    const onLoggedIn = vi.fn()
    const account = { id: '1', name: 'Bob', surname: 'Stone', country: 'Canada', login: 'bob' }
    mockedApi.login.mockResolvedValue({ ok: true, account })

    render(<LoginForm onLoggedIn={onLoggedIn} onSwitch={() => {}} />)
    await user.type(byId('log-login'), 'bob')
    await user.type(byId('log-password'), 'secret-pw')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(account, 'login'))
  })
})
