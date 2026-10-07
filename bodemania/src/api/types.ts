import type { Product } from '../data/catalog'
import type { CartItem, CouponInfo, OrderStatus, PaymentMethod, SavedAddress, ShippingOption, User } from '../state/stores'

/** Erro com mensagem pronta para mostrar ao cliente. */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public code?: string,
    public detail?: string,
  ) {
    super(message)
  }
}

export interface RegisterData {
  name: string
  email: string
  cpf: string
  phone: string
  password: string
  newsletter: boolean
}

export interface CardInput {
  number: string
  name: string
  expiry: string
  cvv: string
  installments: number
}

export interface CheckoutInput {
  /** chave única desta tentativa (evita cobrança dupla); gere outra após qualquer erro */
  idempotencyKey: string
  items: CartItem[]
  user: User
  address?: SavedAddress
  shipping: ShippingOption
  method: PaymentMethod
  card?: CardInput
  coupon: CouponInfo | null
  notes?: string
  /** valores exibidos ao cliente — o servidor recalcula e recusa se divergirem */
  totals: { subtotal: number; discount: number; pixDiscount: number; shipping: number; total: number }
  leadDays: number
  digitalOnly: boolean
}

export type CouponResult = { ok: true; coupon: CouponInfo } | { ok: false; error: string }

export interface ShippingQuoteInput {
  cep: string
  uf?: string
  items: CartItem[]
  goods: number
  weight: number
  coupon?: CouponInfo | null
}

export interface AdminCoupon {
  code: string
  label: string
  percent: number | null
  amount: number | null
  freeShipping: boolean
  minSubtotal: number | null
  maxUses: number | null
  uses: number
  expiresAt: string | null
  active: boolean
}

export interface Backend {
  mode: 'local' | 'supabase'
  /** carrega sessão e catálogo; chamado uma vez ao abrir o site */
  init(): Promise<void>
  /** recarrega o catálogo (botão "tentar de novo") */
  reloadCatalog(): Promise<void>
  auth: {
    register(data: RegisterData): Promise<{ needsConfirmation: boolean }>
    login(email: string, password: string): Promise<void>
    logout(): Promise<void>
    resetPassword(email: string): Promise<void>
    updatePassword(password: string): Promise<void>
    updateProfile(patch: { name: string; cpf: string; phone: string; newsletter: boolean }): Promise<void>
    saveAddress(address: SavedAddress): Promise<SavedAddress>
    removeAddress(id: string): Promise<void>
  }
  coupons: { check(code: string, subtotal: number): Promise<CouponResult> }
  shipping: { quote(input: ShippingQuoteInput): Promise<{ options: ShippingOption[]; source: string }> }
  orders: {
    create(input: CheckoutInput): Promise<{ orderId: string }>
    /** recarrega um pedido (ex.: para ver se o Pix foi pago) */
    refresh(id: string): Promise<void>
    loadMine(): Promise<void>
  }
  admin: {
    loadOrders(): Promise<void>
    setStatus(input: { orderId: string; status: OrderStatus; note?: string; tracking?: string; refund?: boolean }): Promise<void>
    /** só no modo Supabase */
    loadProducts(): Promise<Product[]>
    saveProduct(p: Partial<Product> & { id: string }): Promise<void>
    createProduct(p: Pick<Product, 'name' | 'category' | 'price'> & Partial<Product>): Promise<Product>
    uploadProductImages(productId: string, files: File[]): Promise<string[]>
    loadCoupons(): Promise<AdminCoupon[]>
    saveCoupon(c: AdminCoupon): Promise<void>
    loadCustomers(): Promise<Pick<User, 'id' | 'name' | 'email' | 'phone' | 'createdAt'>[]>
    /** link temporário (10 min) para baixar um arquivo do cliente (STL/foto) */
    signedUrl(path: string): Promise<string>
  }
}
