"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clapperboard,
  Sparkles,
  Star,
  Gamepad2,
  MonitorPlay,
  Laptop,
  Rocket,
  Briefcase,
  HelpCircle,
  Music2,
  Heart,
  Users,
  FolderKanban,
  Infinity as InfinityIcon,
  Sunrise,
  Sun,
  Moon,
  MoonStar,
} from "lucide-react";
import { AivaMark, AivaOrb } from "@/components/brand";
import { Button, Input, Textarea, Select, Progress } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";

type Role = "creator" | "influencer" | "tiktoker" | "streamer" | "youtuber" | "freelancer" | "entrepreneur" | "professional" | "other";
type Focus = "life" | "work" | "content" | "clients" | "projects" | "all";
type Peak = "morning" | "afternoon" | "night" | "late";

const ROLES: { value: Role; label: string; icon: typeof Star; hint: string }[] = [
  { value: "creator", label: "Creator", icon: Clapperboard, hint: "Produzo conteúdo" },
  { value: "influencer", label: "Influencer", icon: Star, hint: "Marcas e publis" },
  { value: "tiktoker", label: "TikToker", icon: Music2, hint: "Vídeos curtos" },
  { value: "streamer", label: "Streamer", icon: Gamepad2, hint: "Lives" },
  { value: "youtuber", label: "YouTuber", icon: MonitorPlay, hint: "Vídeos longos" },
  { value: "freelancer", label: "Freelancer", icon: Laptop, hint: "Clientes e jobs" },
  { value: "entrepreneur", label: "Empreendedor", icon: Rocket, hint: "Meu negócio" },
  { value: "professional", label: "Profissional", icon: Briefcase, hint: "Trabalho e carreira" },
  { value: "other", label: "Outro", icon: HelpCircle, hint: "Um pouco de tudo" },
];

const FOCUS: { value: Focus; label: string; icon: typeof Star }[] = [
  { value: "life", label: "Minha vida", icon: Heart },
  { value: "work", label: "Trabalho", icon: Briefcase },
  { value: "content", label: "Conteúdo", icon: Clapperboard },
  { value: "clients", label: "Clientes", icon: Users },
  { value: "projects", label: "Projetos", icon: FolderKanban },
  { value: "all", label: "Tudo", icon: InfinityIcon },
];

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "twitch", label: "Twitch" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "kwai", label: "Kwai" },
  { value: "x", label: "X" },
];

const PEAKS: { value: Peak; label: string; icon: typeof Sun; hint: string }[] = [
  { value: "morning", label: "Manhã", icon: Sunrise, hint: "6h–12h" },
  { value: "afternoon", label: "Tarde", icon: Sun, hint: "12h–18h" },
  { value: "night", label: "Noite", icon: Moon, hint: "18h–0h" },
  { value: "late", label: "Madrugada", icon: MoonStar, hint: "0h–6h" },
];

const CREATOR_ROLES = new Set<Role>(["creator", "influencer", "tiktoker", "streamer", "youtuber"]);

const BOOT = ["BOOTING AIVA", "ANALYZING PROFILE", "INITIALIZING SECOND BRAIN"];

type StepId = "boot" | "name" | "role" | "focus" | "creator" | "rhythm" | "focusNow" | "calibrating";

export function Calibration({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("boot");
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<Role | null>(null);
  const [focus, setFocus] = useState<Focus[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [niche, setNiche] = useState("");
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [peak, setPeak] = useState<Peak | null>(null);
  const [dayStart, setDayStart] = useState(8);
  const [dayEnd, setDayEnd] = useState(19);
  const [mainFocus, setMainFocus] = useState("");
  const [habits, setHabits] = useState<string[]>([]);
  const [bootLines, setBootLines] = useState(0);

  const isCreator = (role && CREATOR_ROLES.has(role)) || focus.includes("content") || focus.includes("all");
  const steps: StepId[] = useMemo(() => ["name", "role", "focus", ...(isCreator ? (["creator"] as StepId[]) : []), "rhythm", "focusNow"], [isCreator]);
  const index = steps.indexOf(step);

  useEffect(() => {
    if (step !== "boot") return;
    if (bootLines < BOOT.length) {
      const t = setTimeout(() => setBootLines((n) => n + 1), 420);
      return () => clearTimeout(t);
    }
  }, [step, bootLines]);

  const next = () => {
    if (step === "boot") return setStep("name");
    const i = steps.indexOf(step);
    if (i === steps.length - 1) return setStep("calibrating");
    setStep(steps[i + 1]);
  };
  const back = () => {
    const i = steps.indexOf(step);
    if (i > 0) setStep(steps[i - 1]);
  };

  const canNext =
    step === "name" ? name.trim().length > 0 : step === "role" ? !!role : step === "focus" ? focus.length > 0 : step === "creator" ? platforms.length > 0 : step === "rhythm" ? !!peak && dayEnd > dayStart : true;

  const habitOptions = ["Beber água", "Exercício", "Leitura", "Meditação", "Planejar o dia", "Revisar o dia", "Estudar", ...(isCreator ? ["Postar conteúdo", "Responder comentários"] : [])];

  if (step === "calibrating") {
    return (
      <Calibrating
        payload={{
          displayName: name.trim(),
          role: role ?? "other",
          focus,
          creatorMode: Boolean(isCreator),
          platforms,
          niche: niche.trim() || undefined,
          postsPerWeek: isCreator ? postsPerWeek : undefined,
          peakTime: peak ?? undefined,
          dayStart,
          dayEnd,
          mainFocus: mainFocus.trim() || undefined,
          habits,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }}
        onDone={() => {
          router.replace("/today");
          router.refresh();
        }}
        onBack={() => setStep("focusNow")}
      />
    );
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-[max(16px,var(--safe-top))] pb-[max(20px,var(--safe-bottom))]">
      {step !== "boot" && (
        <div className="flex items-center gap-3">
          <button onClick={back} disabled={index === 0} className="pressable grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted disabled:opacity-0" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Progress value={((index + 1) / (steps.length + 1)) * 100} className="flex-1" />
          <span className="w-10 text-right text-xs text-faint">
            {index + 1}/{steps.length}
          </span>
        </div>
      )}

      <div key={step} className="flex flex-1 animate-rise flex-col justify-center py-8">
        {step === "boot" && (
          <div className="text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] border border-white/10 bg-[radial-gradient(120%_120%_at_20%_10%,#241a4d,#0e0b1f_55%,#07070c)] shadow-[0_20px_80px_-20px_rgb(139_92_255/0.8)]">
              <AivaMark size={64} />
            </div>
            <div className="mx-auto mt-8 grid max-w-xs gap-1.5 text-left font-mono text-[12px] text-faint">
              {BOOT.slice(0, bootLines).map((l) => (
                <p key={l} className="animate-fade-in">
                  <span className="text-green">✓</span> [{l}...]
                </p>
              ))}
            </div>
            {bootLines >= BOOT.length && (
              <div className="animate-rise">
                <h1 className="mt-8 text-3xl font-semibold">Olá{name ? `, ${name.split(" ")[0]}` : ""}. 👋</h1>
                <p className="mx-auto mt-3 max-w-sm text-muted">Vou fazer algumas perguntas rápidas para calibrar a AIVA do seu jeito. Leva menos de um minuto.</p>
                <Button variant="primary" size="lg" className="mt-8" onClick={next} autoFocus>
                  Começar calibração <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "name" && (
          <Question title="Como você quer que eu te chame?" subtitle="É assim que vou falar com você todos os dias.">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canNext && next()}
              maxLength={40}
              autoFocus
              className="h-14 text-lg"
              placeholder="Seu nome"
              aria-label="Nome"
            />
          </Question>
        )}

        {step === "role" && (
          <Question title="Como você trabalha?" subtitle="Escolha o que mais combina com você.">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {ROLES.map((r) => (
                <OptionCard key={r.value} active={role === r.value} onClick={() => setRole(r.value)} icon={<r.icon className="h-5 w-5" />} label={r.label} hint={r.hint} />
              ))}
            </div>
          </Question>
        )}

        {step === "focus" && (
          <Question title="O que você quer organizar?" subtitle="Pode escolher mais de um.">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {FOCUS.map((f) => (
                <OptionCard
                  key={f.value}
                  active={focus.includes(f.value)}
                  onClick={() => setFocus((prev) => (f.value === "all" ? (prev.includes("all") ? [] : ["all"]) : prev.includes(f.value) ? prev.filter((x) => x !== f.value) : [...prev.filter((x) => x !== "all"), f.value]))}
                  icon={<f.icon className="h-5 w-5" />}
                  label={f.label}
                  multi
                />
              ))}
            </div>
          </Question>
        )}

        {step === "creator" && (
          <Question title="Onde você cria?" subtitle="Vou ativar o Creator Mode com essas plataformas.">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlatforms((prev) => (prev.includes(p.value) ? prev.filter((x) => x !== p.value) : [...prev, p.value]))}
                  className={cn("pressable h-11 rounded-full border px-4 text-sm font-medium", platforms.includes(p.value) ? "grad border-transparent text-white" : "border-line bg-surface text-muted")}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="mt-6 grid gap-2">
              <span className="text-sm text-muted">Seu nicho ou tema principal</span>
              <Input value={niche} onChange={(e) => setNiche(e.target.value)} maxLength={80} placeholder="Ex.: tecnologia, fitness, humor, finanças…" />
            </label>
            <div className="mt-6 grid gap-2">
              <span className="text-sm text-muted">Quantos conteúdos quer publicar por semana?</span>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 5, 7, 14].map((n) => (
                  <button key={n} onClick={() => setPostsPerWeek(n)} className={cn("pressable h-11 min-w-14 rounded-xl border px-3 text-sm font-medium", postsPerWeek === n ? "border-transparent bg-ink text-bg" : "border-line bg-surface text-muted")}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </Question>
        )}

        {step === "rhythm" && (
          <Question title="Qual é o seu ritmo?" subtitle="Uso isso para montar seu dia e sugerir horários.">
            <p className="mb-2 text-sm text-muted">Quando você rende mais?</p>
            <div className="grid grid-cols-2 gap-2.5">
              {PEAKS.map((p) => (
                <OptionCard key={p.value} active={peak === p.value} onClick={() => setPeak(p.value)} icon={<p.icon className="h-5 w-5" />} label={p.label} hint={p.hint} />
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <label className="grid gap-1.5">
                <span className="text-sm text-muted">Meu dia começa</span>
                <Select value={dayStart} onChange={(e) => setDayStart(Number(e.target.value))}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm text-muted">E termina</span>
                <Select value={dayEnd} onChange={(e) => setDayEnd(Number(e.target.value))}>
                  {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                    <option key={h} value={h}>
                      {String(h % 24).padStart(2, "0")}:00
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            {dayEnd <= dayStart && <p className="mt-2 text-sm text-orange">O fim do dia precisa ser depois do início.</p>}
          </Question>
        )}

        {step === "focusNow" && (
          <Question title="Qual é o seu foco principal agora?" subtitle="Vira sua primeira meta. Pode pular.">
            <Textarea value={mainFocus} onChange={(e) => setMainFocus(e.target.value)} rows={2} maxLength={200} placeholder={isCreator ? "Ex.: chegar a 10 mil seguidores no TikTok" : "Ex.: lançar meu site até o fim do mês"} />
            <p className="mt-6 mb-2 text-sm text-muted">Quer acompanhar algum hábito?</p>
            <div className="flex flex-wrap gap-2">
              {habitOptions.map((h) => (
                <button
                  key={h}
                  onClick={() => setHabits((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]))}
                  className={cn("pressable flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm", habits.includes(h) ? "border-violet/50 bg-violet/15 text-ink" : "border-line bg-surface text-muted")}
                >
                  {habits.includes(h) && <Check className="h-3.5 w-3.5" />} {h}
                </button>
              ))}
            </div>
          </Question>
        )}
      </div>

      {step !== "boot" && (
        <Button variant="primary" size="lg" className="w-full" disabled={!canNext} onClick={next}>
          {index === steps.length - 1 ? (
            <>
              <Sparkles className="h-5 w-5" /> Calibrar minha AIVA
            </>
          ) : (
            <>
              Continuar <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
      )}
    </main>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-[26px] leading-tight font-semibold sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      <div className="mt-7">{children}</div>
    </div>
  );
}

function OptionCard({ active, onClick, icon, label, hint, multi }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; hint?: string; multi?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "pressable relative flex min-h-[92px] flex-col items-start justify-between gap-2 rounded-2xl border p-3.5 text-left",
        active ? "grad-border shadow-[0_10px_40px_-15px_rgb(139_92_255/0.8)]" : "border-line bg-surface hover:bg-surface-2",
      )}
    >
      <span className={cn("grid h-9 w-9 place-items-center rounded-xl", active ? "grad text-white" : "bg-surface-2 text-muted")}>{icon}</span>
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {hint && <span className="block text-[12px] text-faint">{hint}</span>}
      </span>
      {multi && active && (
        <span className="absolute top-3 right-3 grid h-5 w-5 place-items-center rounded-full bg-ink text-bg">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function Calibrating({ payload, onDone, onBack }: { payload: Record<string, unknown> & { creatorMode: boolean; platforms: string[]; habits: string[]; dayStart: number; dayEnd: number; mainFocus?: string; displayName: string }; onDone: () => void; onBack: () => void }) {
  const lines = useMemo(
    () => [
      "INITIALIZING TASK ENGINE",
      "INITIALIZING PROJECT ENGINE",
      "INITIALIZING CALENDAR",
      ...(payload.creatorMode ? ["INITIALIZING CREATOR ENGINE", "INITIALIZING CONTENT ENGINE", "INITIALIZING LIVE CENTER"] : []),
      "INITIALIZING CRM",
      "INITIALIZING FINANCIAL LAYER",
      "INITIALIZING AIVA AI",
      "INITIALIZING VOICE ENGINE",
      "PERSONALIZING WORKSPACE",
    ],
    [payload.creatorMode],
  );
  const [shown, setShown] = useState(0);
  const [saved, setSaved] = useState<"pending" | "ok" | "error">("pending");
  const [error, setError] = useState("");
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    api("/api/workspace/calibrate", { body: payload })
      .then(() => setSaved("ok"))
      .catch((err) => {
        setSaved("error");
        setError(err instanceof Error ? err.message : "Erro");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shown < lines.length) {
      const t = setTimeout(() => setShown((n) => n + 1), 230);
      return () => clearTimeout(t);
    }
  }, [shown, lines.length]);

  const ready = shown >= lines.length && saved === "ok";
  const hh = (h: number) => `${String(h % 24).padStart(2, "0")}h`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-5 pt-[var(--safe-top)] pb-[max(20px,var(--safe-bottom))] text-center">
      <AivaOrb size={ready ? 88 : 120} active={!ready} className="transition-all duration-700" />
      {!ready ? (
        <div className="mt-10 grid w-full max-w-xs gap-1.5 text-left font-mono text-[12px]">
          {lines.slice(0, shown).map((l) => (
            <p key={l} className="animate-fade-in text-faint">
              <span className="text-green">✓</span> [{l}...]
            </p>
          ))}
          {saved === "error" && (
            <div className="mt-4 grid gap-3 font-sans">
              <p className="text-sm text-red">{error}</p>
              <Button onClick={onBack}>Voltar</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 w-full animate-rise">
          <p className="font-mono text-[12px] tracking-widest text-green">[AIVA READY]</p>
          <h1 className="mt-3 text-3xl font-semibold">Tudo pronto, {payload.displayName.split(" ")[0]}.</h1>
          <p className="mt-2 text-muted">Seu segundo cérebro foi calibrado:</p>
          <ul className="card mx-auto mt-6 grid max-w-sm gap-2.5 p-4 text-left text-sm">
            <li className="flex gap-2">
              <Check className="h-4 w-4 shrink-0 text-green" /> Dia útil das {hh(payload.dayStart)} às {hh(payload.dayEnd)}
            </li>
            {payload.creatorMode && (
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-green" /> Creator Mode ativo{payload.platforms.length ? ` · ${payload.platforms.join(", ")}` : ""}
              </li>
            )}
            {payload.mainFocus && (
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-green" /> Meta criada: {payload.mainFocus}
              </li>
            )}
            {payload.habits.length > 0 && (
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-green" /> {payload.habits.length} hábito{payload.habits.length > 1 ? "s" : ""} na sua rotina
              </li>
            )}
            <li className="flex gap-2">
              <Check className="h-4 w-4 shrink-0 text-green" /> AIVA AI e comandos de voz prontos
            </li>
          </ul>
          <Button variant="primary" size="lg" className="mt-8 w-full max-w-sm" onClick={onDone} autoFocus>
            Abrir meu dia <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </main>
  );
}
