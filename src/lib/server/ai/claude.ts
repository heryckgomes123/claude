import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AuthContext } from "../auth";
import type { Snapshot } from "@/lib/types";
import type { AiReply, ReplyItem } from "@/lib/ai/reply";
import type { Ctx } from "@/lib/nlp/datetime";
import { ENTITY_NAMES, type EntityName } from "@/lib/entities";
import { buildToday, financeSummary, fmtWhen, isOpenTask, isOverdue, planDay, searchAll, STAGE_LABEL } from "@/lib/intelligence";
import { executeActions, proposeActions, type ExecResult } from "./execute";

type Out = Omit<AiReply, "conversationId" | "provider">;

export const MODEL = process.env.AIVA_MODEL || "claude-opus-5";
let client: Anthropic | null = null;
export function claudeEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
function getClient() {
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 2 });
  return client;
}

/* Stable system prompt (kept byte-identical across requests so it caches). */
const SYSTEM = `Você é a AIVA, o segundo cérebro digital do usuário — organização, planejamento, execução e criação de conteúdo num só sistema.

Princípios:
- Responda sempre em português do Brasil, de forma curta, calorosa e direta. Use **negrito** e listas com "- " quando ajudar. Nada de tabelas.
- Você tem acesso aos dados reais do workspace no bloco <workspace>. Use apenas esses dados e os resultados das ferramentas. Nunca invente tarefas, números, métricas, clientes ou fatos. Se algo não está nos dados, diga que não encontrou.
- Quando o usuário pedir para criar, alterar, concluir, agendar ou organizar algo, USE AS FERRAMENTAS — não apenas descreva. Depois confirme em uma frase o que foi feito.
- Datas: converta expressões relativas ("amanhã às 3", "sexta") usando o horário atual e o fuso informados, e envie ISO 8601 com offset. "às três" sem período em contexto de trabalho = 15h.
- Exclusões nunca são imediatas: a ferramenta delete cria uma proposta que o usuário confirma.
- Para planos com várias alterações (organizar o dia, reagendar muitas tarefas), use propose_changes para o usuário aprovar.
- Para roteiros, hooks, legendas e ideias, escreva conteúdo específico, criativo e alinhado ao nicho e plataformas do usuário. Ao gerar roteiro para um conteúdo existente, salve-o com update no campo script.
- Termine com a próxima ação sugerida apenas quando for útil.

Entidades e campos principais (use exatamente estes nomes):
- tasks: title, description, status(inbox|todo|doing|waiting|done), priority(none|low|medium|high|urgent), dueAt, hasTime, category, checklist[{id,text,done}], recurrence(daily|weekly|monthly), projectId, clientId, contentId, campaignId, goalId
- projects: name, description, status(active|paused|done|archived), emoji, dueAt, clientId
- events: title, startAt, endAt, allDay, kind(meeting|appointment|recording|live|publish|deadline|personal), location, reminderMinutes, projectId, clientId, contentId, campaignId
- notes: title, body, kind(note|link|reference|list|message), url, pinned, projectId
- ideas: title, hook, description, platform, format, category, potential(1-5), status(raw|developing|approved|used|discarded)
- contents: title, platform(instagram|tiktok|youtube|twitch|linkedin|kwai|other), format(reel|short|video|post|carousel|story|live|thread), stage(idea|script|recording|editing|review|scheduled|published|analyzed), hook, script, caption, scheduledAt, campaignId, ideaId, projectId
- lives: title, platform, startAt, durationMin, topic, agenda, guests, goals, status(planned|live|done)
- brands: name, contactName, contactEmail
- campaigns: title, brandId, stage(contact|interested|proposal|negotiation|approved|production|delivery|payment|done|lost), briefing, deliverables[{id,text,done}], dueAt, value, approved, paid
- clients: name, company, email, phone, kind(lead|client|brand|contact), stage(new|contacted|proposal|negotiation|won|lost), value, nextFollowUpAt, notes
- goals: title, horizon(day|week|month|quarter|year), category(personal|work|content|finance|health|learning|projects), target, current, unit, dueAt
- habits: title, emoji, timeOfDay(morning|afternoon|night|any)
- transactions: kind(income|expense), title, category(campaign|publi|product|service|affiliate|tools|team|taxes|personal|other), amount, status(pending|done), dueAt, campaignId, clientId`;

const entityEnum = { type: "string", enum: ENTITY_NAMES } as const;

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "create",
    description: "Cria um ou mais itens no workspace. Use 'ref' num item e \"$ref:<nome>\" num campo *Id de outro item do mesmo lote para ligá-los (ex.: conteúdo + evento de gravação).",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          minItems: 1,
          maxItems: 15,
          items: {
            type: "object",
            properties: { entity: entityEnum, data: { type: "object" }, ref: { type: "string" } },
            required: ["entity", "data"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "update",
    description: "Atualiza campos de um item existente (concluir tarefa = status 'done'; mover conteúdo no pipeline = stage).",
    input_schema: {
      type: "object",
      properties: { entity: entityEnum, id: { type: "string" }, data: { type: "object" } },
      required: ["entity", "id", "data"],
    },
  },
  {
    name: "delete",
    description: "Propõe excluir um item. O usuário precisa confirmar na interface.",
    input_schema: { type: "object", properties: { entity: entityEnum, id: { type: "string" }, label: { type: "string" } }, required: ["entity", "id"] },
  },
  {
    name: "propose_changes",
    description: "Propõe um lote de criações/atualizações para o usuário aprovar com um clique (ex.: aplicar um plano do dia, reagendar atrasados, salvar várias ideias).",
    input_schema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Resumo curto do que será aplicado" },
        actions: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: { type: { type: "string", enum: ["create", "update"] }, entity: entityEnum, id: { type: "string" }, data: { type: "object" } },
            required: ["type", "entity", "data"],
          },
        },
      },
      required: ["label", "actions"],
    },
  },
  {
    name: "search",
    description: "Busca em todo o workspace (tarefas, projetos, conteúdos, ideias, marcas, campanhas, clientes, notas, eventos). Retorna ids.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "get_item",
    description: "Retorna todos os campos de um item (ex.: roteiro completo, briefing, checklist) e seus itens relacionados.",
    input_schema: { type: "object", properties: { entity: entityEnum, id: { type: "string" } }, required: ["entity", "id"] },
  },
  {
    name: "plan_day",
    description: "Calcula um plano de horários para hoje (day_offset=0) ou amanhã (1) encaixando tarefas abertas entre os compromissos. Mostre o plano e use propose_changes para aplicar.",
    input_schema: { type: "object", properties: { day_offset: { type: "integer", minimum: 0, maximum: 6 } } },
  },
];

/* ------------------------------------------------------------------ */
/* Compact workspace context (only real data, bounded in size)          */
/* ------------------------------------------------------------------ */

function buildContext(auth: AuthContext, s: Snapshot, ctx: Ctx) {
  const clock = { now: ctx.now, tzOffset: ctx.tzOffset };
  const offsetH = -ctx.tzOffset / 60;
  const tz = `UTC${offsetH >= 0 ? "+" : "-"}${String(Math.abs(Math.trunc(offsetH))).padStart(2, "0")}:${String(Math.abs(ctx.tzOffset % 60)).padStart(2, "0")}`;
  const local = new Date(ctx.now.getTime() - ctx.tzOffset * 60_000);
  const days = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const today = buildToday(s, clock);
  const soon = ctx.now.getTime() + 14 * 86_400_000;
  const settings = auth.workspace.settings;
  const lines: string[] = [];
  lines.push(`agora: ${local.toISOString().slice(0, 16).replace("T", " ")} (${days[local.getUTCDay()]}), fuso ${tz}`);
  lines.push(`usuário: ${settings.displayName ?? auth.user.name}; perfil: ${settings.role ?? "-"}; foco: ${(settings.focus ?? []).join(", ") || "-"}; creator mode: ${settings.creatorMode ? "sim" : "não"}; plataformas: ${(settings.platforms ?? []).join(", ") || "-"}; nicho: ${settings.niche ?? "-"}; rende mais: ${settings.peakTime ?? "-"}; dia útil ${settings.dayStart ?? 8}h–${settings.dayEnd ?? 19}h; foco atual: ${settings.mainFocus ?? "-"}`);
  lines.push(`próxima ação calculada: ${today.nextAction ? `${today.nextAction.title} (${today.nextAction.reason})` : "nenhuma"}`);

  const openTasks = s.tasks.filter(isOpenTask).slice(0, 80);
  lines.push(`\n## tarefas abertas (${openTasks.length})`);
  for (const t of openTasks) lines.push(`- [${t.id}] ${t.title} | ${t.status} | prio ${t.priority}${t.dueAt ? ` | prazo ${fmtWhen(t.dueAt, t.hasTime, clock)}${isOverdue(t, clock) ? " ATRASADA" : ""}` : ""}${t.category ? ` | ${t.category}` : ""}${t.projectId ? ` | proj ${t.projectId}` : ""}${t.campaignId ? ` | camp ${t.campaignId}` : ""}`);
  const done = s.tasks.filter((t) => t.status === "done").slice(0, 10);
  if (done.length) lines.push(`concluídas recentes: ${done.map((t) => t.title).join("; ")}`);

  const events = s.events.filter((e) => new Date(e.startAt).getTime() > ctx.now.getTime() - 86_400_000 && new Date(e.startAt).getTime() < soon).slice(0, 40);
  lines.push(`\n## agenda (14 dias)`);
  for (const e of events) lines.push(`- [${e.id}] ${fmtWhen(e.startAt, !e.allDay, clock)} ${e.title} (${e.kind})${e.contentId ? ` conteúdo ${e.contentId}` : ""}`);

  lines.push(`\n## projetos`);
  for (const p of s.projects.filter((p) => p.status !== "archived").slice(0, 20)) lines.push(`- [${p.id}] ${p.name} | ${p.status}${p.dueAt ? ` | prazo ${fmtWhen(p.dueAt, false, clock)}` : ""}`);

  lines.push(`\n## conteúdos (pipeline)`);
  for (const c of s.contents.filter((c) => c.stage !== "analyzed").slice(0, 40)) lines.push(`- [${c.id}] ${c.title} | ${STAGE_LABEL[c.stage]} | ${c.platform ?? "sem plataforma"}${c.scheduledAt ? ` | ${fmtWhen(c.scheduledAt, true, clock)}` : ""}${c.script ? " | tem roteiro" : " | sem roteiro"}${c.campaignId ? ` | camp ${c.campaignId}` : ""}`);
  lines.push(`\n## ideias (${s.ideas.length})`);
  for (const i of s.ideas.filter((i) => i.status !== "discarded").slice(0, 25)) lines.push(`- [${i.id}] ${i.title} | ${i.status} | potencial ${i.potential}${i.platform ? ` | ${i.platform}` : ""}`);
  lines.push(`\n## lives`);
  for (const l of s.lives.filter((l) => l.status !== "done").slice(0, 10)) lines.push(`- [${l.id}] ${l.title} | ${l.startAt ? fmtWhen(l.startAt, true, clock) : "sem data"} | checklist ${l.checklist.filter((c) => c.done).length}/${l.checklist.length}`);
  lines.push(`\n## marcas & campanhas`);
  for (const c of s.campaigns.filter((c) => c.stage !== "done" && c.stage !== "lost").slice(0, 20)) {
    const brand = s.brands.find((b) => b.id === c.brandId)?.name ?? "-";
    lines.push(`- [${c.id}] ${c.title} | marca ${brand} | ${c.stage}${c.dueAt ? ` | prazo ${fmtWhen(c.dueAt, false, clock)}` : ""}${c.value ? ` | R$ ${c.value}` : ""} | entregáveis pendentes: ${c.deliverables.filter((d) => !d.done).map((d) => d.text).join("; ") || "nenhum"} | aprovada ${c.approved ? "sim" : "não"} | paga ${c.paid ? "sim" : "não"}`);
  }
  lines.push(`\n## clientes / leads`);
  for (const c of s.clients.filter((c) => c.stage !== "lost").slice(0, 30)) lines.push(`- [${c.id}] ${c.name}${c.company ? ` (${c.company})` : ""} | ${c.kind} | ${c.stage}${c.nextFollowUpAt ? ` | follow-up ${fmtWhen(c.nextFollowUpAt, false, clock)}` : ""}`);
  lines.push(`\n## metas`);
  for (const g of s.goals.filter((g) => g.status === "active").slice(0, 15)) lines.push(`- [${g.id}] ${g.title} | ${g.horizon} | ${g.current}/${g.target ?? "?"} ${g.unit ?? ""}`);
  const f = financeSummary(s, clock);
  lines.push(`\n## financeiro do mês: previsto R$ ${f.expected}, recebido R$ ${f.received}, a receber R$ ${f.receivable}, despesas R$ ${f.expenses}`);
  lines.push(`inbox: ${s.captures.filter((c) => c.status === "pending").length} capturas pendentes`);
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Tool loop                                                           */
/* ------------------------------------------------------------------ */

export async function claudeRespond(
  auth: AuthContext,
  text: string,
  s: Snapshot,
  ctx: Ctx,
  conversationId: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<Out> {
  const clock = { now: ctx.now, tzOffset: ctx.tzOffset };
  const out: Out = { message: "", executed: [], proposals: [], changes: [], items: [], errors: [] };
  const merge = (r: ExecResult) => {
    out.executed.push(...r.executed);
    out.changes.push(...r.changes);
    out.errors!.push(...r.errors);
  };

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.slice(-12).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: `<workspace>\n${buildContext(auth, s, ctx)}\n</workspace>\n\n${text}` },
  ];
  // The API requires the first message to be from the user.
  while (messages.length && messages[0].role !== "user") messages.shift();

  const runTool = async (name: string, input: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case "create": {
        const items = (input.items as { entity: EntityName; data: Record<string, unknown>; ref?: string }[]) ?? [];
        const r = await executeActions(auth, items.map((i) => ({ type: "create", entity: i.entity, data: i.data, ref: i.ref })), { conversationId });
        merge(r);
        return JSON.stringify({ created: r.executed.map((e) => ({ entity: e.entity, id: e.id, title: e.title })), errors: r.errors });
      }
      case "update": {
        const r = await executeActions(auth, [{ type: "update", entity: input.entity as EntityName, id: String(input.id), data: input.data as Record<string, unknown> }], { conversationId });
        merge(r);
        return JSON.stringify({ updated: r.executed.map((e) => ({ id: e.id, title: e.title })), errors: r.errors });
      }
      case "delete": {
        const p = await proposeActions(auth, [{ type: "delete", entity: input.entity as EntityName, id: String(input.id) }], String(input.label ?? "Excluir item"), conversationId);
        out.proposals.push(p);
        return JSON.stringify({ status: "aguardando confirmação do usuário na interface" });
      }
      case "propose_changes": {
        const actions = (input.actions as Record<string, unknown>[]).map((a) => (a.type === "update" ? { type: "update", entity: a.entity, id: a.id, data: a.data } : { type: "create", entity: a.entity, data: a.data }));
        const p = await proposeActions(auth, actions as never, String(input.label ?? "Aplicar alterações"), conversationId);
        out.proposals.push(p);
        return JSON.stringify({ status: "proposta exibida ao usuário para aprovação", count: p.count });
      }
      case "search": {
        const hits = searchAll(s, String(input.query ?? ""), 15);
        out.items = hits.map((h) => ({ entity: h.entity, id: h.id, title: h.title, meta: h.subtitle, href: h.href })) satisfies ReplyItem[];
        return JSON.stringify(hits.map(({ entity, id, title, subtitle }) => ({ entity, id, title, type: subtitle })));
      }
      case "get_item": {
        const entity = input.entity as EntityName;
        const list = (s[entity] ?? []) as { id: string }[];
        const item = list.find((x) => x.id === input.id);
        if (!item) return JSON.stringify({ error: "não encontrado" });
        const related: Record<string, unknown[]> = {};
        for (const [name, rows] of Object.entries(s) as [string, Record<string, unknown>[]][]) {
          const hits = rows.filter((r) => Object.entries(r).some(([k, v]) => k.endsWith("Id") && v === input.id));
          if (hits.length) related[name] = hits.map((h) => ({ id: h.id, title: h.title ?? h.name, status: h.status ?? h.stage }));
        }
        return JSON.stringify({ item, related });
      }
      case "plan_day": {
        const blocks = planDay(s, clock, auth.workspace.settings, Number(input.day_offset ?? 0));
        out.plan = blocks;
        return JSON.stringify(blocks.map((b) => ({ ...b, start: fmtWhen(b.start, true, clock), end: fmtWhen(b.end, true, clock), startIso: b.start })));
      }
    }
    return JSON.stringify({ error: `ferramenta desconhecida: ${name}` });
  };

  const api = getClient();
  for (let turn = 0; turn < 6; turn++) {
    const response = await api.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      // Server-side refusal fallback: if the primary model declines, the API retries on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "refusal") {
      out.message = "Não posso ajudar com esse pedido. Posso ajudar com suas tarefas, agenda ou conteúdo?";
      break;
    }
    const texts = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text);
    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || !toolUses.length) {
      out.message = texts.join("\n").trim();
      break;
    }
    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      try {
        const input = (tu.input ?? {}) as Record<string, unknown>;
        results.push({ type: "tool_result", tool_use_id: tu.id, content: await runTool(tu.name, input) });
      } catch (err) {
        results.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: err instanceof Error ? err.message : "erro" });
      }
    }
    messages.push({ role: "user", content: results });
    if (turn === 5) out.message = texts.join("\n").trim() || "Feito.";
  }

  if (!out.message) {
    out.message = out.executed.length ? `Pronto: ${out.executed.map((e) => e.title).join(", ")}.` : "Feito.";
  }
  if (!out.errors!.length) delete out.errors;
  if (!out.items!.length) delete out.items;
  return out;
}
