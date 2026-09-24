"use client";

import { useEffect, useMemo, useState } from "react";

/** Current time + timezone offset, refreshed every 30s so "now/overdue" stay accurate. */
export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => ({ now, tzOffset: now.getTimezoneOffset() }), [now]);
}
