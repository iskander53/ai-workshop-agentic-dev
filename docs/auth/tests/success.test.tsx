// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Success } from '../../../src/auth/web/components/Success'

afterEach(cleanup)

const account = {
  id: '1',
  name: 'Ada',
  surname: 'Lovelace',
  country: 'United Kingdom',
  login: 'ada_l',
}

describe('Success (Test plan 17)', () => {
  it('register variant: title, highlighted name, three chips, back button', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    const { container } = render(<Success account={account} via="register" onDone={onDone} />)

    expect(container.querySelector('.success__title')).toHaveTextContent("You're in, Ada.")
    expect(container.querySelector('.success__name')).toHaveTextContent('Ada')

    // chips: login / name surname / country
    expect(screen.getByText('ada_l')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('United Kingdom')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back to start/i }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('login variant: "Hello again, {name}."', () => {
    const { container } = render(<Success account={account} via="login" onDone={() => {}} />)
    expect(container.querySelector('.success__title')).toHaveTextContent('Hello again, Ada.')
  })
})
