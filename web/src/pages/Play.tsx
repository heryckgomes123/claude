import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, DoorOpen, Hash, ScrollText, Table2 } from 'lucide-react';
import { get } from '../lib/api';
import { Empty, PageHead, Panel, PanelTitle, Segmented, SectionTitle, Skeleton } from '../components/ui';
import { BotSetupModal, CreateRoomModal, JoinCodeModal, TableCard } from '../components/game-ui';
import { SCORING_TABLE } from '../../../shared/dice';
import { TABLE_CATEGORIES } from '../../../shared/catalog';
import type { TableDto } from '../lib/types';
import { sfx } from '../lib/sound';

export default function Play() {
  const [modal, setModal] = useState<'bot' | 'room' | 'code' | null>(null);
  const [cat, setCat] = useState<string>('todas');
  const q = useQuery({ queryKey: ['tables'], queryFn: () => get<{ items: TableDto[] }>('/tables'), refetchInterval: 5000 });
  const items = useMemo(() => (q.data?.items ?? []).filter((t) => cat === 'todas' || t.category === cat), [q.data, cat]);
  const house = items.filter((t) => !t.club);
  const clubs = items.filter((t) => t.club);

  return (
    <div className="page">
      <PageHead kicker="Dados do Javali" title="Jogar" subtitle="Sente-se a uma mesa, desafie os bots da casa ou reúna seus amigos numa sala privada." />

      <div className="quick-actions">
        <button className="quick" onClick={() => (sfx.click(), setModal('bot'))}>
          <Bot size={34} />
          <b>Contra Bot</b>
          <span>Treino · ganhe pontos</span>
        </button>
        <button className="quick" onClick={() => (sfx.click(), setModal('room'))}>
          <DoorOpen size={34} />
          <b>Sala Privada</b>
          <span>Gere um código</span>
        </button>
        <button className="quick" onClick={() => (sfx.click(), setModal('code'))}>
          <Hash size={34} />
          <b>Código</b>
          <span>Entrar numa sala</span>
        </button>
      </div>

      <div className="split">
        <div>
          <div className="row row-between row-wrap" style={{ marginTop: 20 }}>
            <SectionTitle left>Mesas</SectionTitle>
            <Segmented value={cat} onChange={setCat} options={[{ value: 'todas', label: 'Todas' }, ...TABLE_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]} />
          </div>
          {q.isLoading && (
            <div className="grid grid-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} h={250} />
              ))}
            </div>
          )}
          {!q.isLoading && !items.length && <Empty icon={<Table2 size={40} />} title="Nenhuma mesa nesta categoria" />}
          {house.length > 0 && (
            <>
              <h3 className="group-title">Mesas da Toca</h3>
              <div className="grid grid-3">
                {house.map((t) => (
                  <TableCard key={t.id} t={t} />
                ))}
              </div>
            </>
          )}
          {clubs.length > 0 && (
            <>
              <h3 className="group-title">Mesas de Clubes</h3>
              <div className="grid grid-3">
                {clubs.map((t) => (
                  <TableCard key={t.id} t={t} />
                ))}
              </div>
            </>
          )}
        </div>
        <aside className="sticky-aside">
          <Panel variant="parchment" className="rules">
            <PanelTitle icon={<ScrollText size={18} />}>Regras dos Dados</PanelTitle>
            <ol className="rules-steps">
              <li>Role os 6 dados.</li>
              <li>Separe ao menos uma combinação que pontua.</li>
              <li>Arrisque rolar os dados restantes… ou guarde os pontos.</li>
              <li>
                Rolou e nada pontuou? <b>JAVALI!</b> Perde os pontos do turno.
              </li>
              <li>Pontuou com os 6 dados? Dados quentes: role os 6 de novo!</li>
            </ol>
            <table className="rules-table">
              <tbody>
                {SCORING_TABLE.map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="t-small">Após as rodadas, a maior pontuação leva o prêmio da mesa.</p>
          </Panel>
        </aside>
      </div>

      <BotSetupModal open={modal === 'bot'} onClose={() => setModal(null)} />
      <CreateRoomModal open={modal === 'room'} onClose={() => setModal(null)} />
      <JoinCodeModal open={modal === 'code'} onClose={() => setModal(null)} />
    </div>
  );
}
