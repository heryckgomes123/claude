import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, KeyRound, LogOut, Maximize, RefreshCcw, UserCheck, Wrench } from 'lucide-react';
import { get, patch, post, setToken } from '../lib/api';
import { demoLogin, useMe, useSession } from '../lib/session';
import { setPrefs, usePrefs } from '../lib/prefs';
import { setAmbience, sfx } from '../lib/sound';
import { canInstall, enterFullscreen, isIOS, isStandalone, promptInstall } from '../lib/fullscreen';
import { Button, Field, Input, Modal, PageHead, Panel, PanelTitle, Slider, Toggle } from '../components/ui';
import { CharacterArt } from '../components/Portrait';
import { useErrorToast, useToast } from '../components/Toast';

export default function SettingsPage() {
  const me = useMe();
  const { setMe, signOut, signIn } = useSession();
  const prefs = usePrefs();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const [name, setName] = useState(me.displayName);
  const [claim, setClaim] = useState({ username: '', password: '' });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => get<{ demoMode: boolean; database: { driver: string; persistent: boolean } }>('/config') });
  const demo = useQuery({ queryKey: ['demo-accounts'], queryFn: () => get<{ enabled: boolean; accounts: any[] }>('/auth/demo-accounts') });

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) toast(ok, 'success');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page">
      <PageHead kicker="Ajustes" title="Configurações" />
      <div className="grid grid-2">
        <Panel>
          <PanelTitle>Som e ambiente</PanelTitle>
          <div className="col gap-4">
            <Toggle checked={prefs.sound} onChange={(v) => (setPrefs({ sound: v }), v && sfx.coin(), !v && setAmbience(false))} label="Efeitos sonoros" description="Dados, moedas, vitórias." />
            <Field label={`Volume: ${Math.round(prefs.volume * 100)}%`}>
              <Slider min={0} max={1} step={0.05} value={prefs.volume} onChange={(v) => setPrefs({ volume: v })} label="Volume" />
            </Field>
            <Toggle checked={prefs.ambience} onChange={(v) => (setPrefs({ ambience: v }), setAmbience(v))} label="Crepitar da lareira" description="Som ambiente contínuo." />
            <Toggle checked={prefs.embers} onChange={(v) => setPrefs({ embers: v })} label="Brasas no ar" description="Partículas do cenário." />
            <Toggle checked={prefs.reduceMotion} onChange={(v) => setPrefs({ reduceMotion: v })} label="Reduzir animações" description="Mais conforto e economia de bateria." />
          </div>
        </Panel>

        <Panel>
          <PanelTitle>Tela e aplicativo</PanelTitle>
          <div className="col gap-4">
            <Toggle checked={prefs.autoFullscreen} onChange={(v) => setPrefs({ autoFullscreen: v })} label="Tela cheia ao entrar" description="Ativada ao tocar em “Entrar na Toca”." />
            {!isStandalone() && (
              <Button icon={<Maximize size={16} />} onClick={() => enterFullscreen()}>
                Tela cheia agora
              </Button>
            )}
            {isStandalone() ? (
              <p className="t-small t-success">MIÚDA está instalada como aplicativo neste aparelho.</p>
            ) : canInstall() ? (
              <Button variant="primary" icon={<Download size={16} />} onClick={() => promptInstall()}>
                Instalar como aplicativo
              </Button>
            ) : isIOS() ? (
              <div className="callout callout--info">No iPhone/iPad: toque em Compartilhar e depois em “Adicionar à Tela de Início” para jogar em tela cheia, como um app.</div>
            ) : (
              <div className="callout callout--info">Use o menu do navegador → “Instalar app” / “Adicionar à tela inicial” para abrir a MIÚDA em tela cheia, como um aplicativo.</div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelTitle>Conta</PanelTitle>
          <div className="col gap-4">
            <Field label="Nome de exibição">
              <div className="row gap-2">
                <Input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
                <Button loading={busy === 'name'} disabled={name.trim() === me.displayName} onClick={() => run('name', async () => setMe(await patch('/me', { displayName: name })), 'Nome atualizado.')}>
                  Salvar
                </Button>
              </div>
            </Field>
            {me.isGuest ? (
              <div className="col gap-2">
                <div className="callout">Você é convidado. Crie usuário e senha para proteger seu progresso e poder transferir Miúdas.</div>
                <Input placeholder="usuário (a-z, 0-9, _)" value={claim.username} onChange={(e) => setClaim({ ...claim, username: e.target.value.toLowerCase() })} />
                <Input placeholder="senha (mín. 6)" type="password" value={claim.password} onChange={(e) => setClaim({ ...claim, password: e.target.value })} />
                <Button variant="primary" icon={<UserCheck size={16} />} loading={busy === 'claim'} onClick={() => run('claim', async () => setMe((await post<any>('/auth/claim', claim)).me), 'Conta registrada!')}>
                  Registrar conta
                </Button>
              </div>
            ) : (
              <div className="col gap-2">
                <span className="field-label">Trocar senha</span>
                <Input placeholder="senha atual" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                <Input placeholder="nova senha" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                <Button icon={<KeyRound size={16} />} loading={busy === 'pw'} disabled={!pw.current || pw.next.length < 6} onClick={() => run('pw', async () => (setToken((await post<{ token: string }>('/auth/password', pw)).token), setPw({ current: '', next: '' })), 'Senha alterada. Outras sessões foram encerradas.')}>
                  Alterar senha
                </Button>
              </div>
            )}
            <hr className="divider" />
            <div className="row gap-2 row-wrap">
              <Button variant="ghost" icon={<LogOut size={16} />} onClick={signOut}>
                Sair da Toca
              </Button>
              {!me.isGuest && (
                <Button variant="ghost" onClick={() => run('all', async () => (await post('/auth/logout-all'), signOut()))}>
                  Sair de todos os aparelhos
                </Button>
              )}
            </div>
          </div>
        </Panel>

        {(demo.data?.enabled || me.roles.includes('SUPER_ADMIN')) && (
          <Panel variant="stone">
            <PanelTitle icon={<Wrench size={18} />}>Modo de desenvolvimento</PanelTitle>
            <div className="col gap-4">
              {demo.data?.enabled && (
                <>
                  <span className="field-label">Entrar como</span>
                  <div className="dev-roles">
                    {demo.data.accounts.map((a) => (
                      <button
                        key={a.role}
                        className="dev-role"
                        disabled={!!busy}
                        onClick={() =>
                          run(a.role, async () => {
                            const r = await demoLogin(a.role);
                            qc.clear();
                            signIn(r.token, r.me);
                          })
                        }
                      >
                        <span className="dev-role-art">
                          <CharacterArt id={a.avatar} />
                        </span>
                        <span className="grow">
                          <b>{a.label}</b>
                          <span className="t-xs t-dim" style={{ display: 'block' }}>
                            {a.displayName}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {cfg.data && (
                <p className="t-xs t-dim">
                  Banco: {cfg.data.database.driver} {cfg.data.database.persistent ? '(persistente)' : '(memória — dados temporários)'}
                </p>
              )}
              {me.roles.includes('SUPER_ADMIN') ? (
                <Button variant="danger" icon={<RefreshCcw size={16} />} onClick={() => setResetOpen(true)}>
                  Resetar dados
                </Button>
              ) : (
                <p className="t-xs t-dim">O reset de dados fica com o Super Admin.</p>
              )}
            </div>
          </Panel>
        )}
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Resetar todos os dados"
        footer={
          <Button
            variant="danger"
            loading={busy === 'reset'}
            disabled={resetText !== 'RESETAR'}
            onClick={() =>
              run('reset', async () => {
                await post('/admin/reset', { confirm: 'RESETAR' });
                const r = await demoLogin('SUPER_ADMIN').catch(() => null);
                qc.clear();
                if (r) signIn(r.token, r.me);
                else signOut();
                setResetOpen(false);
              }, 'Dados recriados. A Toca renasceu.')
            }
          >
            Apagar e recriar
          </Button>
        }
      >
        <div className="col gap-4">
          <div className="callout callout--danger">Isto apaga jogadores, clubes, partidas, carteiras e notificações, e recria os dados de demonstração.</div>
          <Field label='Digite "RESETAR" para confirmar'>
            <Input value={resetText} onChange={(e) => setResetText(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
