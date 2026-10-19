# INTELRA Fluxa — automação de conversas

App do ecossistema **INTELRA** para automatizar conversas no Instagram, WhatsApp, Messenger, Telegram e no site.
Inspirado no ManyChat, com construtor visual de fluxos, inbox ao vivo, transmissões, sequências e ferramentas de
crescimento. Também traz recursos que o ManyChat não tem ou cobra à parte.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · React Flow · Zustand · SDK do Claude (Anthropic)

## O que tem

| Módulo | O que faz |
| --- | --- |
| **Painel** | Conversas por dia, execuções, CTR, leads quentes, contatos por canal, automações mais usadas, conversas recentes. |
| **Automações** | Lista com busca e filtros, ativar/pausar (bloqueado se o fluxo tem erro), duplicar, 8 modelos prontos em PT-BR. |
| **Construtor visual** | Canvas com nós de Mensagem (texto, imagem, botões, respostas rápidas), Pergunta (com validação), Condição, Ação, Atraso, IA, Teste A/B e Ir para automação. Salvamento automático. |
| **Gatilhos** | Palavra-chave (contém / começa com / exata, ignora acentos e pontuação), comentário em post com resposta pública, resposta a story, link/QR com ref, **intenção por IA**, boas-vindas e resposta padrão, por canal. |
| **Inbox** | Conversas de todos os canais, pausar a automação e assumir a conversa, respostas salvas, tags e campos editáveis, aviso da janela de 24 h da Meta, enviar uma automação para o contato. |
| **Contatos** | Busca, filtros por canal, tag e temperatura, ações em massa (tag, descadastrar, excluir), importar e exportar CSV. |
| **Transmissões** | Segmentação por canal, tags e pontuação; prévia; envio imediato ou agendado; respeita a janela de 24 h e mostra quem fica de fora. |
| **Sequências** | Mensagens em etapas com atrasos; inscrição pela ação “Inscrever em sequência” ou manual. |
| **Crescimento** | Links (ig.me, wa.me, m.me, t.me), QR code em PNG e botão HTML para o site, com contagem de entradas. |
| **Configurações** | Marca, contas dos canais, IA, respostas salvas, backup/restauração, recarregar a demonstração ou começar do zero. |

### Melhorias em relação ao ManyChat

- **Gatilho por intenção com IA**: responde ao que a pessoa quer dizer, não só à palavra exata.
- **Nó de IA**: responde com base nas orientações do negócio ou classifica a mensagem em caminhos. Sempre tem um texto
  alternativo, então o fluxo funciona mesmo sem IA.
- **Simulador ao vivo** dentro do construtor, com mensagem, comentário, story e link; o caminho percorrido acende no canvas.
- **Verificação do fluxo**: aponta passos soltos, botões sem destino, links inválidos, pesos de A/B errados e mais. A
  automação só é ativada sem erros.
- **Pontuação de lead** com temperatura (frio/morno/quente) e aviso ao time quando o lead esquenta.
- **Mapa de passagem**: cada nó mostra quantos contatos passaram por ele.
- **Teste A/B nativo** com distribuição real por variante.
- **Sugestão de resposta e resumo da conversa com IA** no inbox.
- **Webhook** em qualquer fluxo para CRM, planilhas, Zapier ou Make.
- Tudo em português, com modelos prontos para o mercado brasileiro.

## Rodando

```bash
cd apps/fluxa
npm install
npm run dev        # desenvolvimento
npm test           # testes do motor de fluxos, gatilhos e runtime
npm run build      # typecheck + build de produção em dist/
```

O primeiro acesso carrega dados de demonstração. Para começar limpo: **Configurações → Começar do zero**.

## IA (Claude)

Em **Configurações → Inteligência artificial**, cole uma chave da API da Anthropic. O modelo padrão é o Claude Opus 5.5
(dá para trocar por Sonnet 5.5 ou Haiku 5.5). Sem chave, o Fluxa usa um classificador local por similaridade de palavras
e os textos alternativos dos nós de IA.

A chave fica salva só no navegador e vai direto para a API da Anthropic; ela não entra nos backups. Em produção, mova as
chamadas de `src/lib/ai.ts` para um backend.

## Estrutura

```text
src/
├── lib/
│   ├── engine.ts      # motor de fluxos (puro, testado): executa nós, valida respostas, aplica ações
│   ├── triggers.ts    # escolha da automação por evento, com prioridade entre gatilhos
│   ├── flow.ts        # saídas dos nós, criação de nós e verificação do fluxo
│   ├── ai.ts          # Claude + classificador local
│   ├── audience.ts    # segmentos, janela de 24 h, links de crescimento, CSV
│   └── types.ts       # modelo de dados
├── store/
│   ├── store.ts       # estado persistido (localStorage)
│   ├── runtime.ts     # liga o motor às conversas: efeitos, atrasos, sequências, transmissões agendadas
│   └── seed.ts        # dados de demonstração
├── data/templates.ts  # modelos de automação
├── pages/             # Painel, Automações, Inbox, Contatos, Transmissões, Sequências, Crescimento, Configurações
│   └── builder/       # construtor visual (canvas, nós, inspetor, gatilhos, simulador)
└── components/        # UI da marca INTELRA, chat, gráficos
```

## Limites desta versão

Esta versão roda inteira no navegador. Você testa os fluxos no simulador e no inbox (com “Simular mensagem do contato”),
mas ela **ainda não envia mensagens para clientes reais**. Para isso falta o servidor de integração:

1. Webhooks da Meta (Instagram, Messenger, WhatsApp Cloud API) e do Telegram recebendo as mensagens.
2. O mesmo `engine.ts` e `triggers.ts` rodando no servidor, com banco de dados no lugar do localStorage.
3. Envio pelas APIs oficiais, com os modelos de mensagem aprovados do WhatsApp para falar fora da janela de 24 h.
4. Revisão do app pela Meta (permissões `instagram_manage_messages`, `pages_messaging`, `whatsapp_business_messaging`).

O motor já está separado da interface justamente para essa etapa.

## Deploy

Site estático (rotas por hash, sem necessidade de rewrites). Na Vercel, crie um projeto apontando para o mesmo
repositório com **Root Directory = `apps/fluxa`**; o framework Vite é detectado automaticamente.
