# Efeitos de live — Intelra

## 🌹 Rosa (`rosa-intelra/`)

Quando alguém manda uma **Rosa** na live, o mascote da Intelra sai de um portal, vê a rosa numa
janela holográfica, voa até ela, **puxa a rosa para fora da tela** (com ondas no vidro e a janela se
desfazendo em pixels), fica com olhos de coração e depois dá tchau e sai voando. Dura **5 segundos**,
tem **fundo transparente** e já vem **com som**.

| Arquivo | Para que serve |
| --- | --- |
| `rosa-intelra.webm` | Vídeo 1080×1920, 60 fps, **com transparência (alpha)** e som. Use no TikFinity, Streamer.bot ou numa "Fonte de mídia" do OBS. |
| `index.html` | O mesmo efeito como **Fonte de navegador** do OBS. Mostra o nome de quem mandou e pode tocar sozinho via TikFinity. |
| `rosa-intelra-preview.mp4` | Só para assistir (fundo escuro, sem transparência). |
| `rose.png` | A rosa 3D realista usada no efeito (fundo transparente). |

O canvas é vertical, 1080×1920. O mascote fica no canto inferior esquerdo e a rosa à direita, para
não cobrir o seu rosto por muito tempo.

---

### Opção A — TikFinity + vídeo (mais simples)

1. No TikFinity, vá em **Actions & Events → Create new action**.
2. Marque **Play video** e envie o arquivo `rosa-intelra.webm`.
3. Em **Events**, crie um evento **Gift → Rose** que dispara essa ação.
4. Adicione no OBS a **URL de overlay** do TikFinity (Fonte de navegador, 1080×1920) **acima** da sua câmera.

O WebM mantém a transparência, então só aparecem o mascote, a rosa e os efeitos.

### Opção B — Fonte de navegador com o nome de quem mandou (automático)

1. OBS → **Fontes → + → Navegador**.
2. Marque **Arquivo local** e escolha `rosa-intelra/index.html`.
3. Largura **1080**, altura **1920**. Deixe o CSS personalizado padrão (fundo transparente).
4. Marque **Controlar áudio via OBS** para o som aparecer no mixer.
5. Coloque a fonte **acima** da câmera.

Com o **TikFinity aberto e conectado à sua live**, a página se liga sozinha no WebSocket local do
TikFinity (`ws://localhost:21213/`). Toda Rosa toca o efeito com a legenda
**"Obrigado pela rosa 🌹 @nome"**. Combos (várias rosas seguidas) tocam uma vez só quando o combo
termina, mostrando `x10`, `x50` etc. Se chegarem várias rosas ao mesmo tempo, elas entram numa fila.

> O que foi testado: o efeito, a fila, os disparos manuais e a detecção de presentes, com um
> servidor que imita os eventos do TikFinity (`event: "gift"`, `giftName`, `nickname`, `repeatEnd`).
> O que não foi testado: uma live de verdade. Antes de entrar ao vivo, teste com um presente real ou
> com o simulador de eventos do TikFinity. Se não disparar, use a Opção A.

**Testar no OBS:** clique com o botão direito na fonte → **Interagir** → clique na tela ou aperte
**Espaço**. Você também pode adicionar `?loop=1` no fim do caminho para o efeito ficar repetindo
enquanto posiciona.

#### Parâmetros (adicione no fim do caminho/URL, ex.: `index.html?volume=0.6&fila=5`)

| Parâmetro | O que faz |
| --- | --- |
| `loop=1` | Repete sem parar (para posicionar/testar). |
| `autoplay=1` | Toca uma vez ao carregar. Junto com "Atualizar navegador quando a cena ficar ativa", serve para disparar mostrando/ocultando a fonte (Streamer.bot, Macro etc.). |
| `nome=Fulano` | Nome fixo na legenda (útil em testes). |
| `legenda=0` | Nunca mostra a legenda. |
| `som=0` / `volume=0.6` | Sem som / volume de 0 a 1. |
| `presente=Rose,Rosa` | Nome(s) do presente que dispara. |
| `giftId=5655` | Dispara pelo ID do presente em vez do nome. |
| `fila=10` | Máximo de efeitos esperando na fila. |
| `ws=0` | Desliga a conexão com o TikFinity. |

---

### Regenerar (opcional, para desenvolvedores)

Requer Node 18+, ffmpeg (com libvpx-vp9 e libopus) e Playwright com Chromium.

```bash
cd live-effects/tools
npm install
node rose3d.cjs     # gera a rosa 3D (three.js) e embute no index.html
node render.cjs     # exporta rosa-intelra.webm + preview (use --prores para .mov ProRes 4444)
node sheet.cjs ../rosa-intelra/index.html folha.png 0.5,1.5,2.5,3.5 4 0.25   # folha de contato
```

A animação inteira é desenhada em código (`draw(t)` em `index.html`). A linha do tempo fica no objeto
`T`, as posições ficam em `BASE`, `REACH` e `PANEL`, e o som é sintetizado em `scheduleAudio()`.
