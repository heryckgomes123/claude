"use client";

import Link from "next/link";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { NAV, SETTINGS_ITEM } from "@/components/shell/nav";
import { useAiva } from "@/store/aiva";

/** Mobile "Mais" menu — every area one tap away. */
export function MoreView() {
  const creator = useAiva((s) => s.me?.workspace.settings.creatorMode);
  const inbox = useAiva((s) => (s.data?.captures.filter((c) => c.status === "pending").length ?? 0) + (s.data?.tasks.filter((t) => t.status === "inbox").length ?? 0));
  const items = [...NAV.filter((n) => !n.creator || creator), SETTINGS_ITEM];
  return (
    <Page>
      <PageHeader title="Mais" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="card pressable relative flex h-24 flex-col justify-between p-4 hover:bg-surface-2">
            <item.icon className="h-5 w-5 text-[#c4b1ff]" />
            <span className="text-[15px] font-medium">{item.label}</span>
            {item.href === "/inbox" && inbox > 0 && <span className="grad absolute top-3 right-3 rounded-full px-2 text-[11px] font-semibold text-white">{inbox}</span>}
          </Link>
        ))}
      </div>
    </Page>
  );
}
