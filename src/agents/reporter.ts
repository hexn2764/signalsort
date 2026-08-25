/**
 * Agent 1 — the Reporter.
 *
 * Stands in for the stream of reality: users, monitoring, support, teammates.
 * Every 1–5 minutes it files ONE real GitHub issue in this repository.
 *
 *   npm run agent:reporter
 */
import { CATALOG, ID_MARKER, readId, stampId } from "./catalog.js";
import { createIssue, ensureLabel, listIssues, listPulls } from "./gh.js";
import { emit } from "./events.js";

const MIN_MS = Number(process.env.REPORT_MIN_MS ?? 60_000); // 1 minute
const MAX_MS = Number(process.env.REPORT_MAX_MS ?? 300_000); // 5 minutes

function nextDelay(): number {
  return MIN_MS + Math.floor(Math.random() * Math.max(0, MAX_MS - MIN_MS));
}

async function usedIds(): Promise<Set<string>> {
  const [issues, pulls] = await Promise.all([listIssues(100), listPulls(100)]);
  const ids = new Set<string>();
  for (const i of issues) {
    const id = readId(i.body ?? "");
    if (id) ids.add(id);
  }
  for (const p of pulls) {
    const id = readId(p.body ?? "");
    if (id) ids.add(id);
  }
  return ids;
}

async function fileOne(): Promise<void> {
  const used = await usedIds();
  const candidates = CATALOG.filter((e) => !used.has(e.id));

  if (candidates.length === 0) {
    emit("reporter", "idle", "every catalog item is already filed or solved");
    return;
  }

  const entry = candidates[Math.floor(Math.random() * candidates.length)]!;
  const body = stampId(entry.body, entry.id);
  const number = await createIssue(entry.title, body, entry.labels);
  emit("reporter", "filed", entry.title, { issue: number });
}

async function main(): Promise<void> {
  await ensureLabel("autopilot", "5B5BD6", "Filed or handled by Backlog Autopilot");
  await ensureLabel("bug", "D73A4A", "Something is not working");
  await ensureLabel("enhancement", "0E8A16", "New capability or improvement");

  emit("reporter", "start", `filing one issue every ${MIN_MS / 1000}–${MAX_MS / 1000}s`);
  await fileOne();

  for (;;) {
    const wait = nextDelay();
    emit("reporter", "sleep", `next issue in ${Math.round(wait / 1000)}s`);
    await new Promise((r) => setTimeout(r, wait));
    try {
      await fileOne();
    } catch (error) {
      emit("reporter", "error", (error as Error).message);
    }
  }
}

void main();
void ID_MARKER;
