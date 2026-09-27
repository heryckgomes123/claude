'use client'
import { Check, Loader2 } from 'lucide-react'
import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { setLessonDone } from '@/server/actions/student'

export function LessonDoneButton({ lessonId, done }: { lessonId: string; done: boolean }) {
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(done)
  return (
    <Button
      variant={optimistic ? 'secondary' : 'primary'}
      size="lg"
      aria-pressed={optimistic}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic)
          const result = await setLessonDone(lessonId, !optimistic)
          if (!result.ok) toast.error(result.error)
          else if (result.data.done) toast.success('Aula concluída! 🎉')
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Check className={optimistic ? 'text-success' : undefined} />}
      {optimistic ? 'Concluída' : 'Marcar como concluída'}
    </Button>
  )
}
