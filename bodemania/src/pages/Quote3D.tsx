import { useMemo, useRef, useState } from 'react'
import { RULES, whatsappLink } from '../config/store'
import { money } from '../lib/format'
import { BUILD_VOLUME, FILAMENT_COLORS, INFILLS, MATERIALS, QUALITIES, parseSTL, quotePrint, sampleSTL, type MaterialId, type MeshInfo, type QualityId } from '../lib/print3d'
import { Link } from '../router'
import { addToCart, openCart, pixPrice, toast } from '../state/shop'
import { Bag, Check, Cube, Info, Sparkle, Upload, Whatsapp, X } from '../components/Icons'
import MeshPreview from '../components/MeshPreview'
import { Breadcrumbs, QtyStepper } from '../components/ui'

type Source = { kind: 'file'; name: string; mesh: MeshInfo } | { kind: 'manual'; dims: [number, number, number]; fill: number }

const FILLS = [
  { v: 0.25, label: 'Vazado / fino', hint: 'grades, letras, suportes' },
  { v: 0.45, label: 'Médio', hint: 'figuras, vasos, peças comuns' },
  { v: 0.7, label: 'Maciço', hint: 'blocos, engrenagens, bases' },
]

export default function Quote3D() {
  const [source, setSource] = useState<Source | null>(null)
  const [mode, setMode] = useState<'file' | 'manual'>('file')
  const [manual, setManual] = useState({ x: '80', y: '60', z: '50', fill: 0.45 })
  const [material, setMaterial] = useState<MaterialId>('pla')
  const [colorId, setColorId] = useState<string>('preto')
  const [quality, setQuality] = useState<QualityId>('padrao')
  const [infill, setInfill] = useState<number>(25)
  const [scale, setScale] = useState(100)
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const color = FILAMENT_COLORS.find((c) => c.id === colorId)!

  const load = async (file?: File) => {
    if (!file) return
    setError('')
    if (!/\.stl$/i.test(file.name)) return setError('Por enquanto o orçamento automático aceita arquivos .STL. Para OBJ, 3MF ou STEP, fale com a gente no WhatsApp.')
    if (file.size > 50 * 1024 * 1024) return setError('Arquivo acima de 50 MB. Envie pelo WhatsApp que orçamos manualmente.')
    setLoading(true)
    try {
      const mesh = parseSTL(await file.arrayBuffer())
      setSource({ kind: 'file', name: file.name, mesh })
      setScale(100)
    } catch (e) {
      setError((e as Error).message || 'Não conseguimos ler este arquivo.')
    } finally {
      setLoading(false)
    }
  }

  const useSample = () => {
    const mesh = parseSTL(sampleSTL())
    setSource({ kind: 'file', name: 'vaso-torcido-exemplo.stl', mesh })
    setMode('file')
    setScale(100)
    setError('')
  }

  const geometry = useMemo(() => {
    if (source?.kind === 'file') return { volumeCm3: source.mesh.volumeCm3, size: source.mesh.size }
    if (mode === 'manual') {
      const d = [Number(manual.x) || 0, Number(manual.y) || 0, Number(manual.z) || 0] as [number, number, number]
      if (d.some((v) => v <= 0)) return null
      return { volumeCm3: (d[0] * d[1] * d[2] * manual.fill) / 1000, size: d }
    }
    return null
  }, [source, mode, manual])

  const quote = geometry ? quotePrint({ ...geometry, scale, material, quality, infill, qty }) : null
  const scaled = geometry ? geometry.size.map((d) => (d * scale) / 100) : null
  const mat = MATERIALS.find((m) => m.id === material)!
  const q = QUALITIES.find((x) => x.id === quality)!
  const leadDays = quote ? Math.max(2, Math.ceil((quote.hours * qty) / 16) + 1) : 3

  const add = () => {
    if (!quote || !scaled) return
    if (!quote.fits) return setError('A peça é maior que a área de impressão. Reduza a escala ou fale conosco para dividir em partes.')
    const title = source?.kind === 'file' ? `Impressão 3D — ${source.name}` : `Impressão 3D sob medida (${scaled.map((d) => Math.round(d)).join('×')} mm)`
    addToCart({
      productId: 's01',
      qty,
      options: {},
      personalization: notes.trim() || undefined,
      custom: {
        title,
        details: [
          `${mat.name} ${color.name}`,
          `${q.name} (${q.layer})`,
          material === 'resina' ? 'Resina' : `Preenchimento ${infill}%`,
          `${scaled.map((d) => Math.round(d)).join(' × ')} mm`,
          `≈ ${Math.round(quote.grams)} g`,
        ],
        unitPrice: quote.unit,
        weight: Math.max(0.05, (quote.grams / 1000) * 1.3),
        leadDays,
        color: color.hex,
      },
    })
    toast('Impressão adicionada ao carrinho')
    openCart()
  }

  return (
    <div className="wrap pb-32 lg:pb-10">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Impressão 3D', to: '/loja?u=3d' }, { label: 'Orçamento instantâneo' }]} />
      <header className="mb-8 max-w-3xl">
        <p className="eyebrow text-filament">Orçamento instantâneo</p>
        <h1 className="display mt-2 text-[2.2rem] leading-[1.05] font-semibold md:text-5xl">Envie seu arquivo. Veja o preço agora.</h1>
        <p className="mt-3 text-mute">
          O arquivo é lido no seu próprio navegador para calcular volume e medidas — nada é enviado até você fechar o pedido. Não tem o arquivo?{' '}
          <Link to="/p/modelagem-3d-sob-medida" className="font-semibold text-navy-700 underline">
            Nós modelamos para você
          </Link>
          .
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        {/* Coluna 1: arquivo + prévia */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 rounded-full bg-paper-2 p-1" role="tablist">
            {(
              [
                ['file', 'Tenho o arquivo STL'],
                ['manual', 'Informar medidas'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => {
                  setMode(id)
                  if (id === 'manual') setSource(null)
                }}
                className={`h-11 rounded-full text-sm font-semibold transition ${mode === id ? 'bg-white shadow' : 'text-mute'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'file' ? (
            source?.kind === 'file' ? (
              <div className="overflow-hidden rounded-[28px] bg-[#121317] text-white">
                <div className="relative aspect-[4/3]">
                  <div className="layers absolute inset-0" />
                  <MeshPreview mesh={source.mesh} color={color.hex} scale={scale} />
                  <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 backdrop-blur">Arraste para girar</span>
                </div>
                <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
                  <Cube size={20} className="text-filament" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{source.name}</p>
                    <p className="text-xs text-white/50">
                      {source.mesh.triangles.toLocaleString('pt-BR')} triângulos · {source.mesh.volumeCm3.toFixed(1)} cm³ no tamanho original
                    </p>
                  </div>
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" onClick={() => setSource(null)} aria-label="Remover arquivo">
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    load(e.dataTransfer.files[0])
                  }}
                  className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed px-6 text-center transition ${dragging ? 'border-filament bg-filament-50' : 'border-line-2 bg-white hover:border-navy-600'}`}
                >
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-filament-50 text-filament">
                    <Upload size={30} />
                  </span>
                  <span className="text-lg font-semibold">{loading ? 'Lendo arquivo…' : 'Arraste o arquivo STL aqui'}</span>
                  <span className="text-sm text-mute">ou toque para escolher · até 50 MB</span>
                </button>
                <input ref={fileRef} type="file" accept=".stl,model/stl,application/sla" hidden onChange={(e) => load(e.target.files?.[0])} />
                <button type="button" onClick={useSample} className="mt-3 flex w-full items-center justify-center gap-2 text-sm font-semibold text-navy-700 hover:underline">
                  <Sparkle size={16} /> Não tem um STL agora? Testar com um arquivo de exemplo
                </button>
              </div>
            )
          ) : (
            <div className="rounded-[28px] border border-line bg-white p-5">
              <p className="mb-3 text-sm font-semibold">Medidas aproximadas da peça (mm)</p>
              <div className="grid grid-cols-3 gap-2">
                {(['x', 'y', 'z'] as const).map((k, i) => (
                  <label key={k} className="block">
                    <span className="mb-1 block text-xs text-mute">{['Largura', 'Profundidade', 'Altura'][i]}</span>
                    <input inputMode="decimal" className="field" value={manual[k]} onChange={(e) => setManual((s) => ({ ...s, [k]: e.target.value.replace(/[^\d.]/g, '') }))} />
                  </label>
                ))}
              </div>
              <p className="mt-4 mb-2 text-sm font-semibold">Como é a peça?</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {FILLS.map((f) => (
                  <button key={f.v} type="button" aria-pressed={manual.fill === f.v} onClick={() => setManual((s) => ({ ...s, fill: f.v }))} className={`rounded-2xl border p-3 text-left text-sm ${manual.fill === f.v ? 'border-navy-900 bg-navy-100/40' : 'border-line'}`}>
                    <span className="block font-semibold">{f.label}</span>
                    <span className="text-xs text-mute">{f.hint}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 flex gap-2 rounded-xl bg-paper px-3 py-2 text-xs text-mute">
                <Info size={16} className="shrink-0" /> Estimativa. Confirmamos o valor final pelo WhatsApp antes de produzir — se ficar mais barato, você paga menos.
              </p>
            </div>
          )}

          {error && <p className="rounded-xl bg-err-50 px-3 py-2 text-sm font-medium text-err">{error}</p>}

          {scaled && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {['Largura', 'Profundidade', 'Altura'].map((l, i) => (
                <div key={l} className="rounded-2xl bg-white p-3 ring-1 ring-line">
                  <p className="text-xs text-mute">{l}</p>
                  <p className="text-lg font-bold tabular-nums">
                    {scaled[i].toFixed(0)}
                    <span className="text-xs font-normal text-mute"> mm</span>
                  </p>
                </div>
              ))}
            </div>
          )}
          {quote && !quote.fits && (
            <p className="rounded-xl bg-gold-50 px-3 py-2 text-sm text-gold-700">
              A peça passa da nossa área de impressão ({BUILD_VOLUME.join(' × ')} mm). Reduza a escala ou peça para dividirmos em partes.
            </p>
          )}

          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            {['Revisão técnica do arquivo antes de imprimir', 'Acabamento: remoção de suportes inclusa', 'Envio para todo o Brasil'].map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-line">
                <Check size={16} className="mt-0.5 shrink-0 text-filament" /> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Coluna 2: configuração e preço */}
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold">Material</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {MATERIALS.map((m) => (
                <button key={m.id} type="button" aria-pressed={material === m.id} onClick={() => setMaterial(m.id)} className={`rounded-2xl border p-3 text-left transition ${material === m.id ? 'border-navy-900 bg-white shadow-sm ring-1 ring-navy-900' : 'border-line bg-white hover:border-line-2'}`}>
                  <span className="block text-sm font-semibold">{m.name}</span>
                  <span className="text-xs leading-snug text-mute">{m.desc}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold">
              Cor: <span className="font-normal text-mute">{color.name}</span>
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor">
              {FILAMENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={colorId === c.id}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => setColorId(c.id)}
                  className={`grid h-10 w-10 place-items-center rounded-full ring-offset-2 ring-offset-paper ${colorId === c.id ? 'ring-2 ring-navy-900' : 'ring-1 ring-line-2'}`}
                >
                  <span className="h-7 w-7 rounded-full shadow-inner" style={{ background: c.hex }} />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold">Qualidade</legend>
            <div className="grid grid-cols-3 gap-2">
              {QUALITIES.map((x) => (
                <button key={x.id} type="button" aria-pressed={quality === x.id} onClick={() => setQuality(x.id)} className={`rounded-2xl border p-2.5 text-center text-sm ${quality === x.id ? 'border-navy-900 bg-white ring-1 ring-navy-900' : 'border-line bg-white'}`}>
                  <span className="block font-semibold">{x.name}</span>
                  <span className="text-xs text-mute">{x.layer}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {material !== 'resina' && (
            <fieldset>
              <legend className="mb-2.5 text-sm font-semibold">Preenchimento interno</legend>
              <div className="flex flex-wrap gap-2">
                {INFILLS.map((i) => (
                  <button key={i} type="button" className="chip" aria-pressed={infill === i} onClick={() => setInfill(i)}>
                    {i}%{i === 25 && <span className="text-[0.65rem] opacity-70">recomendado</span>}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {mode === 'file' && source && (
            <label className="block">
              <span className="mb-2 flex justify-between text-sm font-semibold">
                Escala <span className="font-normal text-mute tabular-nums">{scale}%</span>
              </span>
              <input type="range" min={10} max={300} step={5} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full accent-navy-900" />
            </label>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Quantidade</span>
            <QtyStepper value={qty} onChange={setQty} />
          </div>
          {qty >= 5 && <p className="-mt-3 text-right text-xs font-medium text-ok">Desconto por quantidade aplicado ✓</p>}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Observações (opcional)</span>
            <textarea className="field" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Uso da peça, encaixes, acabamento desejado…" />
          </label>

          <div className="rounded-[28px] bg-navy-900 p-5 text-white lg:sticky lg:top-36">
            {quote ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/60">
                  <div>
                    <p className="text-base font-bold text-white tabular-nums">≈ {Math.round(quote.grams)} g</p>
                    material
                  </div>
                  <div>
                    <p className="text-base font-bold text-white tabular-nums">≈ {quote.hours < 1 ? `${Math.round(quote.hours * 60)} min` : `${quote.hours.toFixed(1)} h`}</p>
                    por peça
                  </div>
                  <div>
                    <p className="text-base font-bold text-white tabular-nums">{leadDays} dias</p>
                    produção
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
                  <div>
                    <p className="text-xs text-white/60">{qty > 1 ? `${qty} × ${money(quote.unit)}` : 'Total'}</p>
                    <p className="text-3xl font-bold tabular-nums">{money(quote.total)}</p>
                  </div>
                  <p className="text-right text-xs font-medium text-[#7ef0b0]">
                    {money(pixPrice(quote.total))}
                    <br />
                    no Pix ({RULES.pixDiscount * 100}% off)
                  </p>
                </div>
                <button type="button" className="btn btn-filament mt-4 w-full" onClick={add} disabled={!quote.fits}>
                  <Bag size={18} /> Adicionar ao carrinho
                </button>
              </>
            ) : (
              <p className="py-4 text-center text-sm text-white/70">{mode === 'file' ? 'Envie um arquivo STL para ver o preço.' : 'Informe as medidas para ver o preço.'}</p>
            )}
            <a href={whatsappLink('Olá, Bodemania! Quero um orçamento de impressão 3D.')} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 text-sm text-white/70 hover:text-white">
              <Whatsapp size={16} /> Prefere falar com uma pessoa?
            </a>
          </div>
        </div>
      </div>

      {/* Barra de preço fixa no celular */}
      {quote && (
        <div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white/95 backdrop-blur lg:hidden">
          <div className="wrap flex items-center gap-3 py-3">
            <div>
              <p className="text-lg leading-none font-bold tabular-nums">{money(quote.total)}</p>
              <p className="mt-1 text-xs text-ok">{money(pixPrice(quote.total))} no Pix</p>
            </div>
            <button type="button" className="btn btn-filament ml-auto" onClick={add} disabled={!quote.fits}>
              <Bag size={18} /> Adicionar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
