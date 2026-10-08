# 🚀 Checklist de Produção - Bodemania E-Commerce (3 dias)

**Deadline:** 3 dias | **Plataforma:** Netlify | **DB:** Supabase

---

## 📋 DIA 1: PREPARAÇÃO E DADOS

### 1.1 Supabase - Banco de Dados ✅
- [ ] Projeto Supabase criado e projeto URL definida
- [ ] Tabelas criadas: `products`, `orders`, `users`, `addresses`, `coupons`
- [ ] Row Level Security (RLS) ativado em todas as tabelas
- [ ] Policies configuradas:
  - [ ] Users: Só usuário logado vê seus dados
  - [ ] Products: Público lê, admin escreve
  - [ ] Orders: Usuário vê seus pedidos, admin vê todos
  - [ ] Addresses: Usuário vê suas, admin vê todas
- [ ] Índices criados para performance:
  - [ ] `products.slug` (único)
  - [ ] `orders.user_id` (busca rápida)
  - [ ] `products.category` (filtros)
  - [ ] `orders.created_at` DESC (listagem)

### 1.2 Supabase - Autenticação
- [ ] Email/Password provider ativado
- [ ] URL de redirect configurada (local + netlify)
- [ ] Email templates customizadas:
  - [ ] Confirmação de email
  - [ ] Reset de senha
  - [ ] Notificação de novo pedido
- [ ] Rate limiting configurado (evita brute force)
- [ ] CORS permitir apenas seu domínio Netlify

### 1.3 Supabase - Edge Functions
- [ ] `create-order` → Cria pedido, validar estoque
- [ ] `shipping-quote` → Calcula frete com CorreOS
- [ ] `mp-webhook` → Recebe confirmação de pagamento
- [ ] `admin-order` → Atualiza status (admin only)
- [ ] Logging habilitado (erros salvos em tabela)
- [ ] Timeout configurado (máx 60s)

### 1.4 Dados Reais - Produtos
- [ ] Produtos importados para Supabase (SQL ou admin)
- [ ] Imagens otimizadas (WebP, <200KB cada)
- [ ] Imagens uploaded para Supabase Storage
- [ ] Validar: nome, preço, estoque, descrição, SKU
- [ ] Categorias e tags corretas
- [ ] SEO: slug, meta description, palavras-chave

### 1.5 Dados Reais - Configuração
- [ ] CNPJ correto no store.ts ✅
- [ ] Instagram correto ✅
- [ ] WhatsApp correto ✅
- [ ] Email de contato correto
- [ ] Endereço da empresa (CEP, cidade)
- [ ] Horário de atendimento

### 1.6 Testes - Fluxo Completo
- [ ] Criar conta → Receber email confirmação
- [ ] Login → Sessão funciona
- [ ] Ver produtos → Imagens carregam rápido
- [ ] Adicionar ao carrinho → Persiste
- [ ] Checkout → Calcula frete corretamente
- [ ] Pagamento (Mercado Pago teste) → Sucede
- [ ] Receber email de pedido confirmado
- [ ] Admin ver pedido → Status correto

---

## 🔒 DIA 2: SEGURANÇA & PERFORMANCE

### 2.1 Variáveis de Ambiente (.env produção)
```
# ✅ Públicas (seguro no navegador)
VITE_SITE_URL=https://seudominio.com.br
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
VITE_INSTAGRAM_URL=https://instagram.com/lojabodemania
VITE_WHATSAPP_NUMBER=67999113636
VITE_GA_ID=G-XXXXXXXXXX

# ⚠️ SECRETAS (Netlify Functions, NÃO no navegador)
SUPABASE_SERVICE_ROLE_KEY=xxxx (não exponha!)
MERCADO_PAGO_ACCESS_TOKEN=xxxx
SENDGRID_API_KEY=xxxx (para emails)
```
- [ ] .env.production criado no Netlify
- [ ] Nenhuma chave secreta no código ou .env do repo
- [ ] GitHub não tem secrets da empresa

### 2.2 Headers de Segurança (netlify.toml)
```toml
[[headers]]
  for = "/*"
  [headers.values]
    # Evita ataques XSS
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.github.com https://supabase.co; frame-src 'none';"
    
    # Não permite embed em iframes
    X-Frame-Options = "DENY"
    
    # Não sniff MIME types
    X-Content-Type-Options = "nosniff"
    
    # Ativa proteção XSS no navegador
    X-XSS-Protection = "1; mode=block"
    
    # Força HTTPS
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    
    # Referrer policy
    Referrer-Policy = "strict-origin-when-cross-origin"
    
    # Permissions policy
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```
- [ ] netlify.toml criado na raiz do projeto
- [ ] Headers testados com curl/browser DevTools
- [ ] CSP validado (sem console errors)

### 2.3 CORS & Autenticação
- [ ] Supabase: CORS apenas para domínio Netlify
- [ ] Mercado Pago: Public Key apenas exposta
- [ ] Tokens JWT: Expirmam em 1 hora (refresh token)
- [ ] Cookies: HttpOnly, Secure, SameSite=Strict
- [ ] Rate limiting: Login (5 tentativas/5min), API (100 req/min)

### 2.4 Dados Sensíveis
- [ ] Nenhum CPF/senha em localStorage (token apenas)
- [ ] Cartão: Supabase vendo tokenização via Mercado Pago
- [ ] Números de telefone: Apenas enviados por HTTPS
- [ ] Emails: Criptografados em trânsito, hashed no banco
- [ ] Logs: Não contêm dados pessoais

### 2.5 Validação & Sanitização
- [ ] Frontend: Validar entrada (email, CPF, telefone)
- [ ] Backend (Edge Function): Revalidar tudo
- [ ] SQL Injection: Usar Supabase client (safe)
- [ ] XSS: React escapa HTML automaticamente
- [ ] CSRF: Token incluído em formulários (se POST)

### 2.6 Performance
- [ ] Build otimizado: `npm run build` < 1MB gzip
- [ ] Lazy loading: Pages carregam sob demanda
- [ ] Imagens: WebP, srcset, lazy loading
- [ ] Fonte: System font ou self-hosted
- [ ] Lighthouse score: > 90 em Desktop e Mobile
- [ ] LCP (Largest Contentful Paint): < 2.5s
- [ ] CLS (Cumulative Layout Shift): < 0.1

### 2.7 Testes E2E (Playwright)
- [ ] Fluxo login → checkout → pedido criado
- [ ] Validações frontend funcionam
- [ ] Mensagens de erro corretas
- [ ] Sem overflow horizontal em mobile
- [ ] Responsivo: 320px, 640px, 1440px

### 2.8 Monitoring & Logging
- [ ] Google Analytics: Purchase events rastreados
- [ ] Sentry/Rollbar: Erros capturados e notificados
- [ ] Edge Function logs: Salvos em Supabase
- [ ] Alertas: Email quando conversão falha
- [ ] Backup: Supabase backups automáticos diários

---

## 🚀 DIA 3: DEPLOYMENT & FINALIZAÇÃO

### 3.1 Netlify Setup
- [ ] Projeto conectado ao GitHub/Git local
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Environment variables configuradas (produção)
- [ ] Deploy preview para cada commit
- [ ] Redirects configurados (SPA):
  ```toml
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```

### 3.2 Domínio & DNS
- [ ] Domínio apontado para Netlify
- [ ] SSL automático configurado (Let's Encrypt)
- [ ] HTTPS redirecionando HTTP
- [ ] www e non-www funcionam

### 3.3 Backup & Disaster Recovery
- [ ] Supabase: Backups diários habilitados
- [ ] GitHub: Código versionado (se usar)
- [ ] Imagens: Backup separado ou em cloud
- [ ] Documentação: Como restaurar banco

### 3.4 Documentação para Cliente
- [ ] Como fazer login no admin
- [ ] Como gerenciar produtos
- [ ] Como ver pedidos e atualizar status
- [ ] Contato técnico seu (suporte)

### 3.5 Testes Finais em Produção
- [ ] Acessar site pelo domínio real
- [ ] Criar conta (email verdadeiro)
- [ ] Confirmar email
- [ ] Fazer compra teste (real ou simulada)
- [ ] Ver pedido no admin
- [ ] Testar filtros, busca, carrinho
- [ ] Testar responsividade (mobile)
- [ ] Testar dark mode (se houver)

### 3.6 Entrega
- [ ] Relatório de deployment
- [ ] Credenciais admin (senha segura)
- [ ] Contato técnico/suporte
- [ ] SLA: Tempo resposta em caso de problema

---

## 🔧 TECNOLOGIAS STACK (Confirmadas)

| Layer | Tech | Status |
|-------|------|--------|
| **Frontend** | React 18 + TypeScript + Tailwind | ✅ |
| **Routing** | Custom router (hash ou history) | ✅ |
| **State** | Nanostores | ✅ |
| **DB** | Supabase (PostgreSQL) | 🔄 Configurar |
| **Auth** | Supabase Auth | 🔄 Testar |
| **Pagamento** | Mercado Pago | 🔄 Testar |
| **Frete** | CorreOS API | 🔄 Integrar |
| **Deploy** | Netlify | 🔄 Configurar |
| **Images** | Supabase Storage | 🔄 Testar |
| **Email** | SendGrid | 🔄 Configurar |
| **Analytics** | Google Analytics 4 | 🔄 Configurar |
| **Monitoring** | Sentry (opcional) | ⏳ Futura |

---

## 📞 PRÓXIMOS PASSOS

1. **Agora**: Responda os status de cada seção acima
2. **Fase 1 (hoje)**: Configurar Supabase + carregar dados
3. **Fase 2 (amanhã)**: Segurança + testes E2E
4. **Fase 3 (amanhã à noite)**: Deploy Netlify + validação final

**Tempo estimado por fase:**
- Dia 1: 6-8 horas
- Dia 2: 4-6 horas
- Dia 3: 2-3 horas (deploy + testes)

---

✅ **Próximo:** Me responda o status de cada item acima para começarmos!
