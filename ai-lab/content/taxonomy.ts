import type { ContentBundleInput } from '../src/lib/content-bundle'

export const categories: NonNullable<ContentBundleInput['categories']> = [
  { slug: 'criar-imagens', name: 'Criar Imagens', icon: 'image', description: 'Gere imagens do zero com direção criativa.' },
  { slug: 'criar-videos', name: 'Criar Vídeos', icon: 'video', description: 'Do texto ou da imagem ao vídeo.' },
  { slug: 'melhorar-fotos', name: 'Melhorar Fotos', icon: 'wand', description: 'Restauração, upscale e tratamento com IA.' },
  { slug: 'criar-anuncios', name: 'Criar Anúncios', icon: 'megaphone', description: 'Peças publicitárias prontas para campanha.' },
  { slug: 'produtos', name: 'Produtos', icon: 'bag', description: 'Fotografia e vídeo de produto para e-commerce e marcas.' },
  { slug: 'fotografia', name: 'Fotografia', icon: 'camera', description: 'Linguagem fotográfica: luz, lente e composição.' },
  { slug: 'moda', name: 'Moda', icon: 'shirt', description: 'Editoriais, lookbooks e campanhas de moda.' },
  { slug: 'retratos', name: 'Retratos', icon: 'user', description: 'Retratos profissionais, editoriais e corporativos.' },
  { slug: 'social-media', name: 'Social Media', icon: 'share', description: 'Conteúdo nativo para Instagram, TikTok e Reels.' },
  { slug: 'conteudo', name: 'Conteúdo', icon: 'pen', description: 'Roteiros, ganchos e textos que acompanham a criação.' },
  { slug: 'branding', name: 'Branding', icon: 'gem', description: 'Identidade visual, moodboards e direção de marca.' },
  { slug: '3d', name: '3D', icon: 'box', description: 'Cenas e objetos com estética 3D e render.' },
  { slug: 'cinematico', name: 'Cinemático', icon: 'clapper', description: 'Linguagem de cinema: câmera, movimento e atmosfera.' },
  // Categorias do diretório de ferramentas
  { kind: 'TOOL', slug: 'geracao-de-imagem', name: 'Geração de imagem', icon: 'image' },
  { kind: 'TOOL', slug: 'geracao-de-video', name: 'Geração de vídeo', icon: 'video' },
  { kind: 'TOOL', slug: 'upscale-e-edicao', name: 'Upscale e edição', icon: 'wand' },
  { kind: 'TOOL', slug: 'audio-e-voz', name: 'Áudio e voz', icon: 'mic' },
  { kind: 'TOOL', slug: 'texto-e-ideacao', name: 'Texto e ideação', icon: 'brain' },
  { kind: 'TOOL', slug: 'edicao-de-video', name: 'Edição de vídeo', icon: 'film' },
]
