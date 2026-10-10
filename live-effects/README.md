# Efeitos de live — Intelra

O mascote da Intelra reage aos presentes da live com um efeito cinematográfico de **5 segundos**,
**fundo transparente** e **som**. Todos seguem o mesmo roteiro:

1. Um portal se abre e o mascote é montado pixel por pixel.
2. O presente aparece numa janela holográfica de vidro.
3. O mascote voa até a janela, **puxa o presente para fora da tela** (com ondas no vidro) e a janela
   se desfaz em pixels.
4. Ele reage ao presente, dá tchau e sai voando.

## Presentes

| Tecla | Efeito (`?presente=`) | Presente no TikTok | O que muda | Status |
| --- | --- | --- | --- | --- |
| 1 | `rosa` | Rosa | Rosa vermelha 3D, olhos de coração, corações e pétalas caindo | ✅ liberado |
| 2 | `rosa-branca` | Rosa branca | Rosa branca 3D, olhos de coração brancos, corações brancos, som de sinos | ✅ liberado |
| 3 | `heart-me` | Heart Me | Coração de óculos escuros que pulsa na mão | ✅ liberado |
| 4 | `amo-voce` | Amo você | Coração de pelúcia, bochechas coradas, ondas de coração | 🧪 em teste |
| 5 | `incrivel` | Incrível | Estrela dourada, olhos de estrela, explosão de estrelas e fanfarra | 🧪 em teste |
| 6 | `tiktok` | TikTok | Nota musical ciano/rosa, o mascote dança com uma musiquinha 8-bit | 🧪 em teste |
| 7 | `fogos` | Fogos de artifício | Bola de faíscas arremessada para cima, 4 explosões de fogos | 🧪 em teste |
| 8 | `mini-dino` | Mini dino | Dino de brinquedo 3D que dá um "RAWR!" | 🧪 em teste |
| 9 | `galaxia` | Galáxia | Galáxia numa esfera de vidro que se expande pela tela | 🧪 em teste |

**Liberados** têm vídeo em `videos/` e tocam automaticamente na Fonte de navegador.
**Em teste** já funcionam na página (teclas 4–9 em "Interagir"), mas só tocam sozinhos com
`?efeitos=todos`. Os vídeos deles saem quando forem aprovados (`node tools/render.cjs galaxia …`).

Os presentes interativos (Piscadinha, Palmas, Bastão brilhante etc.) ainda não têm efeito.

## Arquivos

| Pasta / arquivo | Para que serve |
| --- | --- |
| `videos/<efeito>.webm` | Um vídeo por presente liberado (`rosa`, `rosa-branca`, `heart-me`): 1080×1920, 30 fps, **com transparência (alpha)** e som. Para o TikFinity ou uma "Fonte de mídia" do OBS. |
| `videos/preview-todos.mp4` | Os efeitos liberados em sequência, sobre fundo escuro, só para assistir. |
| `presentes/index.html` | **Uma única Fonte de navegador** que toca o efeito certo para cada presente, com o nome de quem mandou. |
| `presentes/assets/` | Objetos 3D dos presentes (PNG transparentes) usados pela página. Mantenha esta pasta junto do `index.html`. |

O canvas é vertical, 1080×1920. O mascote fica no canto inferior esquerdo e a janela à direita, para
não cobrir seu rosto por muito tempo. A galáxia e os fogos ocupam mais espaço da tela, de propósito.

---

### Opção A — TikFinity + vídeos (mais simples)

1. No TikFinity, vá em **Actions & Events → Create new action**.
2. Marque **Play video** e envie o `.webm` do presente (ex.: `videos/galaxia.webm`).
3. Em **Events**, crie um evento **Gift → (o presente)** que dispara essa ação.
4. Repita para cada presente.
5. Adicione no OBS a **URL de overlay** do TikFinity (Fonte de navegador, 1080×1920) **acima** da câmera.

### Opção B — uma Fonte de navegador para todos os presentes (com o nome)

1. OBS → **Fontes → + → Navegador**.
2. Marque **Arquivo local** e escolha `presentes/index.html`.
3. Largura **1080**, altura **1920**. Deixe o CSS padrão (fundo transparente).
4. Marque **Controlar áudio via OBS**.
5. Coloque a fonte **acima** da câmera.

Com o **TikFinity aberto e conectado à live**, a página se liga sozinha ao WebSocket local
(`ws://localhost:21213/`). Cada presente liberado toca o efeito dele, com a legenda
"… @nome". Combos (várias rosas seguidas) tocam uma vez quando o combo termina, mostrando `x10`.
Presentes chegando juntos entram numa fila. Presentes sem efeito são ignorados.

**Testar no OBS:** clique com o botão direito na fonte → **Interagir** e aperte as teclas
**1 a 9** (uma por presente, na ordem da tabela). **Espaço** ou um clique tocam a rosa.
Para posicionar, use `index.html?loop=galaxia`.

#### Se algum presente não disparar

O TikFinity pode mandar o nome do presente em inglês ou com outro texto. Os nomes reconhecidos já
incluem: Rose/Rosa, White Rose/Rosa branca, Heart Me, I Love You/Amo você, Awesome/Incrível, TikTok,
Fireworks/Fogos de artifício, Mini Dino, Galaxy/Galáxia.

1. Abra a fonte com `?debug=1` (ex.: `index.html?debug=1`).
2. Mande ou simule o presente. O canto da tela mostra o **nome exato** que chegou e se ele foi
   ligado a algum efeito.
3. Ligue o nome manualmente com `?map=Nome Exato:efeito`, ex.: `index.html?map=You're Awesome:incrivel`.
   Para ligar vários, separe com `;`.

> O que foi testado: os efeitos, a fila, as teclas e o reconhecimento dos nomes, com um servidor que
> imita os eventos do TikFinity.
> O que não foi testado: uma live de verdade. Antes de entrar ao vivo, faça um teste com o simulador
> de eventos do TikFinity. Se não disparar, use a Opção A.

#### Parâmetros (no fim do caminho, ex.: `index.html?volume=0.6&efeitos=rosa,galaxia`)

| Parâmetro | O que faz |
| --- | --- |
| `loop=galaxia` | Repete um efeito sem parar (para posicionar/testar). |
| `autoplay=fogos` | Toca uma vez ao carregar. |
| `presente=tiktok` | Efeito tocado pelo Espaço/clique. |
| `efeitos=rosa,fogos` | Só esses efeitos tocam automaticamente. Padrão: os liberados. `efeitos=todos` inclui os em teste. |
| `map=Nome:efeito;…` | Liga um nome de presente do TikFinity a um efeito. |
| `debug=1` | Mostra os nomes dos últimos presentes recebidos. |
| `nome=Fulano` | Nome fixo na legenda (útil em testes). |
| `legenda=0` | Nunca mostra a legenda. |
| `som=0` / `volume=0.6` | Sem som / volume de 0 a 1. |
| `fila=10` | Máximo de efeitos esperando na fila. |
| `ws=0` | Desliga a conexão com o TikFinity. |

---

### Regenerar (opcional, para desenvolvedores)

Requer Node 18+, ffmpeg (libvpx-vp9, libopus, libx264) e Playwright com Chromium.

```bash
cd live-effects/tools
npm install
node items.cjs                 # objetos 3D (three.js) -> presentes/assets/*.png + items.js
node render.cjs                # todos os vídeos + preview (ou: node render.cjs galaxia fogos)
node sheet.cjs galaxia folha.png 0.5,1.5,2.5,3.5 4 0.25   # folha de contato para revisar
```

Cada efeito é uma entrada em `GIFTS` no `presentes/index.html` (objeto, cor do brilho, olhos,
partículas, legenda e som). A linha do tempo comum fica em `T`, as posições em `BASE` e `PANEL`,
e o som é sintetizado em `scheduleAudio()`.
