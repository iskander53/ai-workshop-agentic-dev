import { useState } from 'react'

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}

export function Field({
  id,
  label,
  hint,
  error,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
}: FieldProps) {
  const [reveal, setReveal] = useState(false)
  const isPw = type === 'password'
  const inputType = isPw && reveal ? 'text' : type

  return (
    <div className={'field' + (error ? ' field--bad' : '')}>
      <label htmlFor={id}>
        {label}
        {hint && <span className="hint">{hint}</span>}
      </label>
      <div className={isPw ? 'pw-wrap' : undefined}>
        <input
          id={id}
          type={inputType}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPw && (
          <button
            type="button"
            className="pw-toggle"
            onClick={() => setReveal((r) => !r)}
            tabIndex={-1}
          >
            {reveal ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && <div className="field__err">{error}</div>}
    </div>
  )
}
