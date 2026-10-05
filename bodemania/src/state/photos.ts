/**
 * Fotos reais dos produtos. Duas origens, nesta ordem de prioridade:
 *  1. Fotos enviadas pelo painel da loja (#/admin) — ficam no navegador de quem enviou.
 *     Servem para testar rápido, do próprio celular.
 *  2. Arquivos em src/assets/produtos/<slug-do-produto>/ — entram no site publicado
 *     e no HTML de testes. É assim que as fotos ficam definitivas.
 * Sem foto, o produto continua com a ilustração vetorial.
 */
import type { Product } from '../data/catalog'
import { createStore } from './createStore'

const files = import.meta.glob('../assets/produtos/*/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const BUNDLED: Record<string, string[]> = {}
for (const path of Object.keys(files).sort()) {
  const parts = path.split('/')
  const slug = parts[parts.length - 2]
  ;(BUNDLED[slug] ??= []).push(files[path])
}

export const photoStore = createStore({ byId: {} as Record<string, string[]> }, 'bm.photos')

const EMPTY: string[] = []

export function useProductPhotos(p: Pick<Product, 'id' | 'slug'> | undefined): string[] {
  const uploaded = photoStore.use((s) => (p ? s.byId[p.id] : undefined))
  if (!p) return EMPTY
  return uploaded?.length ? uploaded : (BUNDLED[p.slug] ?? EMPTY)
}

export const hasBundledPhotos = (slug: string) => !!BUNDLED[slug]?.length

/** Tamanho aproximado do que já está guardado (o navegador aceita ~5 MB por site). */
export const storedPhotosBytes = () => JSON.stringify(photoStore.get().byId).length

export function addPhotos(productId: string, dataUrls: string[]) {
  const next = { ...photoStore.get().byId, [productId]: [...(photoStore.get().byId[productId] ?? []), ...dataUrls] }
  if (JSON.stringify(next).length > 4_500_000)
    throw new Error('Limite de fotos do navegador atingido. Remova algumas ou use a pasta de fotos do projeto.')
  photoStore.set({ byId: next })
}

export function removePhoto(productId: string, index: number) {
  const list = (photoStore.get().byId[productId] ?? []).filter((_, i) => i !== index)
  const byId = { ...photoStore.get().byId }
  if (list.length) byId[productId] = list
  else delete byId[productId]
  photoStore.set({ byId })
}
