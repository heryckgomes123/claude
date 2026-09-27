'use client'
import { Download, Loader2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/input'
import { importPrompts } from '@/server/actions/admin'

const TEMPLATE = [
  'titulo,categoria,descricao,prompt,negativo,dicas,ferramentas',
  '"Foto de produto em estúdio","Produtos","Foto publicitária com luz dramática.","Commercial photo of {{produto|a perfume bottle}} on black marble, dramatic rim light","text, watermark","Descreva o material|Mude só a cor de destaque","Midjourney"',
].join('\n')

export function ImportForm() {
  const router = useRouter()
  const [csv, setCsv] = useState('')
  const [pending, startTransition] = useTransition()
  const [report, setReport] = useState<{ created: number; skipped: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2_000_000) {
      setError('Arquivo muito grande (máximo 2 MB).')
      return
    }
    setCsv(await file.text())
    setError(null)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setReport(null)
    startTransition(async () => {
      const result = await importPrompts(csv)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setReport(result.data)
      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-2 rounded-2xl border border-border bg-ink-900/70 p-5 text-sm leading-relaxed text-mute">
        <p>
          Monte uma planilha (Google Sheets ou Excel) com as colunas <strong className="text-bone">titulo, categoria, descricao, prompt, negativo, dicas, ferramentas</strong>{' '}
          e salve/baixe como <strong className="text-bone">CSV</strong>. Só título, categoria e prompt são obrigatórios. Separe várias dicas com{' '}
          <code className="text-gold-200">|</code>.
        </p>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${TEMPLATE}`)}`}
          download="modelo-prompts.csv"
          className="inline-flex items-center gap-1.5 justify-self-start text-gold-300 underline underline-offset-4"
        >
          <Download className="size-4" aria-hidden /> Baixar planilha modelo
        </a>
      </div>

      <Field label="Arquivo CSV" htmlFor="file">
        <input
          id="file"
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="text-sm text-mute file:mr-3 file:rounded-full file:border file:border-input file:bg-ink-800 file:px-4 file:py-2 file:text-sm file:text-bone"
        />
      </Field>
      <Field label="…ou cole o conteúdo aqui" htmlFor="csv">
        <Textarea id="csv" value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} className="font-mono text-xs" placeholder={TEMPLATE} />
      </Field>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {report && (
        <div role="status" className="rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">
          <p>{report.created} prompt(s) importado(s).</p>
          {report.skipped.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-warning">
              {report.skipped.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Button type="submit" variant="primary" size="lg" disabled={pending || !csv.trim()} className="justify-self-start">
        {pending ? <Loader2 className="animate-spin" /> : <Upload />} Importar prompts
      </Button>
    </form>
  )
}
