import { LazyMotion, domAnimation } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { categoryById, productBySlug, type CategoryId } from './data/catalog'
import { match, useRoute, useScrollTop } from './router'
import CartDrawer from './components/CartDrawer'
import { CookieBanner, DemoRibbon, MobileTabBar, Toasts, WhatsAppFab } from './components/Chrome'
import Footer from './components/Footer'
import Header from './components/Header'
import Account from './pages/Account'
import Admin from './pages/Admin'
import AuthPage from './pages/Auth'
import CartPage from './pages/CartPage'
import Catalog from './pages/Catalog'
import Checkout from './pages/Checkout'
import { About, Favorites, Help, Policy, Tracking, policyExists } from './pages/Content'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import OrderPage from './pages/OrderPage'
import ProductPage from './pages/ProductPage'
import Quote3D from './pages/Quote3D'

const TITLE = 'Bodemania — Artigos maçônicos & impressão 3D'

function resolve(path: string): { page: ReactNode; title?: string } {
  if (path === '/') return { page: <Home /> }
  if (path === '/loja') return { page: <Catalog />, title: 'Loja' }
  let p: Record<string, string> | null
  if ((p = match('/c/:cat', path)) && categoryById(p.cat)) return { page: <Catalog key={p.cat} category={p.cat as CategoryId} />, title: categoryById(p.cat)!.name }
  if ((p = match('/p/:slug', path))) return { page: <ProductPage slug={p.slug} />, title: productBySlug(p.slug)?.name }
  if (path === '/carrinho') return { page: <CartPage />, title: 'Carrinho' }
  if (path === '/checkout') return { page: <Checkout />, title: 'Finalizar compra' }
  if ((p = match('/pedido/:id', path))) return { page: <OrderPage id={p.id} />, title: `Pedido ${p.id}` }
  if (path === '/entrar') return { page: <AuthPage />, title: 'Entrar' }
  if (path === '/conta') return { page: <Account />, title: 'Minha conta' }
  if (path === '/conta/enderecos') return { page: <Account tab="enderecos" />, title: 'Endereços' }
  if (path === '/conta/dados') return { page: <Account tab="dados" />, title: 'Meus dados' }
  if (path === '/favoritos') return { page: <Favorites />, title: 'Favoritos' }
  if (path === '/orcamento-3d') return { page: <Quote3D />, title: 'Orçamento de impressão 3D' }
  if (path === '/rastreio') return { page: <Tracking />, title: 'Rastrear pedido' }
  if (path === '/ajuda') return { page: <Help />, title: 'Ajuda' }
  if (path === '/sobre') return { page: <About />, title: 'Sobre' }
  if ((p = match('/politicas/:slug', path)) && policyExists(p.slug)) return { page: <Policy slug={p.slug} />, title: 'Políticas' }
  return { page: <NotFound />, title: 'Página não encontrada' }
}

export default function App() {
  const { path } = useRoute()
  useScrollTop(path)
  const { page, title } = resolve(path)

  useEffect(() => {
    document.title = title ? `${title} · Bodemania` : TITLE
  }, [title])

  if (path === '/admin')
    return (
      <LazyMotion features={domAnimation} strict>
        <Admin />
        <Toasts />
      </LazyMotion>
    )

  return (
    <LazyMotion features={domAnimation} strict>
      <DemoRibbon />
      <Header />
      <main id="conteudo" className="min-h-[60vh] pb-20 lg:pb-0">
        {page}
      </main>
      {!path.startsWith('/checkout') && <Footer />}
      <CartDrawer />
      <MobileTabBar />
      <WhatsAppFab />
      <CookieBanner />
      <Toasts />
    </LazyMotion>
  )
}
