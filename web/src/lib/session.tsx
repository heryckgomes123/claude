/**
 * Sessão do jogador: token + perfil ("me") via React Query.
 * O perfil é recarregado periodicamente (vidas, notificações, saldo).
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, getToken, onTokenChange, post, setToken } from './api';
import type { Me } from './types';

interface Session {
  token: string | null;
  me: Me | undefined;
  loading: boolean;
  signIn: (token: string, me: Me) => void;
  signOut: () => void;
  refresh: () => Promise<unknown>;
  setMe: (me: Me) => void;
  has: (role: 'PLAYER' | 'CLUB_ADMIN' | 'AGENT' | 'SUPER_ADMIN') => boolean;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [token, setTok] = useState(getToken());
  useEffect(() => onTokenChange((t) => setTok(t)), []);
  const meQ = useQuery({
    queryKey: ['me', token],
    queryFn: () => get<Me>('/me'),
    enabled: !!token,
    refetchInterval: 20_000,
    staleTime: 5_000,
  });
  const value: Session = {
    token,
    me: token ? meQ.data : undefined,
    loading: !!token && meQ.isLoading,
    signIn(t, me) {
      setToken(t);
      qc.setQueryData(['me', t], me);
    },
    signOut() {
      setToken(null);
      qc.clear();
    },
    refresh: () => qc.invalidateQueries({ queryKey: ['me'] }),
    setMe: (me) => qc.setQueryData(['me', token], me),
    has: (role) => !!meQ.data?.roles.includes(role),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('SessionProvider ausente');
  return s;
}

/** Atalho para quem precisa do "me" garantido (rotas protegidas). */
export function useMe(): Me {
  const { me } = useSession();
  if (!me) throw new Error('Sem sessão');
  return me;
}

export async function demoLogin(role: string) {
  return post<{ token: string; me: Me }>('/auth/demo', { role });
}
