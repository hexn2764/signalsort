import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const STATE_DIR = join(root, ".autopilot");
const LOG = join(STATE_DIR, "events.jsonl");

export type AgentName = "reporter" | "triage" | "solver";

export type AgentEvent = {
  at: string;
  agent: AgentName;
  action: string;
  detail: string;
  issue?: number;
  pr?: number;
};

export function emit(agent: AgentName, action: string, detail: string, extra: Partial<AgentEvent> = {}): void {
  const event: AgentEvent = { at: new Date().toISOString(), agent, action, detail, ...extra };
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  appendFileSync(LOG, `${JSON.stringify(event)}\n`, "utf8");
  console.log(`[${agent}] ${action} — ${detail}`);
}

export function recentEvents(limit = 40): AgentEvent[] {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line) as AgentEvent)
    .reverse();
}
