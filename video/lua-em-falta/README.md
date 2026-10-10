# LUA EM FALTA — reel cinematográfico (9:16, 19,7 s)

Uma noite a lua sumiu do céu. Ela virou a cabeça de um andarilho solitário, que atravessa
14 mundos surreais até devolvê-la pela janela do quarto.

O formato veio do reel de referência: intro com flashes rápidos, um corte por batida, colagens
surreais e grão de filme. As imagens, a trilha e a história são novas. Tudo é gerado por código
(numpy + Pillow + ffmpeg), sem fotos, sem banco de imagens e sem marca d'água.

`lua-em-falta.mp4` é o vídeo final (720×1280, 30 fps, H.264 + AAC).

## Ritmo

| Tempo | Batidas (110 BPM) | O que acontece |
| --- | --- | --- |
| 0,0–1,2 s | 0–2,2 | 18 flashes de 2 quadros com as cenas (algumas em negativo ou duotone) e um riser com "ticks" no ritmo dos flashes |
| 1,2–1,6 s | 2,2–3 | cartela **LUA EM FALTA** com split RGB, light leak e um impacto grave |
| 1,6–15,8 s | 3–29 | 13 cenas, uma a cada 2 batidas. O corte cai no bumbo e cada cena entra com um punch-in e um flash curto |
| 15,8–19,7 s | 29–35 | breakdown: a bateria para e a lua sobe na janela com sinos; acorde final e fade para preto |

## Os 14 mundos (tema do original → nova cena)

| # | Tema de referência | Cena nova |
| --- | --- | --- |
| 01 | homem-cervo diante do mar | **Mar sem lua**: mar menta, céu sem lua, a única luz é a cabeça dele |
| 02 | kombi com cometa | **Cometa de passagem**: trailer retrô iluminado no deserto, sob um cometa |
| 03 | ovelha negra no rebanho | **Contra a corrente**: vista aérea na chuva; dezenas de guarda-chuvas pretos descem e só um, vermelho, sobe |
| 04 | explosão nuclear, braços abertos | **Fim do mundo**: um planeta gigante com anéis nascendo no horizonte, céu em brasa |
| 05 | pés no espaço | **Escada pro infinito**: degraus flutuantes que saem das dunas e vão até uma galáxia |
| 06 | cabeça de fumaça no sofá | **Tempo nublado só aqui**: poltrona num campo ensolarado com uma nuvem que chove só nela |
| 07 | cabeça de fita cassete | **Sem sinal**: cabeça de TV com chuvisco num píer em névoa (P&B) |
| 08 | casal se beijando | **Eclipse**: um casal abraçado cujas cabeças (sol e lua) formam um eclipse |
| 09 | tornado com OVNI | **O olho da tempestade**: o farol varre o mar, um vórtice no céu, OVNI e um raio |
| 10 | margarida com borboleta (P&B) | **A única cor**: papoula vermelha num mundo cinza, com uma borboleta batendo as asas |
| 11 | carrossel num campo vazio | **Parque afogado**: roda-gigante meio submersa na névoa, com as luzes ainda acesas |
| 12 | mão se afogando com notificação | **Mil luzes, nenhuma ligação**: um mar de celulares acesos boiando e ele num barco, a única luz quente |
| 13 | (nova) | **Baleia de fim de tarde**: uma baleia flutua sobre a cidade |
| 14 | gato olhando um alien pela janela | **Devolvendo a lua**: no quarto escuro, ele já com cabeça normal, a lua volta ao céu e o gato assiste |

## Linguagem visual

- A paleta muda a cada corte, como no original: menta, âmbar, P&B com vermelho, brasa, cosmos, pastel e azul noturno.
- Cada cena tem algo em movimento: reflexos no mar, poeira, chuva, brasas, estrela cadente, chuvisco da TV,
  vaga-lumes, feixe do farol, raio, borboleta, pássaros, telas piscando, a baleia nadando e a lua subindo.
- Pós-produção: bloom, ombro de filme, pretos lavados, split-toning (sombras frias, luzes quentes),
  aberração cromática, vinheta, grão animado, poeira de película e um leve gate weave na câmera.

## Trilha original (`music.py`)

A trilha é lo-fi/indie em Lá menor, a 110 BPM, toda sintetizada:

- Harmonia: Am9 → Fmaj9 → Cmaj9 → G6/9.
- Pad aditivo com sidechain no bumbo.
- Baixo sub, arpejo dedilhado (Karplus-Strong) e melodia de "vidro" com eco ping-pong.
- Bateria: bumbo nos cortes, palmas no contratempo, hi-hats com swing e uma virada antes do breakdown.
- Textura: chiado de vinil e reverb por convolução.

## Gerar de novo

```bash
pip install numpy pillow   # e ffmpeg instalado
./build.sh                 # ~3 min em 4 núcleos
```

- `lib.py`: ruído, blur, máscaras com anti-aliasing, o personagem e a lua.
- `scenes.py`: as 14 cenas.
- `render.py`: linha do tempo, câmera e pós-produção.
- `music.py`: a trilha.
