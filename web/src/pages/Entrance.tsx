/**
 * Porta da Toca: entrar, criar conta, entrar como convidado e — no modo de
 * desenvolvimento — entrar diretamente com um papel de demonstração.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Crown, Handshake, LayoutDashboard, Swords } from 'lucide-react';
import { get, post } from '../lib/api';
import { demoLogin, useSession } from '../lib/session';
import { Button, Field, Input, Panel, Segmented } from '../components/ui';
import { CharacterArt } from '../components/Portrait';
import { LogoLockup } from '../brand/Logo';
import { useErrorToast } from '../components/Toast';
import { CHARACTERS } from '../../../shared/catalog';
import { sfx } from '../lib/sound';
import type { Me } from '../lib/types';

type Mode = 'login' | 'register' | 'guest';

const ROLE_ICONS: Record<string, React.ReactElement> = {
  PLAYER: <Swords size={20} />,
  CLUB_ADMIN: <Crown size={20} />,
  AGENT: <Handshake size={20} />,
  SUPER_ADMIN: <LayoutDashboard size={20} />,
};

export default function Entrance() {
  const { signIn } = useSession();
  const onError = useErrorToast();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('borg');
  const [busy, setBusy] = useState<string | null>(null);
  const demo = useQuery({ queryKey: ['demo-accounts'], queryFn: () => get<{ enabled: boolean; accounts: { role: string; label: string; displayName: string; avatar: string; description: string }[] }>('/auth/demo-accounts') });

  const done = (r: { token: string; me: Me }) => {
    sfx.coins();
    signIn(r.token, r.me);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(mode);
    try {
      if (mode === 'login') done(await post('/auth/login', { username, password }));
      else if (mode === 'register') done(await post('/auth/register', { username, password, displayName: displayName || username, avatar }));
      else done(await post('/auth/guest', { displayName: displayName || undefined, avatar }));
    } catch (err) {
      onError(err);
    } finally {
      setBusy(null);
    }
  };

  const asRole = async (role: string) => {
    setBusy(role);
    try {
      done(await demoLogin(role));
    } catch (err) {
      onError(err);
    } finally {
      setBusy(null);
    }
  };

  const free = CHARACTERS.filter((c) => c.unlock.type === 'free');

  return (
    <div className="entrance">
      <div className="entrance-brand">
        <LogoLockup />
        <p className="t-muted entrance-tag">Dados, clubes e Miúdas numa taverna que nunca dorme.</p>
      </div>

      <Panel className="entrance-card" rivets>
        <Segmented
          block
          value={mode}
          onChange={setMode}
          options={[
            { value: 'login', label: 'Entrar' },
            { value: 'register', label: 'Criar conta' },
            { value: 'guest', label: 'Convidado' },
          ]}
        />
        <form className="col gap-4 mt-4" onSubmit={submit}>
          {mode !== 'guest' && (
            <>
              <Field label="Usuário" htmlFor="u">
                <Input id="u" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="seu_nome" required minLength={3} maxLength={20} />
              </Field>
              <Field label="Senha" htmlFor="p" hint={mode === 'register' ? 'Mínimo de 6 caracteres.' : undefined}>
                <Input id="p" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'register' ? 6 : 1} />
              </Field>
            </>
          )}
          {mode !== 'login' && (
            <>
              <Field label="Como a Toca vai te chamar?" htmlFor="d">
                <Input id="d" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={mode === 'guest' ? 'Viajante' : 'Nome de exibição'} maxLength={24} />
              </Field>
              <div className="field">
                <span className="field-label">Escolha seu personagem</span>
                <div className="avatar-pick">
                  {free.map((c) => (
                    <button type="button" key={c.id} className="pick" aria-pressed={avatar === c.id} onClick={() => (sfx.select(), setAvatar(c.id))} title={`${c.name} — ${c.role}`}>
                      <CharacterArt id={c.id} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <Button variant="primary" size="lg" block loading={busy === mode} type="submit">
            {mode === 'login' ? 'Entrar na Toca' : mode === 'register' ? 'Forjar minha conta' : 'Entrar como convidado'}
          </Button>
          {mode === 'guest' && <p className="t-xs t-dim t-center">Convidados podem jogar tudo e criar usuário e senha depois, sem perder o progresso.</p>}
        </form>
      </Panel>

      {demo.data?.enabled && (
        <Panel className="entrance-card entrance-dev" variant="stone">
          <div className="row row-between">
            <span className="field-label">Modo de desenvolvimento · entrar como</span>
            <span className="badge badge--muted">demo</span>
          </div>
          <div className="dev-roles">
            {demo.data.accounts.map((a) => (
              <button key={a.role} className="dev-role" onClick={() => asRole(a.role)} disabled={!!busy}>
                <span className="dev-role-art">
                  <CharacterArt id={a.avatar} />
                </span>
                <span className="grow">
                  <b className="row gap-2">
                    {ROLE_ICONS[a.role]} {a.label}
                  </b>
                  <span className="t-xs t-dim">{a.displayName} — {a.description}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="t-xs t-dim">Senha de todas as contas demo: <code className="selectable">toca123</code></p>
        </Panel>
      )}
    </div>
  );
}
