/**
 * Painel do Agente — jogadores vinculados, desempenho, comissões e histórico.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Handshake, Send, UserPlus, Users, Coins, Activity } from 'lucide-react';
import { get, post } from '../lib/api';
import { Badge, Button, Emblem, Empty, Field, Input, Loader, Miudas, Modal, PageHead, Panel, PanelTitle, Stat } from '../components/ui';
import { Portrait } from '../components/Portrait';
import { BarChart, BarList } from '../components/charts';
import { useErrorToast, useToast } from '../components/Toast';
import { TransferModal } from './Profile';
import { TxList } from './club-admin/ClubAdmin';
import { fmt, timeAgo } from '../lib/format';

export default function Agent() {
  const q = useQuery({ queryKey: ['agent'], queryFn: () => get<any>('/agent') });
  const toast = useToast();
  const onError = useErrorToast();
  const [invite, setInvite] = useState<{ clubId: string } | null>(null);
  const [user, setUser] = useState('');
  const [pay, setPay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (q.isLoading) return <Loader />;
  const d = q.data;
  if (!d?.clubs.length)
    return (
      <div className="page">
        <Empty icon={<Handshake size={42} />} title="Você ainda não é agente">
          Administradores de clube podem nomear agentes na área de Membros.
        </Empty>
      </div>
    );
  const active = d.players.filter((p: any) => p.status === 'active');
  const volume = active.reduce((s: number, p: any) => s + p.volume, 0);
  return (
    <div className="page">
      <PageHead kicker="Agente" title="Painel do Agente" subtitle="Traga jogadores para seus clubes e receba parte da taxa das mesas que eles jogam." />
      <div className="grid grid-4">
        <Stat label="Jogadores vinculados" value={active.length} sub={`${d.players.length - active.length} convites pendentes`} icon={<Users size={13} />} />
        <Stat label="Comissões (total)" value={<Miudas value={d.totals.total} size={22} />} icon={<Coins size={13} />} />
        <Stat label="Últimos 7 dias" value={fmt(d.totals.week)} sub={`${fmt(d.totals.month)} em 30 dias`} icon={<Activity size={13} />} />
        <Stat label="Volume dos jogadores" value={fmt(volume)} sub="em entradas de mesa" />
      </div>
      <div className="split mt-4">
        <div className="col gap-4">
          <Panel>
            <PanelTitle>Comissões por dia</PanelTitle>
            <BarChart data={d.series.map((s: any) => ({ label: s.day, value: s.amount }))} unit="Miúdas" />
          </Panel>
          <Panel>
            <PanelTitle>Meus jogadores</PanelTitle>
            {!d.players.length ? (
              <Empty title="Nenhum jogador vinculado" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Jogador</th>
                      <th className="num">Partidas</th>
                      <th className="num hide-mobile">Vitórias</th>
                      <th className="num">Volume</th>
                      <th className="num hide-mobile">Prêmios</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {d.players.map((p: any) => (
                      <tr key={p.id + p.clubId}>
                        <td>
                          <Link to={`/jogador/${p.username}`} className="row gap-2" style={{ color: 'inherit' }}>
                            <Portrait avatar={p.avatar} frame={p.frame} size={32} level={p.level} />
                            <span>
                              <b>{p.displayName}</b>
                              <span className="t-xs t-dim" style={{ display: 'block' }}>
                                {p.status === 'invited' ? 'convite pendente' : p.online ? '● online' : p.joinedAt ? `desde ${timeAgo(p.joinedAt)}` : ''}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="num">{p.games}</td>
                        <td className="num hide-mobile">{p.wins}</td>
                        <td className="num">{fmt(p.volume)}</td>
                        <td className="num hide-mobile">{fmt(p.prizes)}</td>
                        <td className="num">
                          {p.status === 'active' && (
                            <button className="icon-btn" style={{ width: 34, height: 34 }} aria-label={`Transferir para ${p.displayName}`} onClick={() => setPay(p.username)}>
                              <Send size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel>
            <PanelTitle>Histórico de comissões</PanelTitle>
            <TxList items={d.commissions} />
          </Panel>
        </div>
        <aside className="col gap-4">
          {d.clubs.map((c: any) => (
            <Panel key={c.id} glow>
              <div className="row gap-3">
                <Emblem icon={c.emblem} color={c.color} size={46} />
                <div className="grow">
                  <b className="t-title">{c.name}</b>
                  <div className="t-xs t-dim">
                    Taxa {c.rakePct}% · sua comissão <Badge tone="gold">{c.commissionPct}%</Badge>
                  </div>
                </div>
              </div>
              <Button block className="mt-4" icon={<UserPlus size={16} />} onClick={() => setInvite({ clubId: c.id })}>
                Convidar jogador
              </Button>
            </Panel>
          ))}
          <Panel>
            <PanelTitle>Quem mais movimenta</PanelTitle>
            <BarList items={active.slice(0, 6).map((p: any) => ({ key: p.id + p.clubId, label: p.displayName, value: p.volume }))} />
          </Panel>
        </aside>
      </div>
      <Modal
        open={!!invite}
        onClose={() => setInvite(null)}
        title="Convidar jogador"
        footer={
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await post(`/clubs/${invite!.clubId}/invite`, { username: user });
                toast('Convite enviado! O jogador ficará vinculado a você.', 'success');
                setInvite(null);
                setUser('');
                q.refetch();
              } catch (e) {
                onError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            Enviar
          </Button>
        }
      >
        <Field label="Usuário" hint="Ao aceitar, o jogador fica vinculado a você neste clube.">
          <Input value={user} onChange={(e) => setUser(e.target.value.toLowerCase())} autoFocus />
        </Field>
      </Modal>
      <TransferModal open={!!pay} to={pay ?? ''} onClose={() => setPay(null)} onDone={() => q.refetch()} />
    </div>
  );
}
