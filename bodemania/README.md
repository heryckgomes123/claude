# Bodemania — Loja virtual (v0.1)

E-commerce da **Bodemania**: artigos maçônicos + ateliê de impressão 3D.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion — a mesma do site da INTELRA.

## Arquivo único para testes

`Bodemania-teste.html` (nesta pasta) é a loja inteira em **um só arquivo**: abra no Chrome, Safari, Edge ou Firefox em
qualquer computador ou celular, sem instalar nada e sem internet (só a busca de CEP usa a internet;
offline, o endereço é preenchido à mão).

Para gerar de novo depois de mexer no código:

```bash
npm install
npm run build:single          # gera dist-single/index.html
                              # e atualiza Bodemania-teste.html
```

Dicas de teste:

| O quê | Como |
| --- | --- |
| Cartão aprovado | `4111 1111 1111 1111`, validade futura, qualquer CVV |
| Cartão recusado | `4000 0000 0000 0002` |
| Pix / boleto | Na página do pedido, botão **“Demonstração: simular pagamento”** |
| Cupons | `BEMVINDO10` (10%), `IRMAO15` (15% acima de R$ 400), `FRETEGRATIS` (acima de R$ 150) |
| CPF válido de teste | `529.982.247-25` |
| Orçamento 3D sem arquivo | Botão **“Testar com um arquivo de exemplo”** |
| Painel da loja | `#/admin` · senha `bodemania` — avança o pedido: pago → produção → enviado (gera rastreio) → entregue |

> Cada navegador guarda os próprios dados (carrinho, contas e pedidos ficam no `localStorage` do aparelho).

## O que já funciona

- **Vitrine:** home com os dois universos (Maçonaria / 3D), 9 categorias, 28 produtos, busca com sugestões,
  filtros (universo, categoria, preço, personalizáveis, promoção) e ordenação.
- **Produto:** variações (rito, cor, aro, tamanho…) que mudam preço e a cor da ilustração, personalização por
  texto, **envio de foto** (lithophane), cálculo de frete e prazo por CEP, favoritos, barra de compra fixa no celular.
- **Orçamento 3D instantâneo:** lê o STL no navegador, mostra prévia 3D girando, medidas, volume, gramas,
  tempo, preço por material/qualidade/preenchimento/escala/quantidade (com desconto progressivo) e
  verifica se cabe na impressora. Também aceita orçamento por medidas aproximadas.
- **Carrinho:** gaveta lateral + página completa, barra de frete grátis, cupons.
- **Conta:** cadastro (validação de CPF, celular, senha), login, endereços, dados pessoais, histórico de pedidos.
- **Checkout em 3 passos:** identificação → entrega (CEP com ViaCEP, endereços salvos, PAC/SEDEX/retirada,
  prazo com produção incluída) → pagamento (Pix com 5% off, cartão com validação e parcelas, boleto).
- **Pós-compra:** Pix “copia e cola” real (padrão BR Code do Banco Central) + QR Code, linha do tempo do pedido,
  rastreio dos Correios, entrega digital (serviços de modelagem) com download, rastreio por número + e-mail.
- **Institucional:** sobre, FAQ, trocas (CDC), entrega, privacidade (LGPD), termos, banner de cookies, WhatsApp.
- **100% responsivo:** testado de 320 px a 1440 px, barra de navegação inferior no celular.

## Configuração (`.env`)

| Variável | Uso |
| --- | --- |
| `VITE_WHATSAPP_NUMBER` | WhatsApp de atendimento (só dígitos, com 55 + DDD) |
| `VITE_PIX_KEY` | Chave Pix que recebe os pagamentos |
| `VITE_ORIGIN_CEP` | CEP de onde saem as encomendas (frete) |
| `VITE_SITE_URL`, `VITE_INSTAGRAM_URL` | URL pública e Instagram |

Razão social, CNPJ e o modo demonstração ficam em `src/config/store.ts`. Regras de frete em
`src/lib/shipping.ts`; preço da impressão 3D em `src/lib/print3d.ts`; produtos em `src/data/catalog.ts`.

## Indo para produção — plano de 10 dias

O front-end está pronto. O que falta é trocar o “backend de mentira” (`src/state/shop.ts`, que salva no
navegador) por serviços reais. Sugestão:

| Dia | Entrega |
| --- | --- |
| 1 | Domínio, CNPJ/razão social no `.env`, fotos reais dos produtos (troca `ProductArt` por `<img>`), deploy na Vercel |
| 2–3 | **Backend:** Supabase (login, banco de produtos/pedidos/endereços, storage de fotos e STL) |
| 4–5 | **Pagamentos:** Mercado Pago ou Pagar.me — Pix dinâmico, cartão tokenizado e boleto + webhook que marca o pedido como pago |
| 6 | **Frete real:** Melhor Envio (cotação Correios/Jadlog e etiqueta) |
| 7 | E-mails transacionais (Resend) e aviso no WhatsApp a cada mudança de status |
| 8 | Painel admin com login real, cadastro de produtos e estoque |
| 9 | Nota fiscal (Bling / Tiny / eNotas), Google Analytics/Meta Pixel com consentimento |
| 10 | Teste de compra real ponta a ponta, revisão jurídica das políticas e lançamento |

## Rodando

```bash
npm install
npm run dev        # desenvolvimento
npm run build      # site para hospedar (dist/)
npm run preview
```

## Estrutura

```text
src/
├── App.tsx              # rotas (hash: #/loja, #/p/slug…) — funciona até abrindo o arquivo do disco
├── router.tsx
├── config/store.ts      # nome, CNPJ, WhatsApp, Pix, regras (frete grátis, desconto Pix, parcelas), cupons
├── data/catalog.ts      # categorias e produtos
├── state/shop.ts        # carrinho, contas, pedidos e status — o "contrato" da futura API
├── lib/                 # máscaras, validações (CPF, cartão), frete por CEP, Pix BR Code, leitor de STL
├── components/          # Header, CartDrawer, ProductCard, ProductArt (ilustrações SVG), MeshPreview…
└── pages/               # Home, Catalog, ProductPage, Quote3D, CartPage, Checkout, OrderPage, Account, Admin…
```
