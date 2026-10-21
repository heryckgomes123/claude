import { CHANNEL_LABEL } from '../lib/audience'
import type { Segment } from '../lib/types'
import { CHANNELS } from '../lib/types'
import { ChipInput } from './ui'

export function SegmentEditor({ segment, onChange, tags }: { segment: Segment; onChange: (s: Segment) => void; tags: string[] }) {
  return (
    <div className="space-y-3">
      <div>
        <span className="label">Canais</span>
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => {
            const on = segment.channels.includes(c)
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...segment, channels: on ? segment.channels.filter((x) => x !== c) : [...segment.channels, c] })}
                className={`rounded-full border px-2.5 py-1 text-[12px] transition ${on ? 'border-brand/50 bg-brand/10 text-accent' : 'border-line text-muted hover:border-line-strong'}`}
              >
                {CHANNEL_LABEL[c]}
              </button>
            )
          })}
        </div>
        {segment.channels.length === 0 && <p className="mt-1 text-[11.5px] text-faint">Nenhum selecionado = todos os canais.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="label">Tem todas as tags</span>
          <ChipInput values={segment.includeTags} onChange={(includeTags) => onChange({ ...segment, includeTags })} placeholder="ex.: lead" suggestions={tags} />
        </div>
        <div>
          <span className="label">Não tem nenhuma das tags</span>
          <ChipInput values={segment.excludeTags} onChange={(excludeTags) => onChange({ ...segment, excludeTags })} placeholder="ex.: cliente" suggestions={tags} />
        </div>
      </div>
      <label className="block">
        <span className="label">Pontuação mínima</span>
        <input className="field sm:w-40" type="number" min={0} value={segment.minScore} onChange={(e) => onChange({ ...segment, minScore: Math.max(0, Number(e.target.value) || 0) })} />
      </label>
    </div>
  )
}
