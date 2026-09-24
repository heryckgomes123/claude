// The single-file build has no server database; server-only helpers that import it are never called.
export async function getDb(): Promise<never> {
  throw new Error("No server database in the standalone build");
}
export const schema = {} as Record<string, never>;
