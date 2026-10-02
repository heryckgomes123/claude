import type { ReactNode } from 'react'
import { Check } from '../components/Icons'
import type { Option } from '../config/quote'

interface ChoiceGroupProps {
  id: string
  legend: string
  hint?: string
  options: Option[]
  multiple?: boolean
  value: string | string[] | undefined
  onChange: (value: string | string[]) => void
  error?: string
  required?: boolean
  columns?: boolean
}

/** Grupo de escolhas com radio/checkbox nativos (teclado e leitores de tela funcionam de graça). */
export function ChoiceGroup({ id, legend, hint, options, multiple, value, onChange, error, required, columns }: ChoiceGroupProps) {
  const selected = Array.isArray(value) ? value : value ? [value] : []
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  const toggle = (optionId: string) => {
    if (!multiple) return onChange(optionId)
    // “Ainda não sei” / “Nada ainda” são exclusivos.
    const exclusive = optionId === 'unsure' || optionId === 'none'
    if (selected.includes(optionId)) return onChange(selected.filter((v) => v !== optionId))
    if (exclusive) return onChange([optionId])
    return onChange([...selected.filter((v) => v !== 'unsure' && v !== 'none'), optionId])
  }

  return (
    <fieldset id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} aria-required={required || undefined}>
      <legend className="font-display text-[1.05rem] font-semibold text-bone">
        {legend}
        {required && <span className="sr-only"> (obrigatório)</span>}
      </legend>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[0.88rem] text-mute">
          {hint}
        </p>
      )}
      <div className={`mt-3 ${columns ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-wrap gap-2'}`}>
        {options.map((o) => (
          <label key={o.id} className="chip cursor-pointer select-none">
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={id}
              value={o.id}
              checked={selected.includes(o.id)}
              onChange={() => toggle(o.id)}
              className="sr-only"
            />
            <span aria-hidden="true" className={`chip-check ${multiple ? '' : 'round'}`}>
              <Check size={12} strokeWidth={3} />
            </span>
            {o.label}
          </label>
        ))}
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </fieldset>
  )
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-2 flex items-center gap-1.5 text-[0.88rem] font-medium text-coral-300">
      <span aria-hidden="true">!</span>
      {children}
    </p>
  )
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  error?: string
  required?: boolean
  optional?: boolean
  multiline?: boolean
  type?: 'text' | 'email' | 'tel'
  autoComplete?: string
  inputMode?: 'text' | 'email' | 'tel'
  maxLength?: number
  placeholder?: string
}

export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  optional,
  multiline,
  type = 'text',
  autoComplete,
  inputMode,
  maxLength,
  placeholder,
}: TextFieldProps) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  const common = {
    id,
    value,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
    maxLength,
    placeholder,
    className: 'field mt-2',
  }
  return (
    <div>
      <label htmlFor={id} className="font-display text-[1.05rem] font-semibold text-bone">
        {label}
        {optional && <span className="ml-1.5 text-[0.85rem] font-normal text-mute">(opcional)</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[0.88rem] text-mute">
          {hint}
        </p>
      )}
      {multiline ? <textarea rows={4} {...common} className="field mt-2 min-h-[112px] resize-y" /> : <input type={type} autoComplete={autoComplete} inputMode={inputMode} {...common} />}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  )
}
