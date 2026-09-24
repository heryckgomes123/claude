import { extractDateTime, cutSpans, norm, type Ctx, wordToNumber } from "./datetime";
import type { AiAction } from "@/lib/ai/actions";
import type { EntityName } from "@/lib/entities";

/**
 * Local natural-language understanding for AIVA (pt-BR).
 * Turns free text ("Sexta tenho reunião com a empresa X às 14h") into
 * structured AIVA actions — no network, no API key, deterministic.
 */

export type QueryKind =
  | "priorities"
  | "overdue"
  | "today"
  | "tomorrow"
  | "week"
  | "contents_week"
  | "followups"
  | "campaign"
  | "lives"
  | "finance"
  | "next_action"
  | "review"
  | "search";

export type CommandKind = "plan_day" | "plan_week" | "script" | "generate_ideas" | "organize_inbox";

export type Interpretation =
  | {
      kind: "create";
      primary: EntityName;
      actions: AiAction[];
      /** Confirmation sentence, e.g. "Criar uma tarefa para amanhã às 10h?" */
      confirm: string;
      suggestions: string[];
    }
  | { kind: "query"; query: QueryKind; subject?: string }
  | { kind: "command"; command: CommandKind; subject?: string; count?: number; platform?: string; target?: "idea" };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const PLATFORM_RULES: [RegExp, string, string?][] = [
  [/\btik ?tok\b/, "tiktok", "short"],
  [/\breels?\b/, "instagram", "reel"],
  [/\b(instagram|insta|ig)\b/, "instagram"],
  [/\bstor(y|ies)\b/, "instagram", "story"],
  [/\bcarrossel\b/, "instagram", "carousel"],
  [/\bshorts?\b/, "youtube", "short"],
  [/\b(youtube|yt)\b/, "youtube", "video"],
  [/\btwitch\b/, "twitch", "live"],
  [/\blinkedin\b/, "linkedin", "post"],
  [/\bkwai\b/, "kwai", "short"],
];

export function detectPlatform(n: string): { platform?: string; format?: string } {
  for (const [re, platform, format] of PLATFORM_RULES) if (re.test(n)) return { platform, format };
  return {};
}

const CATEGORY_RULES: [RegExp, string][] = [
  [/\b(orcamento|cliente|proposta|contrato|briefing|reuniao com|empresa|freela|job)\b/, "Cliente"],
  [/\b(video|gravar|editar|roteiro|post|reels?|tiktok|youtube|conteudo|live|publicar|stories|thumbnail)\b/, "Conteúdo"],
  [/\b(pagar|boleto|conta de|fatura|imposto|nota fiscal|pix|transferir|cobrar)\b/, "Finanças"],
  [/\b(estudar|curso|aula|ler|livro|prova|faculdade)\b/, "Estudos"],
  [/\b(medico|dentista|academia|treino|correr|terapia|exame|remedio)\b/, "Saúde"],
  [/\b(mercado|comprar|casa|familia|mae|pai|aniversario|limpar|lavar)\b/, "Pessoal"],
];

export function detectCategory(n: string): string | undefined {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(n)) return cat;
  return undefined;
}

const TOPIC_RULES: [RegExp, string][] = [
  [/\b(ia|inteligencia artificial|chatgpt|claude|ai|tecnologia|tech|app|programa|codigo)\b/, "Tecnologia"],
  [/\b(dinheiro|investir|financas|renda|economizar|negocio|vendas|marketing)\b/, "Negócios"],
  [/\b(treino|fitness|dieta|saude|academia)\b/, "Saúde & Fitness"],
  [/\b(receita|comida|cozinha)\b/, "Gastronomia"],
  [/\b(viagem|viajar)\b/, "Viagem"],
  [/\b(humor|meme|engracad)\b/, "Humor"],
  [/\b(produtividade|rotina|habitos?|organizacao)\b/, "Produtividade"],
  [/\b(jogo|game|gamer|stream)\b/, "Games"],
];

export function detectTopic(n: string): string {
  for (const [re, t] of TOPIC_RULES) if (re.test(n)) return t;
  return "Geral";
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Remove filler words and collapse spacing. */
export function cleanTitle(s: string): string {
  let t = s
    .replace(/\s+/g, " ")
    .replace(/^[\s,.:;!-]+|[\s,.;:!?-]+$/g, "")
    .trim();
  const fillers = [
    /^(eu\s+)?(tenho que|tenho de|preciso de|preciso|devo|vou ter que|vou|quero|gostaria de)\s+/i,
    /^(me lembre de|me lembra de|me lembrar de|lembre-me de|lembrar de|lembrete:?|lembre de)\s+/i,
    /^(criar|crie|cria|adicionar|adicione|adiciona|coloque|coloca|colocar|agende|agenda|agendar|marcar|marque|marca|anotar|anote|anota|registrar|registre|salvar|salve|cadastrar|cadastre|cadastra)\s+/i,
    /^(uma?|o|a|os|as)\s+(nova?\s+)?(tarefa|nota|evento|lembrete)(\s*(de|para|pra|:))?\s*/i,
    /^(tarefa|nota|evento|lembrete)\s*(de|para|pra|:)?\s+/i,
    /^(uma?|o|a)\s+/i,
  ];
  for (let i = 0; i < 3; i++) for (const f of fillers) t = t.replace(f, "");
  t = t
    .replace(/\s+(de|para|pra|no|na|em|as|às|a|o|com)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.:;-]+|[\s,.;:-]+$/g, "")
    .trim();
  return cap(t);
}

export function parseMoney(n: string): number | null {
  const m =
    /r\$\s*([\d.]+(?:,\d{1,2})?)\s*(mil|k)?/.exec(n) ??
    /\b([\d.]+(?:,\d{1,2})?)\s*(mil|k)?\s*(?:reais|conto|pila)\b/.exec(n) ??
    /\b(\d+(?:[.,]\d+)?)\s*(mil|k)\b/.exec(n);
  if (!m) return null;
  let raw = m[1];
  // "2.000" (thousand separator) vs "2,50" (decimal)
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) raw = raw.replace(/\./g, "").replace(",", ".");
  else raw = raw.replace(",", ".");
  let v = Number(raw);
  if (!Number.isFinite(v)) return null;
  if (m[2]) v *= 1000;
  return v;
}

function extractCompany(original: string): string | undefined {
  const m = /\b(?:empresa|marca|agência|agencia|cliente)\s+([A-ZÀ-Ú0-9][\wÀ-ú&.'-]*(?:\s+[A-ZÀ-Ú0-9][\wÀ-ú&.'-]*)*)/.exec(original);
  return m?.[1];
}

function extractPerson(original: string): string | undefined {
  const m = /\bcom\s+(?:o\s+|a\s+)?([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/.exec(original);
  return m?.[1];
}

function formatWhen(at: Date | null, hasTime: boolean, ctx: Ctx): string {
  if (!at) return "";
  const local = new Date(at.getTime() - ctx.tzOffset * 60_000);
  const today = new Date(ctx.now.getTime() - ctx.tzOffset * 60_000);
  const dayDiff = Math.round(
    (Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) /
      86_400_000,
  );
  const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  let day: string;
  if (dayDiff === 0) day = "hoje";
  else if (dayDiff === 1) day = "amanhã";
  else if (dayDiff > 1 && dayDiff < 7) day = names[local.getUTCDay()];
  else day = `${String(local.getUTCDate()).padStart(2, "0")}/${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
  if (!hasTime) return ` para ${day}`;
  const h = local.getUTCHours();
  const mi = local.getUTCMinutes();
  return ` para ${day} às ${h}h${mi ? String(mi).padStart(2, "0") : ""}`;
}

/** Deterministic hook suggestion from a topic (local mode). */
export function suggestHook(topic: string, seed = 0): string {
  const t = topic.replace(/^v[ií]deo\s+sobre\s+/i, "").replace(/\.$/, "");
  const lower = t.charAt(0).toLowerCase() + t.slice(1);
  const templates = [
    `Ninguém está te contando isso sobre ${lower}.`,
    `O que ninguém te conta sobre ${lower}.`,
    `Eu testei ${lower} por 7 dias. O resultado me surpreendeu.`,
    `3 erros que quase todo mundo comete com ${lower}.`,
    `Se você ainda não entendeu ${lower}, assista até o final.`,
  ];
  let h = seed;
  for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return templates[h % templates.length];
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const WAKE = /^\s*(?:(?:ok|ei|hey|oi|ola)\s+)?aiva[\s,.:!-]*/i;

export function stripWakeWord(text: string) {
  return text.replace(WAKE, "").replace(/^\s*(por favor|pfv|pf)[\s,]+/i, "").trim();
}

const QUERY_START =
  /^(quais?|qual|o que|oque|que|quem|quando|quanto|quantos|quantas|como (esta|estao|anda|andam|foi)|onde|tem (algo|alguma|algum)|tenho (algo|alguma|algum)|mostre|mostra|me mostra|me mostre|liste|lista|listar|resuma|resumo|me (de|da|diga|fala|fale|conta|conte)|existe|ha)\b/;

export function interpret(input: string, ctx: Ctx): Interpretation {
  const original = stripWakeWord(input);
  const n = norm(original);

  /* ---------- commands ---------- */
  if (/\b(organiz\w*|planej\w*|monte|montar)\s+(o\s+|meu\s+)?(dia|hoje)\b/.test(n)) return { kind: "command", command: "plan_day" };
  if (/\b(organiz\w*|planej\w*|monte|montar)\s+(a\s+|minha\s+)?semana\b/.test(n)) return { kind: "command", command: "plan_week" };
  if (/\b(organiz\w*)\s+(a\s+|minha\s+)?(inbox|caixa)\b/.test(n)) return { kind: "command", command: "organize_inbox" };
  if (/\b(transform\w*|vir\w*|cri\w*|ger\w*|escrev\w*|faz\w*|faca)\b.*\broteiro\b/.test(n)) {
    const subj = /\broteiro\s+(?:sobre|de|para|pra)\s+(?:o\s+conte[uú]do\s+|a\s+ideia\s+)?(.+)$/i.exec(original)?.[1] ?? /\b(?:ideia|conte[uú]do)\s+["“](.+?)["”]/i.exec(original)?.[1];
    return { kind: "command", command: "script", subject: subj?.replace(/["“”]/g, "").replace(/\s+e salve.*$/i, "").trim() || undefined, target: /\bideia\b/.test(n) ? "idea" : undefined };
  }
  const gen = /\b(cri\w*|ger\w*|sugir\w*|sugest\w*|me (de|da)|quero)\s+(\d+|[a-z]+)?\s*(novas\s+)?ideias\b/.exec(n);
  if (gen) {
    const count = gen[3] ? (wordToNumber(gen[3]) ?? 5) : 5;
    const platformWords = /\b(de|para|pra|no|do)?\s*(tik ?tok|reels?|instagram|insta|youtube|shorts?|twitch|linkedin|kwai|videos?|conteudos?|posts?)\b/gi;
    const rawSubj = /\bideias\s+(?:.*?\b)?(?:sobre|de|para|pra)\s+(.+)$/i.exec(original)?.[1] ?? "";
    const subj = norm(rawSubj).replace(platformWords, " ").replace(/\s+/g, " ").trim()
      ? original.slice(original.length - rawSubj.length).replace(/\b(de|para|pra|no|do)?\s*(tik ?tok|reels?|instagram|insta|youtube|shorts?|twitch|linkedin|kwai|v[ií]deos?|conte[uú]dos?|posts?)\b/gi, " ").replace(/^\s*(sobre|de|para|pra)\s+/i, "").replace(/\s+/g, " ").trim()
      : "";
    return { kind: "command", command: "generate_ideas", count: Math.min(count, 15), platform: detectPlatform(n).platform, subject: subj || undefined };
  }

  /* ---------- questions ---------- */
  const isQuestion = QUERY_START.test(n) || /\?\s*$/.test(n);
  if (isQuestion || /\b(proxima acao|o que (eu )?faco agora|por onde comeco)\b/.test(n)) {
    if (/\b(proxima acao|faco agora|comeco|fazer agora)\b/.test(n)) return { kind: "query", query: "next_action" };
    if (/\bprioridade/.test(n)) return { kind: "query", query: "priorities" };
    if (/\batrasad/.test(n)) return { kind: "query", query: "overdue" };
    const camp = /\bcampanha\s+(?:da|do|de)?\s*([\wÀ-ú&.-]+(?:\s+[A-ZÀ-Ú][\wÀ-ú&.-]*)*)/i.exec(original);
    if (camp) return { kind: "query", query: "campaign", subject: camp[1] };
    if (/\b(follow|retorno|responder|precisam de mim|quem precisa)\b/.test(n)) return { kind: "query", query: "followups" };
    if (/\b(publicar|postar|conteudos?|posts?)\b/.test(n)) return { kind: "query", query: "contents_week" };
    if (/\blives?\b/.test(n)) return { kind: "query", query: "lives" };
    if (/\b(receber|receita|financ|dinheiro|faturamento|caixa|despesas?|gastos?)\b/.test(n)) return { kind: "query", query: "finance" };
    if (/\b(resum\w*|como foi)\b/.test(n)) return { kind: "query", query: "review" };
    if (/\bamanha\b/.test(n)) return { kind: "query", query: "tomorrow" };
    if (/\bsemana\b/.test(n)) return { kind: "query", query: "week" };
    if (/\b(hoje|meu dia|agenda|tenho)\b/.test(n)) return { kind: "query", query: "today" };
    const rel = /\b(?:relacionad\w*|sobre|com|de|do|da)\s+(?:a|ao|à|o)?\s*(.+?)[?.!]*$/.exec(original);
    return { kind: "query", query: "search", subject: rel?.[1]?.trim() || original.replace(/[?]/g, "").trim() };
  }

  return interpretCreate(original, n, ctx);
}

function interpretCreate(original: string, n: string, ctx: Ctx): Interpretation {
  const dt = extractDateTime(original, ctx);
  const rest = cutSpans(original, dt.spans);
  const when = formatWhen(dt.at, dt.hasTime, ctx);
  const at = dt.at?.toISOString() ?? null;
  const urgent = /\b(urgente|asap|imediatamente|agora mesmo)\b/.test(n);
  const important = /\b(importante|prioridade|prioritario|critico)\b/.test(n);
  const priority = urgent ? "urgent" : important ? "high" : undefined;
  const plat = detectPlatform(n);
  const suggestions: string[] = [];
  const stripFlags = (s: string) => s.replace(/\b(urgente|importante|asap|prioridade)\b/gi, "");

  /* ---------- money ---------- */
  const money = parseMoney(n);
  if (money != null && /\b(gastei|paguei|comprei|despesa|gasto|custou)\b/.test(n)) {
    const title = cleanTitle(stripFlags(rest).replace(/\b(gastei|paguei|comprei|despesa|gasto|custou)\b/i, "").replace(/r\$\s*[\d.,]+\s*(mil|k)?|\b[\d.,]+\s*(mil|k)?\s*(reais|conto|pila)\b/gi, "").replace(/^\s*(com|em|no|na|de)\s+/i, ""));
    return {
      kind: "create",
      primary: "transactions",
      actions: [{ type: "create", entity: "transactions", data: { kind: "expense", title: title || "Despesa", amount: money, status: "done", category: "other" } }],
      confirm: `Registrar despesa de R$ ${money.toLocaleString("pt-BR")}?`,
      suggestions,
    };
  }
  if (money != null && /\b(recebi|ganhei|entrou|receita|vou receber|a receber|faturei|vendi)\b/.test(n)) {
    const pending = /\b(vou receber|a receber|vai entrar)\b/.test(n);
    const title = cleanTitle(rest.replace(/\b(recebi|ganhei|entrou|receita|vou receber|a receber|faturei|vendi)\b/i, "").replace(/r\$\s*[\d.,]+\s*(mil|k)?|\b[\d.,]+\s*(mil|k)?\s*(reais|conto|pila)\b/gi, "").replace(/^\s*(da|do|de|com|em)\s+/i, ""));
    return {
      kind: "create",
      primary: "transactions",
      actions: [
        {
          type: "create",
          entity: "transactions",
          data: { kind: "income", title: title || "Receita", amount: money, status: pending ? "pending" : "done", dueAt: at, category: /\b(publi|campanha|marca)\b/.test(n) ? "publi" : "other" },
        },
      ],
      confirm: `Registrar receita ${pending ? "a receber " : ""}de R$ ${money.toLocaleString("pt-BR")}?`,
      suggestions,
    };
  }

  /* ---------- note / link ---------- */
  const url = /(https?:\/\/[^\s]+)/.exec(original)?.[1];
  if (url || /^(anota\w*|anote|nota:|registr\w*|salv\w*|guard\w*)\b/.test(n)) {
    const body = original.replace(/^(anota\w*|anote|nota:|registr\w*|salv\w*|guard\w*)[\s:]*(que\s+)?/i, "").trim();
    const title = cleanTitle(body.replace(url ?? "", "")) || (url ? new URL(url).hostname : "Nota");
    return {
      kind: "create",
      primary: "notes",
      actions: [{ type: "create", entity: "notes", data: { title: title.slice(0, 120), body, kind: url ? "link" : "note", url: url ?? null } }],
      confirm: url ? "Salvar este link nas suas notas?" : "Salvar como nota?",
      suggestions,
    };
  }

  /* ---------- idea ---------- */
  if (/\b(tive uma ideia|ideia\s*(de|para|pra|pro|sobre|:)|nova ideia|uma ideia)\b/.test(n)) {
    const raw = rest.replace(/.*?\b(tive uma ideia|nova ideia|uma ideia|ideia)\b\s*(:)?\s*/i, "");
    let title = cleanTitle(raw.replace(/^(de|para|pra|pro)\s+/i, "")) || "Nova ideia";
    title = title.replace(/^(tiktok|reels?|youtube|instagram)\s+(sobre|de)\s+/i, "");
    const topic = detectTopic(n);
    const hook = suggestHook(title);
    suggestions.push("Transformar em roteiro", "Agendar gravação");
    return {
      kind: "create",
      primary: "ideas",
      actions: [
        {
          type: "create",
          entity: "ideas",
          data: { title: cap(title), hook, category: topic, platform: plat.platform ?? null, format: plat.format ?? null, status: "raw", potential: 3 },
        },
      ],
      confirm: `Salvar ideia "${cap(title)}" no Idea Vault?`,
      suggestions,
    };
  }

  /* ---------- live ---------- */
  if (/\b(live|ao vivo|transmissao|stream)\b/.test(n) && !/\blives?\s+(que|anteriores)\b/.test(n)) {
    const title = cleanTitle(stripFlags(rest).replace(/^(fazer|faço|faco|vou fazer|tenho)\s+/i, "").replace(/^(uma?|a)\s+/i, "")) || "Live";
    const t = /^live\b/i.test(title) ? title : `Live: ${title}`;
    suggestions.push("Abrir checklist da live");
    return {
      kind: "create",
      primary: "lives",
      actions: [
        { type: "create", entity: "lives", ref: "live", data: { title: t.replace(/^Live:\s*Live\b/i, "Live"), platform: plat.platform ?? null, startAt: at, status: "planned" } },
        ...(at ? [{ type: "create" as const, entity: "events" as const, data: { title: t, startAt: at, kind: "live", allDay: !dt.hasTime } }] : []),
      ],
      confirm: `Agendar live${when}?`,
      suggestions,
    };
  }

  /* ---------- client / lead ---------- */
  const clientM = /\b(?:cadastr\w*|adicion\w*|nov[oa]|registr\w*|criar?|crie)\s+(?:um\s+|uma\s+|o\s+|a\s+)?(?:novo\s+|nova\s+)?(cliente|lead|contato)\b\s*:?\s*(.*)$/i.exec(original);
  if (clientM) {
    const kind = norm(clientM[1]) === "lead" ? "lead" : norm(clientM[1]) === "contato" ? "contact" : "client";
    const name = cleanTitle(clientM[2].replace(/^(chamad[oa]|de nome)\s+/i, "")) || "Novo contato";
    return {
      kind: "create",
      primary: "clients",
      actions: [{ type: "create", entity: "clients", data: { name, kind, stage: kind === "client" ? "won" : "new", value: money } }],
      confirm: `Cadastrar ${kind === "lead" ? "lead" : "cliente"} "${name}"?`,
      suggestions,
    };
  }

  /* ---------- campaign ---------- */
  const campM = /\b(?:nova|criar?|crie|fechei|fechar)\s+(?:uma\s+)?(?:campanha|publi|parceria)\s*(?:com|da|do|de|para)?\s*(.*)$/i.exec(rest);
  if (campM) {
    const brandRaw = campM[1]
      .replace(/\s*\b(?:de|por|no valor de)?\s*(?:r\$\s*)?\d[\d.,]*\s*(?:mil|k|reais)?(?=\s|$).*$/i, "")
      .split(/\s+(?:para|pra|com|no|na|ate)\s+/i)[0];
    const brandName = cleanTitle(brandRaw) || "Nova marca";
    const closed = /\bfechei\b/.test(n);
    return {
      kind: "create",
      primary: "campaigns",
      actions: [
        { type: "create", entity: "brands", ref: "brand", data: { name: brandName } },
        {
          type: "create",
          entity: "campaigns",
          data: { title: `Campanha ${brandName}`, brandId: "$ref:brand", stage: closed ? "approved" : "contact", value: money, dueAt: at },
        },
      ],
      confirm: `Criar campanha com ${brandName}${money ? ` (R$ ${money.toLocaleString("pt-BR")})` : ""}?`,
      suggestions: ["Adicionar entregáveis"],
    };
  }

  /* ---------- goal ---------- */
  if (/^(meta\b|minha meta|objetivo\b|quero (atingir|chegar|bater|alcancar|ter|juntar|ganhar|perder))/.test(n)) {
    const numM = /\b(\d+(?:[.,]\d+)?)\s*(mil|k)?\s+([a-zà-ú]+)/i.exec(rest);
    let target: number | null = null;
    let unit: string | null = null;
    if (numM) {
      target = Number(numM[1].replace(",", ".")) * (numM[2] ? 1000 : 1);
      unit = numM[3];
    } else if (money != null) {
      target = money;
      unit = "R$";
    }
    const title = cleanTitle(rest.replace(/^(meta|minha meta|objetivo)\s*(e|é|:)?\s*/i, "").replace(/^quero\s+/i, ""));
    const horizon = /\bano\b/.test(n) ? "year" : /\btrimestre\b/.test(n) ? "quarter" : /\bsemana\b/.test(n) ? "week" : "month";
    const category = /\b(seguidores|views|inscritos|conteudo|posts?|videos?)\b/.test(n)
      ? "content"
      : money != null || /\b(reais|faturar|juntar|economizar)\b/.test(n)
        ? "finance"
        : /\b(peso|treino|correr|saude)\b/.test(n)
          ? "health"
          : "personal";
    return {
      kind: "create",
      primary: "goals",
      actions: [{ type: "create", entity: "goals", data: { title: title || "Nova meta", target, unit, horizon, category, dueAt: at } }],
      confirm: `Criar meta "${title}"?`,
      suggestions: ["Quebrar a meta em tarefas"],
    };
  }

  /* ---------- habit ---------- */
  if (/\b(novo habito|habito:|todos os dias|todo dia|diariamente|toda manha|toda noite)\b/.test(n) && !dt.hasDate) {
    const title = cleanTitle(rest.replace(/\b(novo habito|habito:?|todos os dias|todo dia|diariamente|toda manha|toda noite)\b/gi, "").replace(/^(quero|vou|preciso)\s+/i, ""));
    const timeOfDay = /\bmanha\b/.test(n) ? "morning" : /\btarde\b/.test(n) ? "afternoon" : /\bnoite\b/.test(n) ? "night" : "any";
    return {
      kind: "create",
      primary: "habits",
      actions: [{ type: "create", entity: "habits", data: { title: title || "Novo hábito", timeOfDay } }],
      confirm: `Criar hábito diário "${title}"?`,
      suggestions,
    };
  }

  /* ---------- project ---------- */
  const projM = /\b(?:novo|criar?|crie|comecar|iniciar)\s+(?:um\s+)?projeto\s*:?\s*(.*)$|^projeto\s*:?\s*(.*)$/i.exec(original);
  if (projM) {
    const name = cleanTitle((projM[1] ?? projM[2] ?? "").replace(/^(chamado|de nome)\s+/i, "")) || "Novo projeto";
    return {
      kind: "create",
      primary: "projects",
      actions: [{ type: "create", entity: "projects", data: { name, status: "active", dueAt: at } }],
      confirm: `Criar projeto "${name}"?`,
      suggestions: ["Adicionar tarefas ao projeto"],
    };
  }

  /* ---------- content ---------- */
  const contentVerb = /\b(gravar|gravacao|publicar|postar|editar|edicao|subir)\b/.exec(n)?.[1];
  const contentNoun = /\b(video|videos|reels?|tiktok|shorts?|youtube|stories|story|carrossel|post|conteudo|vlog|podcast|episodio)\b/.test(n);
  if (contentVerb || (contentNoun && !/\b(assistir|ver|comprar)\b/.test(n))) {
    const stage = contentVerb?.startsWith("edi") ? "editing" : contentVerb === "publicar" || contentVerb === "postar" || contentVerb === "subir" ? (at ? "scheduled" : "review") : contentVerb?.startsWith("grav") ? "recording" : "idea";
    const title = cleanTitle(stripFlags(rest)) || "Novo conteúdo";
    const kind = stage === "scheduled" || stage === "review" ? "publish" : "recording";
    const subject = cap(title.replace(/^(publicar|postar|subir|gravar|editar)\s+/i, "").replace(/^(uma?|o|a|os|as)\s+/i, ""));
    const eventTitle = kind === "publish" ? `Publicar: ${subject}` : `Gravação: ${subject}`;
    const actions: AiAction[] = [
      {
        type: "create",
        entity: "contents",
        ref: "content",
        data: { title, stage, platform: plat.platform ?? null, format: plat.format ?? null, scheduledAt: kind === "publish" ? at : null, hook: null },
      },
    ];
    if (at) actions.push({ type: "create", entity: "events", data: { title: eventTitle, startAt: at, kind, allDay: !dt.hasTime, contentId: "$ref:content" } });
    else actions.push({ type: "create", entity: "tasks", data: { title, status: "todo", category: "Conteúdo", contentId: "$ref:content", priority } });
    if (stage === "recording" || stage === "idea") suggestions.push("Criar roteiro");
    if (!plat.platform) suggestions.push("Definir plataforma");
    return {
      kind: "create",
      primary: "contents",
      actions,
      confirm: `Criar conteúdo${at ? ` e agendar ${kind === "publish" ? "publicação" : "gravação"}${when}` : ""}?`,
      suggestions,
    };
  }

  /* ---------- event ---------- */
  const isEvent = /\b(reuniao|reunioes|call|chamada|consulta|compromisso|encontro|evento|entrevista|almoco com|jantar com|cafe com|meeting|visita|aula|dentista|medico|medica|voo|show|festa|aniversario de)\b/.test(n);
  if (isEvent && dt.at) {
    let title = cleanTitle(stripFlags(rest).replace(/^(tenho|terei|vou ter|temos|teremos)\s+/i, "").replace(/\b(tenho|temos)\s+/i, ""));
    const company = extractCompany(original);
    const person = extractPerson(original);
    title ||= "Compromisso";
    const kind = /\b(reuniao|call|chamada|meeting|entrevista)\b/.test(n) ? "meeting" : /\b(medico|dentista|consulta|aniversario|festa)\b/.test(n) ? "personal" : "appointment";
    const actions: AiAction[] = [
      { type: "create", entity: "events", data: { title, startAt: at, allDay: !dt.hasTime, kind, reminderMinutes: dt.hasTime ? 30 : null } },
    ];
    if (company) suggestions.push(`Cadastrar ${company} como cliente`);
    else if (person && kind === "meeting") suggestions.push(`Cadastrar ${person} como contato`);
    return { kind: "create", primary: "events", actions, confirm: `Agendar "${title}"${when}?`, suggestions };
  }

  /* ---------- task (default) ---------- */
  const isReminder = /\b(me lembr\w*|lembrete|lembre-me|lembrar)\b/.test(n);
  const title = cleanTitle(stripFlags(rest)) || cleanTitle(original);
  const category = detectCategory(n);
  const company = extractCompany(original);
  if (company) suggestions.push(`Cadastrar ${company} como cliente`);
  if (!dt.at) suggestions.push("Definir prazo");
  return {
    kind: "create",
    primary: "tasks",
    actions: [
      {
        type: "create",
        entity: "tasks",
        data: {
          title,
          status: dt.at || priority ? "todo" : "inbox",
          dueAt: at,
          hasTime: dt.hasTime,
          priority: priority ?? (isReminder && dt.hasTime ? "medium" : "none"),
          category: category ?? null,
        },
      },
    ],
    confirm: `${isReminder ? "Criar lembrete" : "Criar uma tarefa"}${when}?`,
    suggestions,
  };
}
