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

## 3️⃣ SETUPAR NETLIFY

### 3.1 Conectar repositório
1. Acessar netlify.com
2. "Add new site" → "Import an existing project"
3. Selecionar provedor Git (GitHub, GitLab, etc)
4. Selecionar repositório `bodemania`

### 3.2 Configurar build
```
Build command: npm run build
Publish directory: dist
```

### 3.3 Adicionar variáveis de ambiente
Netlify → Site settings → Build & deploy → Environment

Adicionar estas variáveis:

```
VITE_SITE_URL = https://seu-dominio.com.br
VITE_SUPABASE_URL = https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
VITE_MP_PUBLIC_KEY = APP_USR_...
VITE_INSTAGRAM_URL = https://instagram.com/lojabodemania
VITE_WHATSAPP_NUMBER = 67999113636
VITE_GA_ID = G-XXXXXXXXXX
```

**Variáveis secretas (marcar como "Sensitive"):**
```
SUPABASE_SERVICE_ROLE_KEY = eyJ... (se usar functions)
MERCADO_PAGO_ACCESS_TOKEN = APP_...
SENDGRID_API_KEY = SG...
ADMIN_EMAIL = seu-email@empresa.com.br
```

### 3.4 Deploy
- [ ] Clicar "Deploy site"
- [ ] Aguardar build completar (2-3 minutos)
- [ ] Acessar URL gerada (ex: `https://xxx.netlify.app`)

---

## 4️⃣ APONTAR DOMÍNIO

### 4.1 Se usar domínio registrado em outro lugar:
1. Netlify → Site settings → Custom domain
2. Adicionar seu domínio
3. Usar nameservers do Netlify OU apontamento CNAME

### 4.2 Registrador de domínio (ex: GoDaddy, Namecheap):
```
CNAME: seu-dominio.com.br → xxx.netlify.app
OU
Nameservers Netlify: (fornecidos pelo Netlify)
```

### 4.3 Certificado SSL
- ✅ Netlify cria automaticamente (Let's Encrypt)
- [ ] Aguardar 5-10 minutos para provisionar
- [ ] Testar HTTPS no navegador

---

## 5️⃣ TESTES EM PRODUÇÃO

### 5.1 Verificar acesso
```bash
# Checar se site carrega
curl -I https://seu-dominio.com.br

# Verificar headers de segurança
curl -I https://seu-dominio.com.br | grep -i "content-security\|x-frame\|strict-transport"
```

### 5.2 Teste manual no navegador
- [ ] Acessar home → Carrega em < 3s
- [ ] Clicar em "Loja" → Produtos aparecem
- [ ] Pesquisar produto → Funciona
- [ ] Adicionar ao carrinho → Persiste
- [ ] Abrir checkout → Frete calcula
- [ ] Fazer compra teste → Redireciona para Mercado Pago
- [ ] Confirmar pagamento → Email recebido
- [ ] Admin (#/admin) → Ver pedido criado
- [ ] Testar mobile (iPhone, Android)
- [ ] Testar dark mode

### 5.3 Verificar segurança
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

### 5.4 Testar email (opcional)
- Fazer conta → Verificar email confirmação
- Reset senha → Email de reset chega
- Fazer pedido → Email de confirmação chega

---

## 6️⃣ OTIMIZAÇÕES (Opcional mas recomendado)

### 6.1 Ativar Gzip no Netlify
Netlify faz automaticamente, mas verificar:
```bash
curl -I https://seu-dominio.com.br | grep -i content-encoding
# Deve aparecer: content-encoding: gzip
```

### 6.2 Ativar cache inteligente
Seu `netlify.toml` já tem, apenas confirmando:
- HTML: Sem cache (always fresh)
- Assets (JS/CSS): 1 ano (versionado por Vite)
- Imagens: 1 ano

### 6.3 Monitorar performance
- Google Analytics: Ver "Conversion" no GA
- Netlify Analytics: Logs de requisição
- Sentry (opcional): Erros em produção

---

## 7️⃣ TROUBLESHOOTING

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
# Se erro de API: verificar CORS no Supabase
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
# 1. VITE_MP_PUBLIC_KEY correto
# 2. Mercado Pago em modo sandbox (testes)
# 3. Não usar cartão real (usar teste)
```

### Problema: "HTTPS aviso de segurança"
```bash
# Aguardar 10 minutos após adicionar domínio
# Se persistir: Limpar cache do navegador
# Force refresh: Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
```

---

## 8️⃣ DEPOIS DO DEPLOY

### 8.1 Monitoramento contínuo
- [ ] Google Analytics: Acompanhar vendas
- [ ] Netlify Logs: Monitorar erros
- [ ] Supabase: Ver crescimento de dados
- [ ] Alertas: Configurar notificação se site cair

### 8.2 Backup & Disaster Recovery
```bash
# Backup automático Supabase
Supabase → Settings → Backups → Daily

# GitHub backup (se usar Git)
git push origin main

# Imagens backup
Supabase Storage → versionar ou replicar
```

### 8.3 Updates futuros
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
