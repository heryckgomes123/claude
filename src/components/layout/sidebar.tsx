import { BrandLockup } from "./brand";
import { SidebarNav } from "./nav-links";
import { UserCard } from "./user-card";

export function Sidebar({ demo }: { demo: boolean }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col bg-charcoal lg:flex">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_0%_0%,rgb(180_88_63/0.22),transparent_55%),radial-gradient(90%_50%_at_100%_100%,rgb(156_114_72/0.16),transparent_60%)]"
        aria-hidden
      />
      <div className="relative flex h-full flex-col px-4 py-6">
        <div className="px-2">
          <BrandLockup />
          {demo && (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-bronze-400/30 bg-bronze-500/10 px-2.5 py-1 text-[0.62rem] font-bold tracking-[0.15em] text-bronze-200 uppercase">
              <span className="size-1.5 rounded-full bg-bronze-300" aria-hidden /> Dados DEMO / SEED
            </span>
          )}
        </div>
        <div className="scrollbar-thin mt-8 flex-1 overflow-y-auto pr-1">
          <SidebarNav />
        </div>
        <div className="mt-4">
          <UserCard />
        </div>
      </div>
    </aside>
  );
}
