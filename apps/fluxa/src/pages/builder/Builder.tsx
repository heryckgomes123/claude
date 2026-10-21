import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Empty, IconButton, Tabs, Toggle, toast } from '../../components/ui'
import { allFields, allTags } from '../../lib/audience'
import { NODE_META, createNode, outputHandles, validateFlow } from '../../lib/flow'
import { navigate } from '../../lib/router'
import type { Automation, FlowEdge, FlowNode, NodeData, NodeKind, Trigger } from '../../lib/types'
import { formatNumber, percent, uid } from '../../lib/util'
import { useStore } from '../../store/store'
import { BuilderContext } from './context'
import { Inspector } from './Inspector'
import { NODE_ICON, nodeTypes, type RFData, type RFNode } from './nodes'
import { Simulator } from './Simulator'
import { TriggersPanel } from './TriggersPanel'

const PALETTE: NodeKind[] = ['message', 'question', 'condition', 'action', 'delay', 'ai', 'split', 'goto']

type Sizes = Record<string, { width: number; height: number }>

function toRF(nodes: FlowNode[], selectedId: string | null, sizes: Sizes): RFNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data as RFData,
    selected: n.id === selectedId,
    deletable: n.type !== 'trigger',
    measured: sizes[n.id],
  }))
}

function toEdges(edges: FlowEdge[], traced: Set<string>): Edge[] {
  return edges.map((e) => {
    const lit = traced.has(e.source) && traced.has(e.target)
    return { id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, className: lit ? 'traced' : undefined, animated: lit }
  })
}

type SideTab = 'triggers' | 'check' | 'stats'

function Canvas({ automation }: { automation: Automation }) {
  const updateAutomation = useStore((s) => s.updateAutomation)
  const automations = useStore((s) => s.automations)
  const sequences = useStore((s) => s.sequences)
  const contacts = useStore((s) => s.contacts)
  const trace = useStore((s) => s.trace)
  const { screenToFlowPosition, fitView } = useReactFlow()

  const [nodes, setNodes] = useState<FlowNode[]>(automation.nodes)
  const [edges, setEdges] = useState<FlowEdge[]>(automation.edges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<SideTab>('triggers')
  const [testing, setTesting] = useState(false)
  const [name, setName] = useState(automation.name)
  const [saved, setSaved] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  // Medidas dos nós ficam fora do fluxo salvo; o React Flow precisa delas para o minimapa e o enquadramento.
  const [sizes, setSizes] = useState<Sizes>({})
  const wrapper = useRef<HTMLDivElement>(null)

  // Salvamento automático com debounce: o arraste de nós não grava a cada quadro.
  const pending = useRef<{ nodes: FlowNode[]; edges: FlowEdge[] } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    if (!pending.current) return
    const { nodes: n, edges: e } = pending.current
    pending.current = null
    updateAutomation(automation.id, { nodes: n, edges: e })
    setSaved(true)
  }, [automation.id, updateAutomation])

  const schedule = useCallback(
    (n: FlowNode[], e: FlowEdge[]) => {
      pending.current = { nodes: n, edges: e }
      setSaved(false)
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, 400)
    },
    [flush],
  )
  useEffect(() => flush, [flush])

  const commit = (n: FlowNode[], e: FlowEdge[] = edges) => {
    setNodes(n)
    setEdges(e)
    schedule(n, e)
  }

  const live: Automation = useMemo(() => ({ ...automation, nodes, edges }), [automation, nodes, edges])
  const issues = useMemo(() => validateFlow(live, automations), [live, automations])
  const errors = issues.filter((i) => i.level === 'error')
  const traced = useMemo(() => new Set(trace?.automationId === automation.id ? trace.nodeIds : []), [trace, automation.id])

  const rfNodes = useMemo(() => toRF(nodes, selectedId, sizes), [nodes, selectedId, sizes])
  const rfEdges = useMemo(() => toEdges(edges, traced), [edges, traced])

  const onNodesChange = (changes: NodeChange<RFNode>[]) => {
    const measured: Sizes = {}
    for (const c of changes) if (c.type === 'dimensions' && c.dimensions) measured[c.id] = c.dimensions
    if (Object.keys(measured).length) setSizes((prev) => ({ ...prev, ...measured }))
    const relevant = changes.filter((c) => c.type !== 'select' && c.type !== 'dimensions')
    if (!relevant.length) return
    const next = applyNodeChanges(relevant, rfNodes)
    const removed = new Set(changes.filter((c) => c.type === 'remove').map((c) => c.id))
    const n = next.map((r) => ({ id: r.id, type: r.type as NodeKind, position: r.position, data: r.data as NodeData }))
    const e = removed.size ? edges.filter((x) => !removed.has(x.source) && !removed.has(x.target)) : edges
    if (selectedId && removed.has(selectedId)) setSelectedId(null)
    commit(n, e)
  }

  const onEdgesChange = (changes: EdgeChange[]) => {
    const relevant = changes.filter((c) => c.type !== 'select')
    if (!relevant.length) return
    const next = applyEdgeChanges(relevant, rfEdges)
    commit(
      nodes,
      next.map((x) => ({ id: x.id, source: x.source, target: x.target, sourceHandle: x.sourceHandle ?? 'out' })),
    )
  }

  const onConnect = (c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return
    const handle = c.sourceHandle ?? 'out'
    // Cada saída leva a um único passo: reconectar substitui a ligação anterior.
    const e = [...edges.filter((x) => !(x.source === c.source && x.sourceHandle === handle)), { id: uid('e'), source: c.source, target: c.target, sourceHandle: handle }]
    commit(nodes, e)
  }

  const addNode = (kind: NodeKind) => {
    const rect = wrapper.current?.getBoundingClientRect()
    const center = rect ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 0, y: 0 }
    const jitter = (nodes.length % 5) * 24
    const node = createNode(kind, { x: center.x - 134 + jitter, y: center.y - 60 + jitter })
    // Liga automaticamente ao passo selecionado, se a saída "Próximo" estiver livre.
    let e = edges
    const from = nodes.find((n) => n.id === selectedId)
    if (from && ['trigger', 'action', 'delay'].includes(from.type) && !edges.some((x) => x.source === from.id && x.sourceHandle === 'out')) {
      node.position = { x: from.position.x + 340, y: from.position.y }
      e = [...edges, { id: uid('e'), source: from.id, target: node.id, sourceHandle: 'out' }]
    }
    commit([...nodes, node], e)
    setSelectedId(node.id)
    setPanelOpen(true)
    setTesting(false)
  }

  const updateNodeData = (id: string, data: NodeData) => {
    const n = nodes.map((x) => (x.id === id ? { ...x, data } : x))
    // Remove ligações de saídas que deixaram de existir (botão apagado, intenção removida…).
    const node = n.find((x) => x.id === id)!
    const valid = new Set(outputHandles(node).map((h) => h.id))
    commit(
      n,
      edges.filter((x) => x.source !== id || valid.has(x.sourceHandle)),
    )
  }

  const deleteNode = (id: string) => {
    commit(
      nodes.filter((n) => n.id !== id),
      edges.filter((e) => e.source !== id && e.target !== id),
    )
    setSelectedId(null)
  }

  const duplicateNode = (id: string) => {
    const source = nodes.find((n) => n.id === id)
    if (!source) return
    const copy: FlowNode = { ...structuredClone(source), id: uid('n'), position: { x: source.position.x + 40, y: source.position.y + 160 } }
    commit([...nodes, copy])
    setSelectedId(copy.id)
  }

  const setTriggers = (triggers: Trigger[]) => updateAutomation(automation.id, { triggers })

  const toggleActive = (active: boolean) => {
    if (active && errors.length) {
      setTab('check')
      setSelectedId(null)
      setPanelOpen(true)
      toast(`Corrija ${errors.length} erro(s) antes de ativar.`, 'error')
      return
    }
    flush()
    updateAutomation(automation.id, { active })
    toast(active ? 'Automação ativada — já está respondendo.' : 'Automação pausada.')
  }

  const selected = nodes.find((n) => n.id === selectedId)
  const tags = useMemo(() => allTags(contacts), [contacts])
  const fields = useMemo(() => allFields(contacts), [contacts])

  return (
    <BuilderContext.Provider
      value={{ automation: live, automations, issues, tracedNodes: traced, activeNodeId: trace?.automationId === automation.id ? trace.activeNodeId : undefined, showVisits: true }}
    >
      <div className="flex h-full flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-subtle bg-canvas px-3 py-2.5 sm:px-4">
          <IconButton icon="chevronLeft" label="Voltar para automações" onClick={() => navigate('/automacoes')} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== automation.name && updateAutomation(automation.id, { name: name.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            aria-label="Nome da automação"
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-[15px] font-semibold outline-none hover:bg-sunken focus:bg-sunken sm:max-w-sm"
          />
          <span className="hidden text-[11.5px] text-faint sm:inline">{saved ? 'Salvo' : 'Salvando…'}</span>
          <div className="ml-auto flex items-center gap-2">
            {errors.length > 0 ? (
              <button type="button" onClick={() => (setTab('check'), setSelectedId(null), setPanelOpen(true))}>
                <Badge tone="danger">
                  <Icon name="alert" size={12} /> {errors.length} erro(s)
                </Badge>
              </button>
            ) : (
              <Badge tone="success">
                <Icon name="check" size={12} /> Fluxo válido
              </Badge>
            )}
            <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-1.5 text-[12.5px]">
              <Toggle checked={automation.active} onChange={toggleActive} label={automation.active ? 'Pausar' : 'Ativar'} />
              {automation.active ? 'Ativa' : 'Pausada'}
            </label>
            <Button
              size="sm"
              variant={testing ? 'secondary' : 'primary'}
              icon="play"
              onClick={() => {
                flush()
                setTesting(!testing)
                setPanelOpen(true)
              }}
            >
              Testar
            </Button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          <aside className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] gap-0.5 overflow-x-auto rounded-xl border border-line bg-surface p-1 shadow-card lg:flex-col lg:overflow-visible">
            {PALETTE.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => addNode(kind)}
                title={`${NODE_META[kind].label}: ${NODE_META[kind].hint}`}
                className="group flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-[12.5px] text-muted transition hover:bg-subtle hover:text-fg"
              >
                <span className="grid size-6 place-items-center rounded-lg" style={{ background: `${NODE_META[kind].color}1f`, color: NODE_META[kind].color }}>
                  <Icon name={NODE_ICON[kind]} size={14} />
                </span>
                <span className="hidden 2xl:inline">{NODE_META[kind].label}</span>
              </button>
            ))}
          </aside>

          <div ref={wrapper} className="min-w-0 flex-1">
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => {
                setSelectedId(n.id)
                setPanelOpen(true)
                setTesting(false)
              }}
              onPaneClick={() => setSelectedId(null)}
              colorMode="light"
              fitView
              fitViewOptions={{ padding: { top: 0.15, right: 0.12, bottom: 0.15, left: 0.2 }, minZoom: 0.2, maxZoom: 1 }}
              minZoom={0.2}
              maxZoom={1.6}
              deleteKeyCode={['Backspace', 'Delete']}
              defaultEdgeOptions={{ type: 'default' }}
              proOptions={{ hideAttribution: false }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#c3cdd9" />
              <Controls showInteractive={false} position="bottom-left" />
              <MiniMap pannable zoomable position="bottom-right" className="!hidden md:!block" nodeColor={(n) => NODE_META[n.type as NodeKind]?.color ?? '#555'} nodeStrokeWidth={0} />
            </ReactFlow>
          </div>

          {!panelOpen && (
            <button type="button" onClick={() => setPanelOpen(true)} className="absolute right-3 top-3 z-10 rounded-xl border border-line bg-surface px-3 py-2 text-[12.5px] text-muted hover:text-fg">
              Abrir painel
            </button>
          )}

          {panelOpen && (
            <aside className="absolute inset-x-0 bottom-0 z-20 flex max-h-[62%] flex-col rounded-t-2xl border-t border-line bg-surface shadow-pop lg:static lg:max-h-none lg:w-[360px] lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none">
              {testing ? (
                <Simulator automation={live} flush={flush} onClose={() => setTesting(false)} />
              ) : selected ? (
                <Inspector
                  key={selected.id}
                  node={selected}
                  automation={live}
                  automations={automations}
                  sequences={sequences}
                  tags={tags}
                  fields={fields}
                  onChange={(data) => updateNodeData(selected.id, data)}
                  onDelete={() => deleteNode(selected.id)}
                  onDuplicate={() => duplicateNode(selected.id)}
                  onClose={() => setSelectedId(null)}
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-center gap-2 border-b border-subtle px-3 py-2.5">
                    <Tabs
                      value={tab}
                      onChange={setTab}
                      options={[
                        { id: 'triggers', label: 'Gatilhos', count: automation.triggers.length },
                        { id: 'check', label: 'Verificação', count: issues.length },
                        { id: 'stats', label: 'Resultados' },
                      ]}
                    />
                    <IconButton icon="x" label="Recolher painel" className="ml-auto lg:hidden" onClick={() => setPanelOpen(false)} />
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {tab === 'triggers' && <TriggersPanel triggers={automation.triggers} onChange={setTriggers} />}
                    {tab === 'check' &&
                      (issues.length === 0 ? (
                        <Empty icon="check" title="Tudo certo" text="Nenhum problema encontrado neste fluxo." />
                      ) : (
                        <ul className="space-y-2">
                          {issues.map((issue, i) => (
                            <li key={i}>
                              <button
                                type="button"
                                disabled={!issue.nodeId}
                                onClick={() => {
                                  if (!issue.nodeId) return
                                  setSelectedId(issue.nodeId)
                                  const n = nodes.find((x) => x.id === issue.nodeId)
                                  if (n) fitView({ nodes: [{ id: n.id }], duration: 400, maxZoom: 1.1 })
                                }}
                                className="flex w-full gap-2 rounded-xl border border-subtle p-3 text-left text-[12.5px] transition enabled:hover:border-line-strong"
                              >
                                <span className={issue.level === 'error' ? 'text-danger' : 'text-accent'}>
                                  <Icon name="alert" size={15} />
                                </span>
                                <span>{issue.text}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ))}
                    {tab === 'stats' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            ['Execuções', formatNumber(automation.stats.runs)],
                            ['Concluídas', percent(automation.stats.completed, automation.stats.runs)],
                            ['CTR', percent(automation.stats.clicks, automation.stats.runs)],
                          ].map(([l, v]) => (
                            <div key={l} className="rounded-xl border border-subtle p-3">
                              <div className="text-[11px] text-faint">{l}</div>
                              <div className="mt-1 text-[17px] font-semibold tabular-nums">{v}</div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[12px] text-muted">Os números no canto de cada passo mostram quantos contatos passaram por ali — use para achar onde as pessoas desistem.</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="reset"
                          onClick={() => {
                            if (window.confirm('Zerar as estatísticas desta automação?')) updateAutomation(automation.id, { stats: { runs: 0, completed: 0, clicks: 0, nodeVisits: {}, variants: {} } })
                          }}
                        >
                          Zerar estatísticas
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </BuilderContext.Provider>
  )
}

export default function Builder({ id }: { id: string }) {
  const automation = useStore((s) => s.automations.find((a) => a.id === id))
  if (!automation) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Empty icon="flow" title="Automação não encontrada" text="Ela pode ter sido excluída." action={<Button onClick={() => navigate('/automacoes')}>Voltar</Button>} />
      </div>
    )
  }
  return (
    <ReactFlowProvider>
      <Canvas key={automation.id} automation={automation} />
    </ReactFlowProvider>
  )
}
