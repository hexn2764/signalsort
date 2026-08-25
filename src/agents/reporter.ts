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

/**
 * Back-pressure: never let more than this many autopilot issues sit open at once.
 * The reporter stands in for reality, but reality that spams a repository is a worse
 * demo, not a better one. As the solver drains the backlog and a human accepts pull
 * requests, room frees up and the reporter files again — so this cap regulates the
 * whole loop, not just agent 1.
 */
const MAX_OPEN = Number(process.env.MAX_OPEN_ISSUES ?? 5);

function nextDelay(): number {
  return MIN_MS + Math.floor(Math.random() * Math.max(0, MAX_MS - MIN_MS));
}

type Backlog = { used: Set<string>; openAutopilot: number };

async function readBacklog(): Promise<Backlog> {
  const [issues, pulls] = await Promise.all([listIssues(100), listPulls(100)]);
  const used = new Set<string>();
  let openAutopilot = 0;

  for (const i of issues) {
    const id = readId(i.body ?? "");
    if (id) used.add(id);
    if (i.labels.some((l) => l.name === "autopilot")) openAutopilot += 1;
  }
  for (const p of pulls) {
    const id = readId(p.body ?? "");
    if (id) used.add(id);
  }

  return { used, openAutopilot };
}

async function fileOne(): Promise<void> {
  const { used, openAutopilot } = await readBacklog();

  if (openAutopilot >= MAX_OPEN) {
    emit("reporter", "capped", `${openAutopilot}/${MAX_OPEN} autopilot issues already open — holding`);
    return;
  }

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

  emit("reporter", "start", `one issue every ${MIN_MS / 1000}–${MAX_MS / 1000}s, max ${MAX_OPEN} open at a time`);
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
