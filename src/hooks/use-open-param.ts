"use client";

import { currentHref, currentSearch, replaceUrl } from "@/lib/nav";
import { useEffect } from "react";
import { useAiva } from "@/store/aiva";
import type { EntityName } from "@/lib/entities";

/** Opens the detail sheet for `?open=<id>` links (from AI replies, search, notifications). */
export function useOpenParam(entity: EntityName | ((id: string) => EntityName | null)) {
  const setUI = useAiva((s) => s.setUI);
  useEffect(() => {
    const read = () => {
      const params = currentSearch();
      const id = params.get("open");
      if (!id) return;
      const e = typeof entity === "function" ? entity(id) : entity;
      if (e) setUI({ detail: { entity: e, id } });
      params.delete("open");
      const path = currentHref().split("?")[0];
      replaceUrl(params.toString() ? `${path}?${params}` : path);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
