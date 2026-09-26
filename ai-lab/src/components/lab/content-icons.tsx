import {
  Aperture,
  BookOpen,
  Box,
  Camera,
  Clapperboard,
  Film,
  Gem,
  Images,
  Megaphone,
  Palette,
  type LucideIcon,
  Shirt,
  ShoppingBag,
  Sparkles,
  SunMedium,
  User,
  Wand2,
  Workflow,
  Wrench,
  Share2,
  Layers,
  PenTool,
  Mic,
  Type,
  Video,
  Image as ImageIcon,
  Brain,
} from 'lucide-react'
import type { ContentType } from '@/lib/labels'

export const CONTENT_TYPE_ICONS: Record<ContentType, LucideIcon> = {
  PROMPT: Sparkles,
  WORKFLOW: Workflow,
  TOOL: Wrench,
  REFERENCE: Images,
  TUTORIAL: BookOpen,
}

/** Ícones permitidos para categorias (nome armazenado no banco → componente). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Video,
  wand: Wand2,
  megaphone: Megaphone,
  bag: ShoppingBag,
  camera: Camera,
  shirt: Shirt,
  user: User,
  share: Share2,
  pen: PenTool,
  gem: Gem,
  box: Box,
  film: Film,
  clapper: Clapperboard,
  aperture: Aperture,
  palette: Palette,
  sun: SunMedium,
  layers: Layers,
  mic: Mic,
  type: Type,
  brain: Brain,
  sparkles: Sparkles,
}

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || Layers
  return <Icon className={className} aria-hidden />
}

export function ContentTypeIcon({ type, className }: { type: ContentType; className?: string }) {
  const Icon = CONTENT_TYPE_ICONS[type]
  return <Icon className={className} aria-hidden />
}
