import { suggestHook } from "@/lib/nlp/interpret";

/**
 * Deterministic content-studio generators used when no LLM is configured.
 * They produce solid, editable starting points — never presented as analytics or facts.
 */

/** Proven angles, each paired with a hook written for it (topic is inserted). */
const IDEA_ANGLES: [(t: string) => string, (t: string) => string][] = [
  [(t) => `3 erros que todo mundo comete com ${t}`, (t) => `Se você trabalha com ${t}, provavelmente está cometendo o erro número 2.`],
  [(t) => `O que ninguém te conta sobre ${t}`, (t) => `Ninguém fala disso sobre ${t} — e deveria.`],
  [(t) => `Testei ${t} por 7 dias: resultado real`, () => `Eu fiz isso por 7 dias seguidos. O dia 5 mudou tudo.`],
  [(t) => `${cap(t)} explicado em 60 segundos`, (t) => `Em 60 segundos você vai entender ${t} melhor que 90% das pessoas.`],
  [(t) => `Minha rotina real com ${t}`, () => `Essa é a rotina que ninguém posta — a real.`],
  [(t) => `Mito ou verdade: ${t}`, (t) => `Todo mundo acredita nisso sobre ${t}. Está errado.`],
  [(t) => `Guia de ${t} para iniciantes`, (t) => `Se eu fosse começar em ${t} hoje, faria exatamente isso.`],
  [(t) => `As maiores polêmicas de ${t}`, () => `Vou falar o que ninguém tem coragem de falar.`],
  [(t) => `Ferramentas de ${t} que ninguém está usando`, () => `A ferramenta nº 3 parece ilegal de tão boa.`],
  [(t) => `Como eu começaria ${t} do zero`, () => `Se eu perdesse tudo hoje, recomeçaria assim.`],
  [(t) => `Bastidores: como eu produzo sobre ${t}`, () => `Ninguém vê essa parte — então vou mostrar.`],
  [(t) => `Respondendo as perguntas mais comuns sobre ${t}`, () => `Vocês perguntaram, eu respondo sem filtro.`],
  [(t) => `Tendência da semana em ${t}: vale a pena?`, () => `Todo mundo está fazendo isso esta semana. Mas vale a pena?`],
  [(t) => `1 dica de ${t} que mudou meu jogo`, () => `Uma única mudança. Resultado completamente diferente.`],
  [(t) => `Checklist definitivo de ${t}`, () => `Salva esse vídeo: é o checklist que eu queria ter tido.`],
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function generateIdeas(topic: string, count: number, platform?: string) {
  const t = topic.trim() || "seu nicho";
  const list = [] as { title: string; hook: string; platform: string | null; format: string | null }[];
  for (let i = 0; i < Math.min(count, IDEA_ANGLES.length); i++) {
    const [makeTitle, makeHook] = IDEA_ANGLES[i];
    list.push({
      title: makeTitle(t),
      hook: makeHook(t),
      platform: platform ?? null,
      format: platform === "youtube" ? "video" : platform === "instagram" ? "reel" : platform ? "short" : null,
    });
  }
  return list;
}

export function generateScript(title: string, hook?: string | null, platform?: string | null) {
  const h = hook || suggestHook(title);
  const long = platform === "youtube";
  return [
    `🎬 ROTEIRO — ${title}`,
    ``,
    `[0–3s] HOOK`,
    h,
    ``,
    `[3–10s] CONTEXTO`,
    `Por que isso importa pra quem assiste: apresente o problema em uma frase.`,
    ``,
    `[10–${long ? "180" : "40"}s] DESENVOLVIMENTO`,
    `1. Primeiro ponto — mostre na prática.`,
    `2. Segundo ponto — exemplo real ou dado seu.`,
    `3. Terceiro ponto — o insight que ninguém espera.`,
    ``,
    `[final] CTA`,
    `Salva esse vídeo e comenta "${title.split(" ")[0].toUpperCase()}" que eu te mando a parte 2.`,
    ``,
    `📌 Notas de gravação: enquadramento vertical, texto na tela no hook, corte seco a cada 2–3s.`,
  ].join("\n");
}

export function strongerHooks(title: string) {
  const t = title.replace(/\.$/, "");
  const lower = t.charAt(0).toLowerCase() + t.slice(1);
  return [
    `Você está fazendo ${lower} do jeito errado.`,
    `Isso aqui sobre ${lower} deveria ser proibido.`,
    `Se eu soubesse disso sobre ${lower} antes, teria economizado meses.`,
    `Pare tudo: ${lower} em 30 segundos.`,
    `A verdade sobre ${lower} que ninguém fala.`,
  ];
}

export function caption(title: string, platform?: string | null) {
  const tag = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 3)
    .map((w) => `#${w.replace(/[^a-z0-9]/g, "")}`);
  return [
    `${title} 👇`,
    ``,
    `Salva pra não esquecer e manda pra alguém que precisa ver isso.`,
    ``,
    `💬 Qual foi sua maior dúvida? Comenta aqui.`,
    ``,
    [...tag, platform === "tiktok" ? "#fyp" : "#reels"].join(" "),
  ].join("\n");
}

export function variations(title: string) {
  return [
    `${title} — versão tutorial passo a passo`,
    `${title} — versão storytelling (minha experiência)`,
    `${title} — versão lista rápida (top 3)`,
    `${title} — versão polêmica (opinião forte)`,
    `${title} — versão react / comentário`,
  ];
}
