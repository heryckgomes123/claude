"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useClientValue } from "@/hooks/use-client-value";
import { isEmbedded } from "@/lib/nav";
import { useRouter } from "next/navigation";
import { Bell, Download, LogOut, Smartphone, Sparkles, SlidersHorizontal, Clapperboard, User, Cpu, RotateCcw, Share } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Avatar, Button, Card, Select, Toggle, Badge } from "@/components/ui";
import { CommitInput } from "@/components/detail/common";
import { AivaLogo } from "@/components/brand";
import { useAiva } from "@/store/aiva";
import { useSettings } from "@/hooks/use-snapshot";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";

const PLATFORMS = ["instagram", "tiktok", "youtube", "twitch", "linkedin", "kwai", "x"];
const PL: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", twitch: "Twitch", linkedin: "LinkedIn", kwai: "Kwai", x: "X" };

type InstallEvent = Event & { prompt: () => Promise<void> };

export function SettingsView() {
  const me = useAiva((s) => s.me);
  const settings = useSettings();
  const save = useAiva((s) => s.saveSettings);
  const toast = useAiva((s) => s.toast);
  const router = useRouter();
  const initialPerm = useClientValue(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission), "default");
  const [permOverride, setPerm] = useState<string | null>(null);
  const perm = permOverride ?? initialPerm;
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const standalone = useClientValue(() => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true, false);
  const ios = useClientValue(() => /iphone|ipad|ipod/i.test(navigator.userAgent), false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const embedded = useClientValue(isEmbedded, false);
  if (!me) return null;
  const name = settings.displayName ?? me.user.name;

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  };

  const askNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") toast({ message: "Notificações ativadas", tone: "success" });
  };

  return (
    <Page>
      <PageHeader title="Configurações" />
      <div className="grid gap-5">
        <Card className="flex items-center gap-4 p-5">
          <Avatar name={name} color={me.user.avatarColor} size={56} />
          <div className="min-w-0 flex-1">
            <CommitInput big value={name} onCommit={(v) => v.trim() && save({ displayName: v.trim().slice(0, 40) })} aria-label="Nome" />
            <p className="truncate text-sm text-muted">{me.user.email}</p>
          </div>
        </Card>

        <Section icon={<Clapperboard className="h-4 w-4" />} title="Creator Mode">
          <Row label="Ativar camada Creator" hint="Ideias, pipeline, lives, marcas e métricas.">
            <Toggle checked={!!settings.creatorMode} onChange={(v) => save({ creatorMode: v })} label="Creator Mode" />
          </Row>
          {settings.creatorMode && (
            <>
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {PLATFORMS.map((p) => {
                  const on = settings.platforms?.includes(p);
                  return (
                    <button key={p} onClick={() => save({ platforms: on ? settings.platforms!.filter((x) => x !== p) : [...(settings.platforms ?? []), p] })} className={cn("pressable h-9 rounded-full border px-3.5 text-[13px]", on ? "grad border-transparent text-white" : "border-line bg-surface text-muted")}>
                      {PL[p]}
                    </button>
                  );
                })}
              </div>
              <Row label="Nicho">
                <CommitInput value={settings.niche} onCommit={(v) => save({ niche: v.trim() })} className="w-44" placeholder="tecnologia…" />
              </Row>
              <Row label="Publicações por semana">
                <Select value={settings.postsPerWeek ?? 3} onChange={(e) => save({ postsPerWeek: Number(e.target.value) })} className="w-24">
                  {[1, 2, 3, 4, 5, 7, 10, 14].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </Row>
            </>
          )}
        </Section>

        <Section icon={<SlidersHorizontal className="h-4 w-4" />} title="Seu ritmo">
          <Row label="Início do dia">
            <Select value={settings.dayStart ?? 8} onChange={(e) => save({ dayStart: Number(e.target.value) })} className="w-28">
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
            </Select>
          </Row>
          <Row label="Fim do dia">
            <Select value={settings.dayEnd ?? 19} onChange={(e) => save({ dayEnd: Number(e.target.value) })} className="w-28">
              {Array.from({ length: 24 }, (_, h) => h + 1).filter((h) => h > (settings.dayStart ?? 0)).map((h) => <option key={h} value={h}>{String(h % 24).padStart(2, "0")}:00</option>)}
            </Select>
          </Row>
          <Row label="Quando rende mais">
            <Select value={settings.peakTime ?? ""} onChange={(e) => e.target.value && save({ peakTime: e.target.value as "morning" })} className="w-36">
              <option value="">—</option>
              <option value="morning">Manhã</option>
              <option value="afternoon">Tarde</option>
              <option value="night">Noite</option>
              <option value="late">Madrugada</option>
            </Select>
          </Row>
          <Link href="/onboarding?recalibrate=1" className="flex items-center gap-3 border-t border-line px-4 py-3.5 text-sm hover:bg-surface-2">
            <RotateCcw className="h-4 w-4 text-muted" /> Recalibrar a AIVA
          </Link>
        </Section>

        {!embedded && (
        <Section icon={<Smartphone className="h-4 w-4" />} title="Aplicativo">
          <Row label="Instalar na tela inicial" hint={standalone ? "Você já está usando o app instalado." : ios ? "No Safari: toque em Compartilhar → “Adicionar à Tela de Início”." : "Abre em tela cheia, como um app nativo."}>
            {standalone ? (
              <Badge tone="green">Instalado</Badge>
            ) : install ? (
              <Button size="sm" variant="primary" onClick={() => install.prompt().then(() => setInstall(null))}>
                <Download className="h-4 w-4" /> Instalar
              </Button>
            ) : ios ? (
              <Share className="h-5 w-5 text-muted" />
            ) : (
              <span className="text-[12px] text-faint">menu do navegador</span>
            )}
          </Row>
          <Row label="Notificações" hint="Lives, lembretes, atrasos e prazos de campanha — sem spam.">
            {perm === "granted" ? <Badge tone="green">Ativas</Badge> : perm === "denied" ? <Badge tone="red">Bloqueadas no navegador</Badge> : perm === "unsupported" ? <Badge>Indisponível</Badge> : <Button size="sm" onClick={askNotifications}><Bell className="h-4 w-4" /> Ativar</Button>}
          </Row>
        </Section>
        )}

        <Section icon={<Cpu className="h-4 w-4" />} title="AIVA AI">
          <Row label="Motor de IA" hint={me.ai.provider === "claude" ? "Claude (Anthropic) com acesso às ações do seu workspace." : "Local: entende linguagem natural e age nos seus dados, sem enviar nada para fora. Defina ANTHROPIC_API_KEY no servidor para respostas avançadas."}>
            <Badge tone={me.ai.provider === "claude" ? "violet" : "default"}>
              <Sparkles className="h-3 w-3" /> {me.ai.provider === "claude" ? "Claude" : "Local"}
            </Badge>
          </Row>
        </Section>

        <Section icon={<User className="h-4 w-4" />} title="Conta & dados">
          <a href="/api/export" className="flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-surface-2">
            <Download className="h-4 w-4 text-muted" /> Exportar meus dados (JSON)
          </a>
          {!embedded && <button onClick={logout} className="flex w-full items-center gap-3 border-t border-line px-4 py-3.5 text-left text-sm text-red hover:bg-red/5">
            <LogOut className="h-4 w-4" /> Sair
          </button>}
        </Section>

        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <AivaLogo size={20} />
          <p className="text-[12px] text-faint">Seu segundo cérebro · v1.0</p>
        </div>
      </div>
    </Page>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
        {icon} {title}
      </h2>
      <div className="card overflow-hidden p-0">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] text-faint">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
