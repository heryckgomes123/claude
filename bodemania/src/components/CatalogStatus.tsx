import { api } from '../api'
import { Refresh } from './Icons'
import { Empty } from './ui'

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Carregando produtos">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-[22px] bg-paper-2" />
          <div className="mt-3 h-3 w-1/3 rounded bg-paper-2" />
          <div className="mt-2 h-4 w-4/5 rounded bg-paper-2" />
          <div className="mt-2 h-4 w-1/3 rounded bg-paper-2" />
        </div>
      ))}
    </div>
  )
}

/** Mostra o esqueleto enquanto o catálogo carrega, ou um aviso com "tentar de novo" se falhar. */
export function CatalogPlaceholder({ status }: { status: 'loading' | 'ready' | 'error' }) {
  if (status === 'error')
    return (
      <Empty
        icon={<Refresh size={28} />}
        title="Não conseguimos carregar a loja"
        text="Verifique sua conexão e tente de novo."
        action={
          <button type="button" className="btn btn-primary" onClick={() => api.reloadCatalog()}>
            Tentar de novo
          </button>
        }
      />
    )
  return <ProductGridSkeleton />
}
