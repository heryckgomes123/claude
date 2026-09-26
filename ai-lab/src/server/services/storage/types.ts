/**
 * Contrato para armazenamento de arquivos (capas, referências visuais, resultados de experimentos).
 *
 * STATUS: somente arquitetura. Hoje o Lab armazena URLs públicas (https) informadas no admin;
 * não há upload. Em serverless (Netlify) NUNCA gravar no sistema de arquivos local — use um
 * object storage (Netlify Blobs, S3/R2, Supabase Storage) implementando esta interface.
 */
export type StoredObject = { key: string; url: string; contentType: string; size: number }

export interface StorageProvider {
  readonly name: string
  put(key: string, body: ArrayBuffer | Uint8Array, contentType: string): Promise<StoredObject>
  getUrl(key: string): Promise<string>
  delete(key: string): Promise<void>
}

export function getStorageProvider(): StorageProvider | null {
  return null
}
