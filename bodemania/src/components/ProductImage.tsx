import { productById, universeOf, type Product } from '../data/catalog'
import { useProductPhotos } from '../state/photos'
import ProductArt from './ProductArt'

/** Mostra a foto real do produto quando existir; senão, a ilustração vetorial. */
export default function ProductImage({
  p,
  productId,
  color,
  index = 0,
  view = 0,
  className = '',
  label,
}: {
  p?: Product
  productId?: string
  color?: string
  /** qual foto mostrar (galeria) */
  index?: number
  /** enquadramento da ilustração quando não há foto */
  view?: 0 | 1 | 2
  className?: string
  label?: string
}) {
  const product = p ?? (productId ? productById(productId) : undefined)
  const photos = useProductPhotos(product)
  if (!product) return null
  if (photos.length)
    return (
      <img
        src={photos[Math.min(index, photos.length - 1)]}
        alt={label ?? product.name}
        loading="lazy"
        decoding="async"
        className={`object-cover ${className}`}
      />
    )
  return (
    <ProductArt
      art={product.art}
      color={color ?? product.tone}
      universe={universeOf(product)}
      view={view}
      className={className}
      label={label ?? product.name}
    />
  )
}
