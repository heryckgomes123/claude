/**
 * Fundação de clube — Nome → Descrição → Emblema → Tipo → Configurações →
 * Regras → CRIAR CLUBE, com prévia do estandarte ao vivo.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { post } from '../lib/api';
import { useSession } from '../lib/session';
import { Badge, Button, Emblem, Field, Input, PageHead, Panel, Slider, Toggle } from '../components/ui';
import { ThemeIcon } from '../components/Icon';
import { useErrorToast, useToast } from '../components/Toast';
import { CLUB_COLORS, CLUB_EMBLEMS, CLUB_TYPES, type ClubType } from '../../../shared/catalog';
import { sfx } from '../lib/sound';

const STEPS = ['Nome', 'Emblema', 'Tipo', 'Configurações', 'Regras', 'Revisão'];

export default function ClubCreate() {
  const nav = useNavigate();
  const { refresh } = useSession();
  const toast = useToast();
  const onError = useErrorToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: '',
    description: '',
    emblem: 'boar',
    color: 'bronze',
    type: 'aberto' as ClubType,
    rules: '1. Respeite a mesa.\n2. Não abandone partidas.\n3. Diversão acima de tudo.',
    settings: { rakePct: 10, agentCommissionPct: 30, maxMembers: 150, minLevel: 1, allowBots: true, membersCanInvite: true, maxEntry: 5000, tableLimit: 8 },
  });
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const setS = (p: Partial<typeof f.settings>) => setF((s) => ({ ...s, settings: { ...s.settings, ...p } }));
  const nameOk = f.name.trim().length >= 3 && f.name.trim().length <= 32;

  const create = async () => {
    setBusy(true);
    try {
      const r = await post<{ club: { id: string } }>('/clubs', f);
      sfx.win();
      toast(`${f.name} foi fundado!`, 'reward');
      refresh();
      nav(`/clubes/${r.club.id}`);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const canNext = step !== 0 || nameOk;

  return (
    <div className="page">
      <PageHead back={{ to: '/clubes', label: 'Clubes' }} kicker="Fundar" title="Novo clube" />
      <ol className="stepper" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'is-current' : i < step ? 'is-done' : ''}>
            <span>{i < step ? <Check size={12} /> : i + 1}</span>
            <em>{s}</em>
          </li>
        ))}
      </ol>
      <div className="split">
        <Panel rivets className="col gap-4">
          {step === 0 && (
            <>
              <Field label="Nome do clube" hint="3 a 32 caracteres. Será o nome do seu estandarte.">
                <Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Guardiões da Lareira" maxLength={32} autoFocus />
              </Field>
              <Field label="Descrição" hint={`${f.description.length}/280`}>
                <textarea className="textarea" value={f.description} maxLength={280} onChange={(e) => set({ description: e.target.value })} placeholder="O que faz o seu clube especial?" />
              </Field>
            </>
          )}
          {step === 1 && (
            <>
              <div className="field">
                <span className="field-label">Emblema</span>
                <div className="emblem-grid">
                  {CLUB_EMBLEMS.map((e) => (
                    <button key={e} type="button" className="pick" aria-pressed={f.emblem === e} onClick={() => (sfx.select(), set({ emblem: e }))} aria-label={e}>
                      <ThemeIcon name={e} size={26} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="field-label">Cor do estandarte</span>
                <div className="color-grid">
                  {CLUB_COLORS.map((c) => (
                    <button key={c.id} type="button" className="pick color-pick" aria-pressed={f.color === c.id} onClick={() => (sfx.select(), set({ color: c.id }))} title={c.name}>
                      <span style={{ background: c.value }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <div className="col gap-2">
              {CLUB_TYPES.map((t) => (
                <button key={t.id} type="button" className="pick type-pick" aria-pressed={f.type === t.id} onClick={() => (sfx.select(), set({ type: t.id }))}>
                  <b>{t.label}</b>
                  <span className="t-small t-muted">{t.description}</span>
                </button>
              ))}
            </div>
          )}
          {step === 3 && (
            <>
              <Field label={`Taxa das mesas: ${f.settings.rakePct}%`} hint="Parte do pote que vai para o caixa do clube.">
                <Slider min={0} max={25} value={f.settings.rakePct} onChange={(v) => setS({ rakePct: v })} label="Taxa" />
              </Field>
              <Field label={`Comissão de agentes: ${f.settings.agentCommissionPct}% da taxa`}>
                <Slider min={0} max={80} step={5} value={f.settings.agentCommissionPct} onChange={(v) => setS({ agentCommissionPct: v })} label="Comissão" />
              </Field>
              <Field label={`Limite de membros: ${f.settings.maxMembers}`}>
                <Slider min={10} max={500} step={10} value={f.settings.maxMembers} onChange={(v) => setS({ maxMembers: v })} label="Membros" />
              </Field>
              <Field label={`Nível mínimo: ${f.settings.minLevel}`}>
                <Slider min={1} max={20} value={f.settings.minLevel} onChange={(v) => setS({ minLevel: v })} label="Nível" />
              </Field>
              <Field label={`Entrada máxima das mesas: ${f.settings.maxEntry}`}>
                <Slider min={0} max={10000} step={100} value={f.settings.maxEntry} onChange={(v) => setS({ maxEntry: v })} label="Entrada máxima" />
              </Field>
              <Toggle checked={f.settings.allowBots} onChange={(v) => setS({ allowBots: v })} label="Permitir bots nas mesas" description="Bots da casa completam mesas vazias." />
              <Toggle checked={f.settings.membersCanInvite} onChange={(v) => setS({ membersCanInvite: v })} label="Membros podem convidar" />
            </>
          )}
          {step === 4 && (
            <Field label="Regras" hint={`${f.rules.length}/1200`}>
              <textarea className="textarea" rows={9} value={f.rules} maxLength={1200} onChange={(e) => set({ rules: e.target.value })} />
            </Field>
          )}
          {step === 5 && (
            <div className="col gap-2">
              <p className="t-muted">Confira o estandarte. Ao criar, você se torna o Fundador, com acesso à administração, ao caixa e às mesas do clube.</p>
              <ul className="review-list">
                <li>
                  <span>Nome</span>
                  <b>{f.name}</b>
                </li>
                <li>
                  <span>Tipo</span>
                  <b>{CLUB_TYPES.find((t) => t.id === f.type)?.label}</b>
                </li>
                <li>
                  <span>Taxa / comissão</span>
                  <b>
                    {f.settings.rakePct}% / {f.settings.agentCommissionPct}%
                  </b>
                </li>
                <li>
                  <span>Membros / nível mín.</span>
                  <b>
                    {f.settings.maxMembers} / {f.settings.minLevel}
                  </b>
                </li>
              </ul>
            </div>
          )}
          <div className="row row-between mt-4">
            <Button variant="ghost" icon={<ChevronLeft size={16} />} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Voltar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                Avançar <ChevronRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" size="lg" loading={busy} onClick={create} icon={<Shield size={18} />}>
                Criar clube
              </Button>
            )}
          </div>
        </Panel>
        <aside className="sticky-aside">
          <Panel variant="leather" glow className="banner-preview">
            <div className="banner-cloth" style={{ ['--banner' as any]: CLUB_COLORS.find((c) => c.id === f.color)?.value }}>
              <Emblem icon={f.emblem} color={f.color} size={84} />
            </div>
            <h3 className="t-gold t-center">{f.name || 'Seu clube'}</h3>
            <p className="t-small t-muted t-center">{f.description || 'Descrição do clube'}</p>
            <div className="row gap-2" style={{ justifyContent: 'center' }}>
              <Badge>{CLUB_TYPES.find((t) => t.id === f.type)?.label}</Badge>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
