import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';

type Kind = 'success' | 'error' | 'info' | 'reward';
interface ToastItem {
  id: number;
  kind: Kind;
  message: ReactNode;
}
const Ctx = createContext<(message: ReactNode, kind?: Kind) => void>(() => undefined);

let seq = 0;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: ReactNode, kind: Kind = 'info') => {
    const id = ++seq;
    setItems((s) => [...s.slice(-3), { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), kind === 'error' ? 5000 : 3600);
  }, []);
  const icon = { success: <CheckCircle2 size={18} color="var(--c-success)" />, error: <AlertTriangle size={18} color="var(--c-danger)" />, info: <Info size={18} color="var(--c-info)" />, reward: <Sparkles size={18} color="var(--c-gold-300)" /> };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`} onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}>
            {icon[t.kind]}
            <div>{t.message}</div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

/** Mostra o erro da API de forma amigável. */
export function useErrorToast() {
  const toast = useToast();
  return (e: unknown) => toast((e as Error)?.message ?? 'Algo deu errado.', 'error');
}
