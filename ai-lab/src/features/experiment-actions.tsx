'use client'
import { toast } from 'sonner'
import { deleteExperiment } from '@/server/actions/lab'
import { ConfirmButton } from './my-lab-forms'

export function DeleteExperimentButton({ id }: { id: string }) {
  return (
    <ConfirmButton
      label="Excluir"
      variant="ghost"
      title="Excluir este experimento?"
      description="As variantes e anotações serão removidas permanentemente."
      onConfirm={async () => {
        const result = await deleteExperiment(id)
        if (result && !result.ok) toast.error(result.error)
      }}
    />
  )
}
