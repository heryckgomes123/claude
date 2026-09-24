import type * as S from "@/db/schema";
import type { EntityName } from "./entities";

/** Converts Date fields into ISO strings, i.e. the shape that travels over JSON. */
type Jsonify<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K] };

export type Task = Jsonify<typeof S.tasks.$inferSelect>;
export type Project = Jsonify<typeof S.projects.$inferSelect>;
export type CalEvent = Jsonify<typeof S.events.$inferSelect>;
export type Goal = Jsonify<typeof S.goals.$inferSelect>;
export type Habit = Jsonify<typeof S.habits.$inferSelect>;
export type Note = Jsonify<typeof S.notes.$inferSelect>;
export type Capture = Jsonify<typeof S.captures.$inferSelect>;
export type Idea = Jsonify<typeof S.ideas.$inferSelect>;
export type Content = Jsonify<typeof S.contents.$inferSelect>;
export type Live = Jsonify<typeof S.lives.$inferSelect>;
export type Brand = Jsonify<typeof S.brands.$inferSelect>;
export type Campaign = Jsonify<typeof S.campaigns.$inferSelect>;
export type Client = Jsonify<typeof S.clients.$inferSelect>;
export type Transaction = Jsonify<typeof S.transactions.$inferSelect>;
export type Notification = Jsonify<typeof S.notifications.$inferSelect>;
export type WorkspaceSettings = S.WorkspaceSettings;
export type ChecklistItem = S.ChecklistItem;

export type EntityMap = {
  tasks: Task;
  projects: Project;
  events: CalEvent;
  goals: Goal;
  habits: Habit;
  notes: Note;
  captures: Capture;
  ideas: Idea;
  contents: Content;
  lives: Live;
  brands: Brand;
  campaigns: Campaign;
  clients: Client;
  transactions: Transaction;
};

export type Snapshot = { [K in EntityName]: EntityMap[K][] } & {
  notifications: Notification[];
};

export type Me = {
  user: { id: string; email: string; name: string; avatarColor: string | null };
  workspace: { id: string; name: string; settings: WorkspaceSettings };
  ai: { provider: "claude" | "local" };
};
