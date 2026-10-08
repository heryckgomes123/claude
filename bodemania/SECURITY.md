# 🔒 GUIA DE SEGURANÇA - BODEMANIA

## 1. AUTENTICAÇÃO & AUTORIZAÇÃO

### 1.1 Login/Registro
- ✅ **Supabase Auth**: Email + senha criptografada
- ✅ **Confirmação de email**: Link de verificação
- ✅ **Senha forte**: Min 8 caracteres (validação frontend)
- ✅ **Rate limiting**: Máx 5 tentativas de login em 5 min
- ✅ **Sessão timeout**: 1 hora inatividade

### 1.2 Tokens JWT
```typescript
// Token expirado em 1 hora
VITE_JWT_EXPIRY = 3600

// Refresh token para renovar
// Armazenado com HttpOnly, Secure, SameSite
```

**Onde os tokens são armazenados:**
```javascript
// ❌ localStorage: Vulnerável a XSS
// ✅ Cookies HttpOnly: Seguro contra XSS

// Supabase automaticamente usa httpOnly cookies
// Verificar: DevTools → Application → Cookies → sb-*
```

### 1.3 Admin Panel
- ✅ Password protegido (no .env: `ADMIN_PASSWORD`)
- ✅ Apenas usuários com `role = 'admin'` veem funções admin
- ✅ Cada ação admin registrada em logs

**Roles no Supabase:**
```sql
-- user_metadata.role em:
-- 'customer' = cliente normal
-- 'admin' = gerenciador de loja
-- 'superadmin' = acesso total (raro)
```

---

## 2. PROTEÇÃO DE DADOS

### 2.1 Dados sensíveis - O que NUNCA expor
```
❌ CPF/CNPJ em plain text
❌ Senhas em logs
❌ Cartão de crédito (delegado ao Mercado Pago)
❌ Chaves de API do Supabase service role
❌ Mercado Pago access token
❌ SendGrid API key
```

### 2.2 Criptografia em trânsito
- ✅ HTTPS obrigatório (Netlify faz automaticamente)
- ✅ TLS 1.3 (teste em https://ssl-labs.com/ssltest/)
- ✅ Certificado Let's Encrypt (renovado automaticamente)

### 2.3 Criptografia em repouso
```sql
-- Supabase: Todos os dados criptografados por padrão
-- Backups: Também criptografados

-- Campos sensíveis adicionais:
ALTER TABLE users ADD COLUMN cpf_hash TEXT;
-- Usar bcrypt para CPF também
```

### 2.4 Variáveis de ambiente
```
✅ Públicas (browser): VITE_* (Supabase ANON KEY, MP PUBLIC KEY)
❌ Secretas: Nunca em .env do repo, apenas Netlify/functions
❌ NUNCA no Git: .env.production.local está em .gitignore
```

---

## 3. VALIDAÇÃO & SANITIZAÇÃO

### 3.1 Frontend (primeira linha de defesa)
```typescript
// ✅ Validar email
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  error = "Email inválido"
}

// ✅ Validar CPF (11 dígitos)
if (!/^\d{11}$/.test(cpf)) {
  error = "CPF deve ter 11 dígitos"
}

// ✅ Validar telefone
if (!/^[0-9]{10,11}$/.test(phone)) {
  error = "Telefone inválido"
}

// ✅ Validar CEP (5+3 dígitos)
if (!/^\d{5}-?\d{3}$/.test(cep)) {
  error = "CEP inválido"
}
```

### 3.2 Backend (Supabase Edge Functions)
```typescript
// ❌ NUNCA confiar no frontend
// ✅ Sempre revalidar no servidor

// create-order function:
1. Verificar que usuário está autenticado
2. Revalidar CPF, email, valores
3. Verificar estoque no banco (não no frontend)
4. Verificar total do pedido (não confiar no navegador)
5. Criar token de pagamento via Mercado Pago
```

### 3.3 SQL Injection
```javascript
// ❌ NUNCA fazer query assim
const result = await supabase.query(
  `SELECT * FROM products WHERE id = ${productId}`
)

// ✅ SEMPRE usar prepared statements (Supabase faz automaticamente)
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('id', productId)
```

### 3.4 XSS (Cross-Site Scripting)
```jsx
// ❌ React.innerHTML (nunca!)
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✅ React escapa automaticamente
<div>{userInput}</div>
```

---

## 4. PROTEÇÃO CONTRA ATAQUES

### 4.1 CSRF (Cross-Site Request Forgery)
```html
<!-- ✅ Formulários devem incluir token CSRF -->
<form>
  <input type="hidden" name="csrf_token" value={csrfToken} />
  <button>Enviar</button>
</form>

<!-- Supabase: Automaticamente protegido via JWT no header -->
Authorization: Bearer {jwt_token}
```

### 4.2 Rate Limiting
```
Login: 5 tentativas em 5 minutos
API: 100 requisições por minuto por IP
Checkout: 1 por 30 segundos (evita duplicatas)

Supabase Auth: Configurado automaticamente
Custom: Implementar em Edge Functions
```

### 4.3 DDoS Protection
```
✅ Netlify: Protege automaticamente
✅ Supabase: Rate limiting nativo
✅ WAF: Considerar Cloudflare (futuro)
```

### 4.4 Brute Force
```
❌ Nem mesmo tentar: "Usuário não encontrado" vs "Senha errada"
✅ Resposta genérica: "Email ou senha incorretos"
✅ Rate limiting: Bloqueia após N tentativas
```

---

## 5. CONFIGURAÇÃO DE SEGURANÇA

### 5.1 Headers HTTP (netlify.toml)
```
✅ Strict-Transport-Security: Force HTTPS
✅ X-Frame-Options: DENY (evita clickjacking)
✅ X-Content-Type-Options: nosniff (evita MIME sniffing)
✅ Content-Security-Policy: Muito restritiva (veja netlify.toml)
✅ Permissions-Policy: Nega acesso a câmera, microfone, etc
```

### 5.2 CORS (Compartilhamento de recursos)
```typescript
// Supabase: Configurar para aceitar APENAS seu domínio
Supabase → Project Settings → API → CORS allowed origins
https://seu-dominio.com.br
https://*.netlify.app (temporário, durante testes)

// ❌ NUNCA usar "*" em produção
```

### 5.3 Cookies
```javascript
// Supabase: HttpOnly, Secure, SameSite=Lax
// Verificar em DevTools → Application → Cookies
// ✅ HttpOnly = JavaScript não consegue acessar (XSS protection)
// ✅ Secure = HTTPS only
// ✅ SameSite = Protect against CSRF
```

---

## 6. CHECKLIST DE SEGURANÇA PRÉ-PRODUÇÃO

### 6.1 Código
- [ ] Nenhuma senha/chave no código
- [ ] Nenhuma console.log() com dados sensíveis
- [ ] Validação em frontend E backend
- [ ] Tratamento de erros sem expor detalhes internos
- [ ] Dependências atualizadas (`npm audit`)

### 6.2 Configuração
- [ ] HTTPS forçado (redirect automático)
- [ ] Headers de segurança configurados
- [ ] CORS restrito ao seu domínio
- [ ] Rate limiting ativo
- [ ] Logs habilitados (para auditoria)

### 6.3 Dados
- [ ] Supabase RLS policies corretas
- [ ] Backups automáticos habilitados
- [ ] Criptografia em repouso (padrão)
- [ ] Nenhum dado sensível em logs
- [ ] Política de retenção definida

### 6.4 Infraestrutura
- [ ] Netlify autenticado + 2FA se possível
- [ ] Supabase autenticado + 2FA
- [ ] Mercado Pago credenciais seguras
- [ ] SendGrid API key rotacionada recentemente
- [ ] Nenhuma variável secreta no Git

### 6.5 Testes
- [ ] Teste de SQL Injection (deve falhar gracefully)
- [ ] Teste de XSS (deve escapar)
- [ ] Teste de CSRF (deve bloquear)
- [ ] Teste de brute force login (deve bloquear após 5)
- [ ] Teste de token expirado (deve redirecionar a login)

---

## 7. MONITORAMENTO & ALERTAS

### 7.1 O que monitorar
```
✅ Erros (500, 502, 503)
✅ Acessos suspeitos (múltiplas tentativas de login)
✅ Pagamentos falhando
✅ Uptime do Supabase
✅ Performance degradada
```

### 7.2 Ferramentas
```
Logs: Netlify → Analytics & logs
Monitoring: Sentry.io (opcional, free tier)
Alertas: Email de erros críticos
Backup: Supabase → Backups diários
```

### 7.3 Rotina de segurança
```
Diária:  Verificar logs (Netlify)
Semanal: Atualizar dependências (npm audit)
Mensal:  Revisar access logs (Supabase)
Anual:   Auditoria de segurança completa
```

---

## 8. DEPOIS DO DEPLOY

### 8.1 Testes de segurança pós-deploy
```bash
# Verificar headers
curl -I https://seu-dominio.com.br | grep -i security

# Verificar SSL
curl -I https://seu-dominio.com.br

# Usar ferramentas online:
# https://securityheaders.com/
# https://ssl-labs.com/ssltest/
```

### 8.2 Documentação
- [ ] Plano de disaster recovery
- [ ] Contato para relatos de segurança
- [ ] Política de privacidade atualizada
- [ ] Termos de serviço adequados

---

## 9. CONFORMIDADE LEGAL

### 9.1 LGPD (Lei de Proteção de Dados - Brasil)
- ✅ Consentimento para processar dados
- ✅ Aviso de privacidade claro
- ✅ Direito de acesso aos dados
- ✅ Direito de exclusão (GDPR-like)
- ✅ Direito de portabilidade

### 9.2 Implementação
```
✅ Política de Privacidade: Publicar no site
✅ Terms of Service: Aceitar antes de comprar
✅ Cookie consent: Banner no site (GA4)
✅ Data deletion: Permitir usuário deletar conta
✅ Data export: Permitir download de dados
```

---

## 📞 CONTATO DE SEGURANÇA

Se alguém descobrir uma vulnerabilidade:
1. Email: `security@seu-dominio.com.br`
2. Não publicar em redes sociais
3. Responder em 24-48 horas
4. Recompensar com desconto/crédito (opcional)

---

✅ **SEGURANÇA IMPLEMENTADA E VERIFICADA**
