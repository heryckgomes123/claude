import type { EntityName } from "@/lib/entities";
import type { PlanBlock } from "@/lib/intelligence";

export type ReplyItem = { entity: string; id: string; title: string; meta?: string; href: string; tone?: string };

export type Proposal = { id: string; label: string; count: number; destructive: boolean };

export type AiReply = {
  conversationId: string;
  message: string;
  provider: "claude" | "local";
  executed: { code: string; label: string; entity: EntityName; id: string; title: string; op: string }[];
  proposals: Proposal[];
  items?: ReplyItem[];
  plan?: PlanBlock[];
  followups?: string[];
  changes: ({ entity: EntityName; row: Record<string, unknown> } | { entity: EntityName; deletedId: string })[];
  errors?: string[];
};
