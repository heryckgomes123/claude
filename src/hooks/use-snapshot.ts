"use client";

import { useAiva } from "@/store/aiva";
import type { Snapshot } from "@/lib/types";

export const EMPTY_SNAPSHOT: Snapshot = {
  tasks: [],
  projects: [],
  events: [],
  goals: [],
  habits: [],
  notes: [],
  captures: [],
  ideas: [],
  contents: [],
  lives: [],
  brands: [],
  campaigns: [],
  clients: [],
  transactions: [],
  notifications: [],
};

export function useSnapshot(): Snapshot {
  return useAiva((s) => s.data) ?? EMPTY_SNAPSHOT;
}

export function useSettings() {
  return useAiva((s) => s.me?.workspace.settings) ?? {};
}
