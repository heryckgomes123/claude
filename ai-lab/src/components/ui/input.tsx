import * as React from 'react'
import { cn } from '@/lib/utils'

export const fieldBase =
  'w-full rounded-xl border border-input bg-ink-900/80 px-3.5 text-sm text-bone placeholder:text-bone/30 transition-colors duration-200 hover:border-bone/20 focus-visible:border-gold-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300/20 disabled:opacity-50 aria-invalid:border-danger/60'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(fieldBase, 'h-10', className)} {...props} />
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(fieldBase, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />
}

export function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        fieldBase,
        'h-10 cursor-pointer appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2712%27%20height%3D%2712%27%20fill%3D%27none%27%20stroke%3D%27%23a39e93%27%20stroke-width%3D%271.5%27%3E%3Cpath%20d%3D%27M3%204.5l3%203%203-3%27/%3E%3C/svg%3E")] bg-[position:right_0.9rem_center] bg-no-repeat pr-9',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('text-[13px] font-medium text-bone/90', className)} {...props} />
}

export function Checkbox({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'size-4 shrink-0 cursor-pointer appearance-none rounded border border-input bg-ink-900 transition-colors checked:border-gold-300 checked:bg-gold-300 checked:bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2016%2016%27%20fill%3D%27none%27%20stroke%3D%27%23060606%27%20stroke-width%3D%272.2%27%3E%3Cpath%20d%3D%27M4%208.5l2.5%202.5L12%205.5%27/%3E%3C/svg%3E")] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300',
        className,
      )}
      {...props}
    />
  )
}

type FieldProps = {
  label: string
  htmlFor: string
  hint?: React.ReactNode
  error?: string
  className?: string
  children: React.ReactNode
  optional?: boolean
}

export function Field({ label, htmlFor, hint, error, className, children, optional }: FieldProps) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-mute-600">opcional</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-mute-600">{hint}</p>
      ) : null}
    </div>
  )
}
