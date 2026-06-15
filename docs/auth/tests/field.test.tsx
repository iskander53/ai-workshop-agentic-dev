// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Field } from '../../../src/auth/web/components/Field'

afterEach(cleanup)

describe('Field (Test plan 14)', () => {
  it('toggles password visibility with Show/Hide, toggle out of tab order', async () => {
    const user = userEvent.setup()
    render(<Field id="pw" label="Password" type="password" value="secret" onChange={() => {}} />)
    const input = document.getElementById('pw') as HTMLInputElement
    expect(input.type).toBe('password')

    const show = screen.getByRole('button', { name: 'Show' })
    expect(show).toHaveAttribute('tabindex', '-1')

    await user.click(show)
    expect(input.type).toBe('text')

    await user.click(screen.getByRole('button', { name: 'Hide' }))
    expect(input.type).toBe('password')
  })

  it('renders the error state (.field--bad + .field__err message)', () => {
    const { container } = render(
      <Field id="login" label="Login" value="" onChange={() => {}} error="Login is required." />,
    )
    expect(container.querySelector('.field')).toHaveClass('field--bad')
    expect(container.querySelector('.field__err')).toHaveTextContent('Login is required.')
  })

  it('has no error decoration when error is absent', () => {
    const { container } = render(<Field id="login" label="Login" value="" onChange={() => {}} />)
    expect(container.querySelector('.field')).not.toHaveClass('field--bad')
    expect(container.querySelector('.field__err')).toBeNull()
  })
})
