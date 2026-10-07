/** Categorias da vitrine que pertencem ao universo "Maçonaria". As demais são do universo 3D. */
export const MASONIC_CATEGORIES = ['aventais', 'paramentos', 'joias-acessorios', 'presentes-maconicos'] as const
export const universeOfCategory = (category: string): 'maconaria' | '3d' => ((MASONIC_CATEGORIES as readonly string[]).includes(category) ? 'maconaria' : '3d')
