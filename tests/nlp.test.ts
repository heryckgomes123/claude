import { describe, expect, it } from "vitest";
import { extractDateTime, wallParts } from "@/lib/nlp/datetime";
import { interpret, parseMoney } from "@/lib/nlp/interpret";

// Thursday 2026-09-24 10:00 in São Paulo (UTC-3)
const ctx = { now: new Date("2026-09-24T13:00:00Z"), tzOffset: 180 };
const local = (d: Date | null) => {
  const p = wallParts(d!, ctx.tzOffset);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")} ${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;
};

describe("extractDateTime", () => {
  it.each([
    ["amanhã às 10h", "2026-09-25 10:00", true],
    ["sexta às 14h", "2026-09-25 14:00", true],
    ["reunião amanhã às três", "2026-09-25 15:00", true],
    ["gravar o vídeo às oito", "2026-09-24 20:00", true], // 8h already passed today → 20h? no: bare 8 passes → tomorrow 08:00
    ["dia 30 às 9:30", "2026-09-30 09:30", true],
    ["15/10", "2026-10-15 12:00", false],
    ["próxima segunda de manhã", "2026-09-28 09:00", true],
    ["hoje à noite", "2026-09-24 20:00", true],
    ["às 7 da noite", "2026-09-24 19:00", true],
    ["depois de amanhã", "2026-09-26 12:00", false],
    ["em 3 dias", "2026-09-27 12:00", false],
    ["meio-dia", "2026-09-24 12:00", true],
    ["5 de dezembro", "2026-12-05 12:00", false],
  ])("%s", (text, expected, hasTime) => {
    const r = extractDateTime(text, ctx);
    if (text === "gravar o vídeo às oito") {
      // 08:00 has passed at 10:00 → next occurrence is tomorrow 08:00
      expect(local(r.at)).toBe("2026-09-25 08:00");
      return;
    }
    expect(local(r.at)).toBe(expected);
    expect(r.hasTime).toBe(hasTime);
  });

  it("returns null when there is no date", () => {
    expect(extractDateTime("comprar pão", ctx).at).toBeNull();
  });
});

describe("interpret", () => {
  it("meeting with company becomes an event", () => {
    const r = interpret("Sexta tenho reunião com a empresa X às 14h.", ctx);
    expect(r.kind).toBe("create");
    if (r.kind !== "create") return;
    expect(r.primary).toBe("events");
    const a = r.actions[0];
    expect(a.type === "create" && a.data.title).toBe("Reunião com a empresa X");
    expect(a.type === "create" && local(new Date(a.data.startAt as string))).toBe("2026-09-25 14:00");
    expect(r.suggestions.join()).toContain("X");
  });

  it("recording tomorrow becomes content + agenda event", () => {
    const r = interpret("Tenho que gravar um vídeo amanhã.", ctx);
    if (r.kind !== "create") throw new Error("expected create");
    expect(r.primary).toBe("contents");
    expect(r.actions.map((a) => a.entity)).toEqual(["contents", "events"]);
    expect(r.suggestions).toContain("Criar roteiro");
  });

  it("idea gets hook and category", () => {
    const r = interpret("Tive uma ideia de vídeo sobre inteligência artificial.", ctx);
    if (r.kind !== "create") throw new Error("expected create");
    expect(r.primary).toBe("ideas");
    const a = r.actions[0];
    expect(a.type === "create" && a.data.category).toBe("Tecnologia");
    expect(a.type === "create" && a.data.hook).toBeTruthy();
    expect(a.type === "create" && a.data.title).toBe("Vídeo sobre inteligência artificial");
  });

  it("plain capture becomes a clean task with category", () => {
    const r = interpret("Preciso conversar com João sobre o orçamento do site.", ctx);
    if (r.kind !== "create") throw new Error("expected create");
    const a = r.actions[0];
    expect(r.primary).toBe("tasks");
    expect(a.type === "create" && a.data.title).toBe("Conversar com João sobre o orçamento do site");
    expect(a.type === "create" && a.data.category).toBe("Cliente");
  });

  it("reminder with voice wake word", () => {
    const r = interpret("AIVA, me lembre de gravar o vídeo às oito", ctx);
    if (r.kind !== "create") throw new Error("expected create");
    expect(r.primary).toBe("contents");
  });

  it("reminder task", () => {
    const r = interpret("me lembre de ligar para a Ana amanhã às 10h", ctx);
    if (r.kind !== "create") throw new Error("expected create");
    expect(r.primary).toBe("tasks");
    const a = r.actions[0];
    expect(a.type === "create" && a.data.title).toBe("Ligar para a Ana");
    expect(r.confirm).toBe("Criar lembrete para amanhã às 10h?");
  });

  it.each([
    ["AIVA, quais são minhas prioridades hoje?", "priorities"],
    ["o que está atrasado?", "overdue"],
    ["quais conteúdos preciso publicar essa semana?", "contents_week"],
    ["quais clientes precisam de follow-up?", "followups"],
    ["O que falta para eu entregar a campanha da Nike?", "campaign"],
    ["o que faço agora?", "next_action"],
  ])("query: %s", (text, q) => {
    const r = interpret(text, ctx);
    expect(r.kind).toBe("query");
    if (r.kind === "query") expect(r.query).toBe(q);
  });

  it("campaign subject is extracted", () => {
    const r = interpret("O que falta para eu entregar a campanha da Nike?", ctx);
    expect(r.kind === "query" && r.subject).toBe("Nike");
  });

  it.each([
    ["AIVA, organize meu dia.", "plan_day"],
    ["transforme essa ideia em roteiro", "script"],
    ["crie 10 ideias de TikTok", "generate_ideas"],
  ])("command: %s", (text, c) => {
    const r = interpret(text, ctx);
    expect(r.kind).toBe("command");
    if (r.kind === "command") expect(r.command).toBe(c);
  });

  it("meeting tomorrow at three", () => {
    const r = interpret("AIVA, coloque uma reunião amanhã às três", ctx);
    if (r.kind !== "create") throw new Error("expected create");
    expect(r.primary).toBe("events");
    expect(r.confirm).toBe('Agendar "Reunião" para amanhã às 15h?');
  });

  it("money", () => {
    expect(parseMoney("recebi r$ 2.500,50 da marca")).toBe(2500.5);
    expect(parseMoney("fechei publi de 3k")).toBe(3000);
    const r = interpret("gastei 50 reais com uber", ctx);
    expect(r.kind === "create" && r.primary).toBe("transactions");
  });

  it("idea for tiktok", () => {
    const r = interpret("AIVA, tenho uma ideia para TikTok: 5 ferramentas de IA que ninguém usa", ctx);
    if (r.kind !== "create") throw new Error("expected create");
    expect(r.primary).toBe("ideas");
    const a = r.actions[0];
    expect(a.type === "create" && a.data.platform).toBe("tiktok");
  });
});

describe("interpret — creator business", () => {
  it("closed deal becomes brand + approved campaign with value", () => {
    const r = interpret("fechei publi com a Nike de 3k para sexta", ctx);
    if (r.kind !== "create") throw new Error("expected create");
    expect(r.primary).toBe("campaigns");
    const [brand, camp] = r.actions;
    expect(brand.type === "create" && brand.data.name).toBe("Nike");
    expect(camp.type === "create" && camp.data.value).toBe(3000);
    expect(camp.type === "create" && camp.data.stage).toBe("approved");
    expect(camp.type === "create" && camp.data.brandId).toBe("$ref:brand");
  });

  it("recording event title drops the verb and article", () => {
    const r = interpret("Tenho que gravar um vídeo amanhã.", ctx);
    if (r.kind !== "create") throw new Error("expected create");
    const ev = r.actions[1];
    expect(ev.type === "create" && ev.data.title).toBe("Gravação: Vídeo");
  });
});

describe("interpret — studio commands", () => {
  it("platform is not treated as the idea topic", () => {
    const r = interpret("crie 10 ideias de TikTok", ctx);
    expect(r.kind === "command" && r.subject).toBeFalsy();
    expect(r.kind === "command" && r.platform).toBe("tiktok");
    expect(r.kind === "command" && r.count).toBe(10);
  });
  it("keeps a real topic", () => {
    const r = interpret("crie 5 ideias de reels sobre finanças pessoais", ctx);
    expect(r.kind === "command" && r.subject).toBe("finanças pessoais");
  });
  it("script targets ideas when the user says 'ideia'", () => {
    const r = interpret("transforme essa ideia em roteiro", ctx);
    expect(r.kind === "command" && r.target).toBe("idea");
  });
  it("script picks up quoted content name", () => {
    const r = interpret('Crie um roteiro para o conteúdo "Minha rotina" e salve no conteúdo (id x).', ctx);
    expect(r.kind === "command" && r.subject).toBe("Minha rotina");
  });
});
