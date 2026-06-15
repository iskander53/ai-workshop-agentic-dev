// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inspector } from '../../../src/auth/web/components/Inspector'

afterEach(cleanup)

const stored = {
  name: 'Ada',
  surname: 'Lovelace',
  country: 'United Kingdom',
  login: 'ada_l',
  salt: 'a1b2c3d4e5f6',
  passHash: 'deadbeefcafef00d',
}

describe('Inspector (Test plan 18)', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Inspector open={false} onClose={() => {}} accounts={[stored]} onReset={() => {}} onSeed={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the stored dump with salt + passHash and no plaintext password', () => {
    render(
      <Inspector open onClose={() => {}} accounts={[stored]} onReset={() => {}} onSeed={() => {}} />,
    )
    expect(screen.getByText('ada_l', { selector: '.acct__login' })).toBeInTheDocument()
    expect(screen.getByText(/not stored/)).toBeInTheDocument()
    expect(screen.getByText(stored.salt, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(stored.passHash, { exact: false })).toBeInTheDocument()
    // The credential view carries no plaintext password.
    expect(document.body.textContent).not.toContain('secret-pw')
  })

  it('shows the empty state when there are no accounts', () => {
    render(<Inspector open onClose={() => {}} accounts={[]} onReset={() => {}} onSeed={() => {}} />)
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
  })

  it('Seed and Clear invoke their handlers', async () => {
    const user = userEvent.setup()
    const onSeed = vi.fn()
    const onReset = vi.fn()
    render(<Inspector open onClose={() => {}} accounts={[]} onReset={onReset} onSeed={onSeed} />)
    await user.click(screen.getByRole('button', { name: /seed demo account/i }))
    await user.click(screen.getByRole('button', { name: /clear all/i }))
    expect(onSeed).toHaveBeenCalledTimes(1)
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
