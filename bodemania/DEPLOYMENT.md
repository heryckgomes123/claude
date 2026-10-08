# 🚀 GUIA DE DEPLOYMENT - BODEMANIA

## 1️⃣ PRÉ-REQUISITOS

- [ ] Conta Netlify criada (netlify.com)
- [ ] Repositório Git com código (local ou GitHub)
- [ ] Projeto Supabase criado e configurado
- [ ] Domínio pronto para apontar (ou usar domínio Netlify temporário)
- [ ] Credenciais Mercado Pago coletadas

---

## 2️⃣ PREPARAR AMBIENTE LOCAL

### 2.1 Instalar dependências
```bash
cd bodemania
npm install
```

### 2.2 Configurar .env.production
```bash
# Copiar template
cp .env.production.example .env.production.local

# Preencher com valores reais (não commitar!)
nano .env.production.local
```

**Valores necessários:**
- `VITE_SUPABASE_URL` → De Settings → API
- `VITE_SUPABASE_ANON_KEY` → De Settings → API
- `VITE_MP_PUBLIC_KEY` → Do Mercado Pago (pública apenas)
- `VITE_GA_ID` → Do Google Analytics
- Outros: Instagram, WhatsApp, Site URL

### 2.3 Testar build local
```bash
npm run build

# Verificar tamanho
ls -lh dist/

# Testar servir localmente
npm run preview
```

✅ Build deve completar sem erros
✅ Arquivo `dist/index.html` deve existir
✅ Tamanho gzip < 400KB

---

## 3️⃣ SUPABASE (banco, funções e segredos)

Tudo roda de dentro da pasta `bodemania/`. Antes, confirme localmente:
```bash
npm test && npm run test:db   # 105 testes: regras de preço, RLS, pedidos, pagamento, seed
```

### 3.1 Criar e ligar o projeto
1. supabase.com → New project → região **South America (São Paulo)**
2. Terminal:
```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF   # Settings → General → Reference ID
```

### 3.2 Tabelas, RLS, funções SQL, storage e cron
```bash
npx supabase db push   # aplica supabase/migrations/* (inclui RLS e buckets de fotos)
```

### 3.3 Produtos
```bash
npm run seed:sql       # gera supabase/seed.sql a partir de src/data/seedProducts.ts
```
Cole o conteúdo de `supabase/seed.sql` no **SQL Editor** do Supabase e rode.
Pode rodar de novo sem medo: não duplica nem sobrescreve o que foi editado no painel.

### 3.4 Segredos das Edge Functions (ficam no Supabase, NUNCA na Netlify)
```bash
cp supabase/functions/.env.example supabase/functions/.env   # já está no .gitignore
# preencha MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, RESEND_API_KEY, ME_TOKEN, ORIGIN_CEP...
npx supabase secrets set --env-file supabase/functions/.env
```

### 3.5 Publicar as Edge Functions
```bash
npx supabase functions deploy create-order mp-webhook shipping-quote admin-order
```
(`verify_jwt = false` vem do `supabase/config.toml`: as funções validam o usuário no código e o webhook valida a assinatura do Mercado Pago.)

### 3.6 Autenticação (Authentication → URL Configuration)
- **Site URL:** `https://seu-dominio.com.br`
- **Redirect URLs:** `https://seu-dominio.com.br/redefinir-senha` e `https://*.netlify.app/**` (deploy previews)

### 3.7 Webhook do Mercado Pago
Mercado Pago → Suas integrações → Webhooks:
- **URL:** `https://SEU_PROJECT_REF.supabase.co/functions/v1/mp-webhook`
- **Evento:** Pagamentos
- Copie a **assinatura secreta** para `MP_WEBHOOK_SECRET` e rode o `secrets set` de novo.
  Sem ela o webhook recusa tudo e nenhum pedido é marcado como pago.

### 3.8 Criar o administrador
1. Crie a conta normalmente no site (`/entrar`).
2. No SQL Editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'email-do-dono@exemplo.com');
```
3. Painel em `https://seu-dominio.com.br/admin`.

---

## 4️⃣ SETUPAR NETLIFY

### 4.1 Conectar repositório
1. Acessar netlify.com
2. "Add new site" → "Import an existing project"
3. Selecionar provedor Git (GitHub, GitLab, etc)
4. Selecionar o repositório

### 4.2 Configurar build
```
Base directory:    bodemania      ← obrigatório: a raiz do repositório tem outro projeto
Build command:     npm run build  (já vem do netlify.toml)
Publish directory: dist           (já vem do netlify.toml)
```

### 4.3 Adicionar variáveis de ambiente
Netlify → Site configuration → Environment variables. Modelo completo em `.env.production.example`.

```
VITE_SITE_URL = https://seu-dominio.com.br
VITE_SUPABASE_URL = https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
VITE_MP_PUBLIC_KEY = APP_USR-...
VITE_INSTAGRAM_URL = https://instagram.com/lojabodemania
VITE_WHATSAPP_NUMBER = 5567999113636
VITE_ORIGIN_CEP = 00000000
VITE_GA_ID = G-XXXXXXXXXX
```

Todas são **públicas** (vão para o navegador). A Netlify **não** precisa de nenhum segredo:
service role, token do Mercado Pago e chave do Resend ficam no Supabase (passo 3.4).

> Sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` o site sobe em **modo demonstração**
> (tudo no navegador, pedidos não chegam a lugar nenhum). Confira antes de divulgar.

### 4.4 Deploy
- [ ] Clicar "Deploy site"
- [ ] Aguardar build completar (2-3 minutos)
- [ ] Acessar URL gerada (ex: `https://xxx.netlify.app`)

---

## 5️⃣ APONTAR DOMÍNIO

### 5.1 Se usar domínio registrado em outro lugar:
1. Netlify → Site settings → Custom domain
2. Adicionar seu domínio
3. Usar nameservers do Netlify OU apontamento CNAME

### 5.2 Registrador de domínio (ex: GoDaddy, Namecheap):
```
CNAME: seu-dominio.com.br → xxx.netlify.app
OU
Nameservers Netlify: (fornecidos pelo Netlify)
```

### 5.3 Certificado SSL
- ✅ Netlify cria automaticamente (Let's Encrypt)
- [ ] Aguardar 5-10 minutos para provisionar
- [ ] Testar HTTPS no navegador

---

## 6️⃣ TESTES EM PRODUÇÃO

### 6.1 Verificar acesso
```bash
# Checar se site carrega
curl -I https://seu-dominio.com.br

# Verificar headers de segurança
curl -I https://seu-dominio.com.br | grep -i "content-security\|x-frame\|strict-transport"
```

### 6.2 Teste manual no navegador
- [ ] Acessar home → Carrega em < 3s
- [ ] Clicar em "Loja" → Produtos aparecem
- [ ] Pesquisar produto → Funciona
- [ ] Adicionar ao carrinho → Persiste
- [ ] Abrir checkout → digitar CEP preenche o endereço e o frete calcula
- [ ] Fazer compra teste (Pix e cartão de teste do Mercado Pago) → pedido aparece em /conta
- [ ] Confirmar pagamento → Email recebido
- [ ] Admin (/admin) → Ver pedido criado e mudar status
- [ ] Testar mobile (iPhone, Android)
- [ ] DevTools → Console sem erros "Content Security Policy"

### 6.3 Verificar segurança
```bash
# Usando ferramentas online:
# - https://securityheaders.com/ → Cole seu domínio
# - https://ssl-labs.com/ssltest/ → Verificar SSL
# - https://pagespeed.web.dev/ → Performance
```

**Esperado:**
- Security Headers: A+ ou A
- SSL: A ou A+
- Performance: > 90 no desktop

### 6.4 Testar email (opcional)
- Fazer conta → Verificar email confirmação
- Reset senha → Email de reset chega
- Fazer pedido → Email de confirmação chega

---

## 7️⃣ OTIMIZAÇÕES (Opcional mas recomendado)

### 7.1 Ativar Gzip no Netlify
Netlify faz automaticamente, mas verificar:
```bash
curl -I https://seu-dominio.com.br | grep -i content-encoding
# Deve aparecer: content-encoding: gzip
```

### 7.2 Ativar cache inteligente
Seu `netlify.toml` já tem, apenas confirmando:
- HTML: Sem cache (always fresh)
- Assets (JS/CSS): 1 ano (versionado por Vite)

### 7.3 Monitorar performance
- Google Analytics: Ver "Conversion" no GA
- Netlify Analytics: Logs de requisição
- Sentry (opcional): Erros em produção

---

## 8️⃣ TROUBLESHOOTING

### Problema: "Build failed"
```bash
# Verificar logs
netlify logs [site-id]

# Comum: Falta variável de ambiente
# Solução: Adicionar em Netlify → Settings → Environment
```

### Problema: "Blank white page"
```bash
# Abrir DevTools (F12) → Console
# Se erro de Supabase: verificar VITE_SUPABASE_URL
# Se "Refused to connect/load ... Content Security Policy": domínio novo precisa entrar no netlify.toml
```

### Problema: "Produtos não carregam"
```bash
# Verificar:
# 1. Supabase online (status.supabase.com)
# 2. Tabela 'products' tem dados
# 3. RLS policies permitem leitura pública
```

### Problema: "Pagamento não funciona"
```bash
# Verificar:
# 1. VITE_MP_PUBLIC_KEY (Netlify) e MP_ACCESS_TOKEN (Supabase) do MESMO ambiente (teste ou produção)
# 2. Pedido fica "aguardando pagamento": conferir URL do webhook e MP_WEBHOOK_SECRET (passo 3.7)
# 3. Logs: Supabase → Edge Functions → mp-webhook → Logs
```

### Problema: "HTTPS aviso de segurança"
```bash
# Aguardar 10 minutos após adicionar domínio
# Se persistir: Limpar cache do navegador
# Force refresh: Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
```

---

## 9️⃣ DEPOIS DO DEPLOY

### 9.1 Monitoramento contínuo
- [ ] Google Analytics: Acompanhar vendas
- [ ] Netlify Logs: Monitorar erros
- [ ] Supabase: Ver crescimento de dados
- [ ] Alertas: Configurar notificação se site cair

### 9.2 Backup & Disaster Recovery
```bash
# Backup automático Supabase
Supabase → Settings → Backups → Daily

# GitHub backup (se usar Git)
git push origin main

# Imagens backup
Supabase Storage → versionar ou replicar
```

### 9.3 Updates futuros
```bash
# Para fazer uma alteração:
git commit -m "..."
git push origin main

# Netlify faz deploy automaticamente
# Ver status: Netlify → Deploys
```

---

## 📞 CHECKLIST FINAL

Antes de entregar ao cliente:

- [ ] Site acessível pelo domínio correto
- [ ] HTTPS funcionando (sem avisos)
- [ ] Todos os produtos carregando
- [ ] Compra teste finalizada com sucesso
- [ ] Email de confirmação recebido
- [ ] Admin acessível e funcional
- [ ] Performance OK (Lighthouse > 90)
- [ ] Segurança OK (Security Headers A+)
- [ ] Mobile responsivo (testado em 2+ dispositivos)
- [ ] Dark mode funcionando (se aplicável)
- [ ] Documentação entregue
- [ ] Credenciais admin compartilhadas com segurança
- [ ] Plano de suporte definido

---

✅ **PRONTO PARA PRODUÇÃO!**
