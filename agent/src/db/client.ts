import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import type { ConversationRecord } from "./schema.js";

const DATA_DIR = process.env.AGENT_DATA_DIR ?? "./data";
const DB_PATH = `${DATA_DIR}/conversations.json`;

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function load(): Map<string, ConversationRecord> {
  if (!existsSync(DB_PATH)) return new Map();
  const raw = readFileSync(DB_PATH, "utf-8");
  const arr: ConversationRecord[] = JSON.parse(raw);
  return new Map(arr.map((c) => [c.id, c]));
}

function save(store: Map<string, ConversationRecord>): void {
  writeFileSync(DB_PATH, JSON.stringify([...store.values()], null, 2));
}

const store = load();

export const db = {
  getConversation(id: string): ConversationRecord | undefined {
    return store.get(id);
  },

  listConversations(userId: string, organizationId: string): ConversationRecord[] {
    return [...store.values()]
      .filter((c) => c.userId === userId && c.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  upsertConversation(record: ConversationRecord): void {
    store.set(record.id, record);
    save(store);
  },

  deleteConversation(id: string): boolean {
    const existed = store.delete(id);
    if (existed) save(store);
    return existed;
  },
};
