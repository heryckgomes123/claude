import "server-only";
import bcrypt from "bcryptjs";

const COST = 11;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | null = null;

/** Executa uma comparação "falsa" para equalizar o tempo quando o e-mail não existe. */
export async function fakeVerify(password: string): Promise<false> {
  dummyHash ??= bcrypt.hash("rbeauty-timing-equalizer", COST);
  await bcrypt.compare(password, await dummyHash);
  return false;
}
