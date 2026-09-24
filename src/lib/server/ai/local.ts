import "server-only";
import type { AuthContext } from "../auth";
import type { Snapshot } from "@/lib/types";
import type { AiAction } from "@/lib/ai/actions";
import type { AiReply, ReplyItem } from "@/lib/ai/reply";
import { interpret } from "@/lib/nlp/interpret";
import { norm, type Ctx } from "@/lib/nlp/datetime";
import {
  buildToday,
  dayRange,
  campaignStatus,
  contentsThisWeek,
  dailyReview,
  financeSummary,
  followUps,
  fmtDay,
  fmtWhen,
  isOpenTask,
  isOverdue,
  planDay,
  searchAll,
  brl,
  normalize,
  STAGE_LABEL,
  type ItemRef,
} from "@/lib/intelligence";
import { generateIdeas, generateScript, strongerHooks, caption, variations } from "@/lib/ai/studio";
import { executeActions, proposeActions } from "./execute";

type Out = Omit<AiReply, "conversationId" | "provider">;

const toItems = (refs: ItemRef[]): ReplyItem[] => refs.map((r) => ({ entity: r.entity, id: r.id, title: r.title, meta: r.meta, href: r.href, tone: r.tone }));

function fuzzyFind<T extends { id: string }>(list: T[], label: (x: T) => string, q: string): T | undefined {
  const terms = normalize(q)
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (!terms.length) return undefined;
  let best: T | undefined;
  let bestScore = 0;
  for (const x of list) {
    const l = normalize(label(x));
    const score = terms.filter((w) => l.includes(w)).length / terms.length;
    if (score > bestScore) {
      best = x;
      bestScore = score;
    }
  }
  return bestScore >= 0.5 ? best : undefined;
}

/** Offline AIVA brain: interprets, queries the real workspace data and acts. */
export async function localRespond(auth: AuthContext, text: string, s: Snapshot, ctx: Ctx, conversationId: string): Promise<Out> {
  const clock = { now: ctx.now, tzOffset: ctx.tzOffset };
  const n = norm(text);
  const empty: Out = { message: "", executed: [], proposals: [], changes: [] };

  /* ---------- complete / delete by name ---------- */
  const doneM = /^(?:aiva[,\s]+)?(?:conclu[ií]\w*|terminei|finalizei|feito|fiz|marca[r]?|marque)\s+(?:a\s+tarefa\s+|o\s+|a\s+)?(.+?)(?:\s+como\s+(?:feita|feito|concluida|concluido))?[.!]*$/i.exec(text);
  if (doneM && /^(aiva[,\s]+)?(conclu|terminei|finalizei|feito|fiz|marca)/.test(n)) {
    const task = fuzzyFind(s.tasks.filter(isOpenTask), (t) => t.title, doneM[1]);
    if (task) {
      const r = await executeActions(auth, [{ type: "update", entity: "tasks", id: task.id, data: { status: "done" } }], { conversationId });
      return { ...empty, ...r, message: `✓ Concluí **${task.title}**. Boa!`, followups: ["O que faço agora?"] };
    }
  }
  const delM = /^(?:aiva[,\s]+)?(?:exclu\w*|apag\w*|delet\w*|remov\w*)\s+(?:a\s+|o\s+)?(tarefa|nota|ideia|evento|conteudo|conteúdo|projeto|cliente)?\s*(.+?)[.!]*$/i.exec(text);
  if (delM && /^(aiva[,\s]+)?(exclu|apag|delet|remov)/.test(n)) {
    const kind = norm(delM[1] ?? "");
    const pools: [string, { id: string }[], (x: never) => string][] = [
      ["tarefa", s.tasks, (x: { title: string }) => x.title],
      ["nota", s.notes, (x: { title: string }) => x.title],
      ["ideia", s.ideas, (x: { title: string }) => x.title],
      ["evento", s.events, (x: { title: string }) => x.title],
      ["conteudo", s.contents, (x: { title: string }) => x.title],
      ["projeto", s.projects, (x: { name: string }) => x.name],
      ["cliente", s.clients, (x: { name: string }) => x.name],
    ] as never;
    const entityOf: Record<string, AiAction["entity"]> = { tarefa: "tasks", nota: "notes", ideia: "ideas", evento: "events", conteudo: "contents", projeto: "projects", cliente: "clients" };
    for (const [k, list, label] of pools) {
      if (kind && kind !== k) continue;
      const hit = fuzzyFind(list, label as (x: { id: string }) => string, delM[2]);
      if (hit) {
        const name = (label as (x: unknown) => string)(hit);
        const p = await proposeActions(auth, [{ type: "delete", entity: entityOf[k], id: hit.id }], `Excluir ${k} "${name}"`, conversationId);
        return { ...empty, message: `Tem certeza que quer excluir **${name}**? Essa ação não pode ser desfeita.`, proposals: [p] };
      }
    }
    return { ...empty, message: "Não encontrei esse item para excluir. Pode me dizer o nome exato?" };
  }

  /* ---------- content studio shortcuts ---------- */
  if (/\b(hook|gancho)s?\b.*\b(forte|melhor|novo|novos)\b|\b(melhor|forte)\w*\s+(o\s+)?(hook|gancho)/.test(n)) {
    const target = s.contents[0] ?? s.ideas[0];
    const title = target?.title ?? "seu conteúdo";
    return {
      ...empty,
      message: `Hooks mais fortes para **${title}**:\n${strongerHooks(title).map((h) => `- ${h}`).join("\n")}\n\nUse o que soar mais natural na sua voz.`,
      followups: ["Transforme em roteiro", "Crie uma legenda para Instagram"],
    };
  }
  if (/\blegenda\b/.test(n)) {
    const target = s.contents.find((c) => c.stage !== "published") ?? s.contents[0];
    const title = target?.title ?? "Seu próximo post";
    const cap = caption(title, target?.platform);
    const actions: AiAction[] = target ? [{ type: "update", entity: "contents", id: target.id, data: { caption: cap } }] : [];
    const proposals = actions.length ? [await proposeActions(auth, actions, `Salvar legenda em "${title}"`, conversationId)] : [];
    return { ...empty, message: `Legenda para **${title}**:\n\n${cap}`, proposals };
  }
  if (/\bvariac(ao|oes)\b/.test(n)) {
    const target = s.contents[0] ?? s.ideas[0];
    const title = target?.title ?? "seu conteúdo";
    const list = variations(title);
    const p = await proposeActions(
      auth,
      list.map((t) => ({ type: "create", entity: "ideas", data: { title: t, status: "raw", platform: target && "platform" in target ? target.platform : null } }) as AiAction),
      `Salvar ${list.length} variações no Idea Vault`,
      conversationId,
    );
    return { ...empty, message: `5 variações de **${title}**:\n${list.map((l) => `- ${l}`).join("\n")}`, proposals: [p] };
  }
  if (/\bcalendario de conteudo\b|\bcalendario editorial\b|\bproximos 7 dias\b/.test(n)) {
    const pool = [...s.ideas.filter((i) => i.status === "raw" || i.status === "approved" || i.status === "developing")].sort((a, b) => b.potential - a.potential);
    const settings = auth.workspace.settings;
    const perWeek = Math.min(Math.max(settings.postsPerWeek ?? 5, 1), 7);
    const topic = settings.niche || "seu nicho";
    const extra = generateIdeas(topic, 7, settings.platforms?.[0]);
    const actions: AiAction[] = [];
    const lines: string[] = [];
    for (let k = 0; k < perWeek; k++) {
      const d = 1 + Math.floor((k * 7) / perWeek);
      const idea = pool[k];
      const title = idea?.title ?? extra[k].title;
      const day = new Date(ctx.now.getTime() - ctx.tzOffset * 60_000 + d * 86_400_000);
      const local = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 18, 0) + ctx.tzOffset * 60_000;
      actions.push({
        type: "create",
        entity: "contents",
        data: { title, stage: idea ? "script" : "idea", scheduledAt: new Date(local).toISOString(), platform: (idea?.platform ?? settings.platforms?.[0]) || null, ideaId: idea?.id ?? null, hook: idea?.hook ?? extra[k].hook },
      });
      lines.push(`- **${fmtDay(new Date(local).toISOString(), clock)}** 18:00 — ${title}${idea ? " _(do seu Idea Vault)_" : ""}`);
    }
    const p = await proposeActions(auth, actions, `Agendar ${actions.length} conteúdos nos próximos 7 dias`, conversationId);
    return { ...empty, message: `Proposta de calendário para os próximos 7 dias (${actions.length} publicações):\n${lines.join("\n")}`, proposals: [p] };
  }
  if (/\banalis\w*\s+(minhas\s+)?ideias\b/.test(n)) {
    const ideas = s.ideas.filter((i) => i.status !== "discarded" && i.status !== "used");
    if (!ideas.length) return { ...empty, message: "Seu Idea Vault está vazio. Capture algumas ideias e eu analiso para você." };
    const goal = s.goals.find((g) => g.status === "active" && g.category === "content");
    const ranked = [...ideas].sort((a, b) => b.potential - a.potential || (b.hook ? 1 : 0) - (a.hook ? 1 : 0));
    return {
      ...empty,
      message: `Analisei ${ideas.length} ideias${goal ? ` considerando sua meta "${goal.title}"` : ""}. Critério: potencial que você marcou + se já tem hook definido.\n\n**Mais prontas para produzir:**\n${ranked
        .slice(0, 3)
        .map((i) => `- ${i.title} (potencial ${i.potential}/5${i.hook ? ", com hook" : ""})`)
        .join("\n")}${ranked.length > 3 ? `\n\n**Precisam de lapidação:** ${ranked.slice(3, 6).map((i) => i.title).join(" · ")}` : ""}`,
      items: ranked.slice(0, 5).map((i) => ({ entity: "ideas", id: i.id, title: i.title, meta: `potencial ${i.potential}/5`, href: `/creator?tab=ideas&open=${i.id}` })),
      followups: ["Transforme a melhor ideia em roteiro"],
    };
  }

  const it = interpret(text, ctx);

  /* ---------- create ---------- */
  if (it.kind === "create") {
    const r = await executeActions(auth, it.actions, { conversationId });
    if (!r.executed.length) return { ...empty, ...r, message: `Não consegui salvar isso: ${r.errors.join("; ")}` };
    const main = r.executed[0];
    const labels: Record<string, string> = { tasks: "tarefa", events: "compromisso", ideas: "ideia", contents: "conteúdo", notes: "nota", lives: "live", clients: "contato", campaigns: "campanha", goals: "meta", habits: "hábito", projects: "projeto", transactions: "lançamento", brands: "marca" };
    const extras = r.executed.slice(1).map((e) => labels[e.entity] ?? e.entity);
    return {
      ...empty,
      ...r,
      message: `Pronto! Criei ${labels[main.entity] === "ideia" || labels[main.entity] === "tarefa" || labels[main.entity] === "nota" || labels[main.entity] === "live" || labels[main.entity] === "meta" || labels[main.entity] === "campanha" ? "a" : "o"} ${labels[main.entity] ?? "item"} **${main.title}**${extras.length ? ` e também ${extras.join(", ")} na agenda` : ""}.`,
      followups: it.suggestions,
    };
  }

  /* ---------- queries ---------- */
  if (it.kind === "query") {
    const today = buildToday(s, clock);
    switch (it.query) {
      case "next_action": {
        const na = today.nextAction;
        if (!na) return { ...empty, message: "Nada pendente agora. Que tal capturar o que está na sua cabeça ou planejar amanhã?" };
        return { ...empty, message: `👉 **${na.title}**\n${na.reason}`, items: na.ref ? toItems([na.ref]) : undefined, followups: ["Organize meu dia"] };
      }
      case "priorities": {
        const list = [...today.now, ...today.today].slice(0, 6);
        const overdue = today.overdue.slice(0, 3);
        if (!list.length && !overdue.length) return { ...empty, message: "Você não tem prioridades marcadas para hoje. Quer que eu organize seu dia com o que está em aberto?", followups: ["Organize meu dia"] };
        return {
          ...empty,
          message: `Suas prioridades de hoje${overdue.length ? ` (e ${overdue.length} atrasada${overdue.length > 1 ? "s" : ""})` : ""}:`,
          items: toItems([...overdue, ...list]),
          followups: ["O que faço agora?", "Organize meu dia"],
        };
      }
      case "overdue": {
        if (!today.overdue.length) return { ...empty, message: "Nada atrasado. 🎉" };
        return { ...empty, message: `Você tem ${today.overdue.length} ${today.overdue.length === 1 ? "item atrasado" : "itens atrasados"}:`, items: toItems(today.overdue), followups: ["Reorganize os atrasados para amanhã"] };
      }
      case "today":
      case "tomorrow":
      case "week": {
        const off = it.query === "tomorrow" ? 1 : 0;
        const span = it.query === "week" ? 7 : 1;
        const r0 = dayRange(clock, off);
        const end = r0.start + span * 86_400_000;
        const evs = s.events.filter((e) => new Date(e.startAt).getTime() >= r0.start && new Date(e.startAt).getTime() < end).sort((a, b) => a.startAt.localeCompare(b.startAt));
        const tks = s.tasks.filter((t) => isOpenTask(t) && t.dueAt && new Date(t.dueAt).getTime() >= r0.start && new Date(t.dueAt).getTime() < end);
        const label = it.query === "tomorrow" ? "Amanhã" : it.query === "week" ? "Nos próximos 7 dias" : "Hoje";
        if (!evs.length && !tks.length) return { ...empty, message: `${label} você não tem compromissos nem tarefas com prazo.` };
        return {
          ...empty,
          message: `${label}: ${evs.length} compromisso${evs.length === 1 ? "" : "s"} e ${tks.length} tarefa${tks.length === 1 ? "" : "s"}.`,
          items: [
            ...evs.map((e) => ({ entity: "events", id: e.id, title: e.title, meta: e.allDay ? fmtDay(e.startAt, clock) : fmtWhen(e.startAt, true, clock), href: `/calendar?open=${e.id}` })),
            ...tks.map((t) => ({ entity: "tasks", id: t.id, title: t.title, meta: fmtWhen(t.dueAt, t.hasTime, clock), href: `/tasks?open=${t.id}` })),
          ],
        };
      }
      case "contents_week": {
        const list = contentsThisWeek(s, clock);
        const unscheduled = s.contents.filter((c) => !c.scheduledAt && ["review", "editing"].includes(c.stage));
        if (!list.length) return { ...empty, message: `Nenhum conteúdo agendado para esta semana.${unscheduled.length ? ` Mas ${unscheduled.length} estão quase prontos para agendar.` : ""}`, followups: ["Crie um calendário de conteúdo para os próximos 7 dias"] };
        return {
          ...empty,
          message: `Você tem ${list.length} conteúdo${list.length === 1 ? "" : "s"} para publicar esta semana:`,
          items: list.map((c) => ({ entity: "contents", id: c.id, title: c.title, meta: [c.platform, fmtWhen(c.scheduledAt, true, clock), STAGE_LABEL[c.stage]].filter(Boolean).join(" · "), href: `/creator?open=${c.id}`, tone: c.stage === "scheduled" ? "ok" : "warn" })),
        };
      }
      case "followups": {
        const list = followUps(s, clock);
        if (!list.length) return { ...empty, message: "Nenhum cliente esperando follow-up agora." };
        return {
          ...empty,
          message: `${list.length} ${list.length === 1 ? "contato precisa" : "contatos precisam"} de follow-up:`,
          items: list.map((c) => ({ entity: "clients", id: c.id, title: c.name, meta: [c.company, c.nextFollowUpAt ? `follow-up ${fmtDay(c.nextFollowUpAt, clock)}` : "sem contato há 14+ dias"].filter(Boolean).join(" · "), href: `/clients?open=${c.id}` })),
        };
      }
      case "campaign": {
        const subj = it.subject ?? "";
        const brand = fuzzyFind(s.brands, (b) => b.name, subj);
        const camp = (brand && s.campaigns.find((c) => c.brandId === brand.id && c.stage !== "done")) ?? fuzzyFind(s.campaigns, (c) => c.title, subj);
        if (!camp) return { ...empty, message: `Não encontrei nenhuma campanha de "${subj}" no seu workspace. Quer criar uma?`, followups: [`Nova campanha com ${subj}`] };
        const st = campaignStatus(s, camp, clock);
        const lines: string[] = [];
        if (st.missingDeliverables.length) lines.push(`**Entregáveis pendentes (${st.missingDeliverables.length}):**\n${st.missingDeliverables.map((d) => `- ${d.text}`).join("\n")}`);
        if (st.unpublished.length) lines.push(`**Conteúdos em produção:**\n${st.unpublished.map((c) => `- ${c.title} — ${STAGE_LABEL[c.stage]}`).join("\n")}`);
        if (st.openTasks.length) lines.push(`**Tarefas abertas:**\n${st.openTasks.map((t) => `- ${t.title}`).join("\n")}`);
        if (!camp.approved && ["production", "delivery"].includes(camp.stage)) lines.push("- Aprovação da marca ainda não registrada.");
        if (!camp.paid && camp.value) lines.push(`- Pagamento de ${brl(camp.value)} ainda não recebido.`);
        return {
          ...empty,
          message: lines.length
            ? `Para entregar **${camp.title}**${st.due ? ` (prazo ${st.due})` : ""}, falta:\n\n${lines.join("\n\n")}`
            : `**${camp.title}** não tem pendências registradas. Etapa atual: ${camp.stage}.`,
          items: [{ entity: "campaigns", id: camp.id, title: camp.title, meta: st.brand?.name, href: `/creator?tab=brands&open=${camp.id}` }],
        };
      }
      case "lives": {
        const list = s.lives.filter((l) => l.status !== "done").sort((a, b) => (a.startAt ?? "9").localeCompare(b.startAt ?? "9")).slice(0, 5);
        if (!list.length) return { ...empty, message: "Nenhuma live planejada. Quer agendar uma?", followups: ["Agendar live sexta às 20h"] };
        return {
          ...empty,
          message: `Suas próximas ${list.length} lives:`,
          items: list.map((l) => {
            const pend = l.checklist.filter((c) => !c.done).length;
            return { entity: "lives", id: l.id, title: l.title, meta: [l.startAt ? fmtWhen(l.startAt, true, clock) : "sem data", l.platform, pend ? `${pend} itens no checklist` : "checklist ok", !l.agenda ? "sem pauta" : null].filter(Boolean).join(" · "), href: `/creator?tab=lives&open=${l.id}`, tone: !l.startAt || !l.agenda ? "warn" : "info" };
          }),
        };
      }
      case "finance": {
        const f = financeSummary(s, clock);
        return {
          ...empty,
          message: `**Este mês**\n- Receita prevista: ${brl(f.expected)}\n- Recebido: ${brl(f.received)}\n- A receber (total): ${brl(f.receivable)}\n- Despesas: ${brl(f.expenses)}\n- Resultado: ${brl(f.result)}`,
          items: s.transactions.filter((t) => t.status === "pending" && t.kind === "income").slice(0, 5).map((t) => ({ entity: "transactions", id: t.id, title: t.title, meta: `${brl(t.amount)}${t.dueAt ? ` · ${fmtDay(t.dueAt, clock)}` : ""}`, href: "/finance" })),
        };
      }
      case "review": {
        const r = dailyReview(s, clock);
        return {
          ...empty,
          message: `**Seu dia em resumo**\n- ✓ ${r.done.length} tarefas concluídas\n- → ${r.pending.length} pendentes\n- ⚠️ ${r.overdue.length} atrasadas\n- 🎥 ${r.published.length} conteúdos publicados\n\n**Amanhã** você tem ${r.tomorrowTasks.length} tarefas e ${r.tomorrowEvents.length} compromissos.`,
          followups: ["Organize meu dia de amanhã"],
        };
      }
      default: {
        const hits = searchAll(s, it.subject ?? text);
        if (!hits.length) return { ...empty, message: `Não encontrei nada sobre "${it.subject ?? text}" no seu workspace.` };
        return { ...empty, message: `Encontrei ${hits.length} ${hits.length === 1 ? "item" : "itens"} relacionados:`, items: hits.map((h) => ({ entity: h.entity, id: h.id, title: h.title, meta: h.subtitle, href: h.href })) };
      }
    }
  }

  /* ---------- commands ---------- */
  switch (it.command) {
    case "plan_day":
    case "plan_week": {
      const tomorrow = /\bamanha\b/.test(n);
      const blocks = planDay(s, clock, auth.workspace.settings, tomorrow ? 1 : 0);
      const taskBlocks = blocks.filter((b) => b.kind === "task" && b.taskId && !s.tasks.find((t) => t.id === b.taskId)?.hasTime);
      if (!blocks.length) return { ...empty, message: "Não há tarefas abertas nem compromissos para organizar. Seu dia está livre! ✨" };
      const actions: AiAction[] = taskBlocks.map((b) => ({ type: "update", entity: "tasks", id: b.taskId!, data: { dueAt: b.start, hasTime: true, status: "todo" } }));
      const proposals = actions.length ? [await proposeActions(auth, actions, `Aplicar plano (${actions.length} tarefas com horário)`, conversationId)] : [];
      const overdue = s.tasks.filter((t) => isOverdue(t, clock)).length;
      return {
        ...empty,
        message: `Montei seu ${tomorrow ? "dia de amanhã" : "dia"} respeitando seus compromissos${overdue ? ` e puxando ${overdue} atrasada${overdue > 1 ? "s" : ""} primeiro` : ""}. Posso aplicar os horários nas tarefas?`,
        plan: blocks,
        proposals,
      };
    }
    case "organize_inbox": {
      const pending = s.captures.filter((c) => c.status === "pending");
      const inboxTasks = s.tasks.filter((t) => t.status === "inbox");
      if (!pending.length && !inboxTasks.length) return { ...empty, message: "Sua inbox está zerada. 🧘" };
      const actions: AiAction[] = [
        ...pending.map((c) => ({ type: "update" as const, entity: "captures" as const, id: c.id, data: { status: "organized" } })),
        ...inboxTasks.map((t) => ({ type: "update" as const, entity: "tasks" as const, id: t.id, data: { status: "todo" } })),
      ];
      const r = await executeActions(auth, actions.slice(0, 20), { conversationId });
      return { ...empty, ...r, message: `Organizei ${r.executed.length} itens: capturas classificadas e tarefas movidas para "A fazer".`, followups: ["Quais são minhas prioridades hoje?"] };
    }
    case "script": {
      const subj = it.subject;
      const preferIdea = it.target === "idea";
      const openIdea = s.ideas.find((i) => i.status !== "used" && i.status !== "discarded");
      const content = preferIdea
        ? subj
          ? fuzzyFind(s.contents, (c) => c.title, subj)
          : undefined
        : subj
          ? fuzzyFind(s.contents, (c) => c.title, subj)
          : s.contents.find((c) => !c.script && ["idea", "script", "recording"].includes(c.stage));
      const idea = !content ? (subj ? fuzzyFind(s.ideas, (i) => i.title, subj) : openIdea) : undefined;
      if (content) {
        const script = generateScript(content.title, content.hook, content.platform);
        const r = await executeActions(auth, [{ type: "update", entity: "contents", id: content.id, data: { script, stage: content.stage === "idea" ? "script" : content.stage } }], { conversationId });
        return { ...empty, ...r, message: `Roteiro criado para **${content.title}** e salvo no conteúdo:\n\n${script}`, followups: ["Crie um hook mais forte", "Crie uma legenda para Instagram"] };
      }
      if (idea) {
        const script = generateScript(idea.title, idea.hook, idea.platform);
        const r = await executeActions(
          auth,
          [
            { type: "create", entity: "contents", ref: "c", data: { title: idea.title, hook: idea.hook, platform: idea.platform, format: idea.format, stage: "script", script, ideaId: idea.id } },
            { type: "update", entity: "ideas", id: idea.id, data: { status: "used", contentId: "$ref:c" } },
          ],
          { conversationId },
        );
        return { ...empty, ...r, message: `Transformei a ideia **${idea.title}** em conteúdo com roteiro (etapa: Roteiro):\n\n${script}`, followups: ["Agendar gravação amanhã às 10h"] };
      }
      const title = subj ?? "Seu próximo vídeo";
      return { ...empty, message: `Aqui vai um roteiro base para **${title}**:\n\n${generateScript(title)}`, followups: [`Tive uma ideia de vídeo sobre ${title}`] };
    }
    case "generate_ideas": {
      const settings = auth.workspace.settings;
      const topic = it.subject || settings.niche || "produtividade";
      const list = generateIdeas(topic, it.count ?? 5, it.platform ?? settings.platforms?.[0]);
      const p = await proposeActions(
        auth,
        list.map((i) => ({ type: "create", entity: "ideas", data: { ...i, status: "raw", potential: 3, category: topic } }) as AiAction),
        `Salvar ${list.length} ideias no Idea Vault`,
        conversationId,
      );
      return {
        ...empty,
        message: `${list.length} ideias${it.platform ? ` para ${it.platform}` : ""} sobre **${topic}**:\n${list.map((i, k) => `${k + 1}. **${i.title}**\n   _Hook:_ ${i.hook}`).join("\n")}\n\n_Modo local: ideias a partir de formatos que funcionam. Conecte a API da Anthropic para ideias personalizadas._`,
        proposals: [p],
      };
    }
  }
  return { ...empty, message: "Não entendi. Tente algo como “reunião sexta às 14h” ou “quais são minhas prioridades?”." };
}
