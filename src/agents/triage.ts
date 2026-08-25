/**
 * Agent 2 — Triage.
 *
 * Reads every open issue, scores it with the linear model in issue-scoring.ts,
 * and writes the verdict back onto the real GitHub issue as labels:
 *
 *   score:73   sev:4   int:3
 *
 * The labels are the point. A human can open github.com and audit the ranking
 * without running any of our code.
 *
 *   npm run agent:triage
 */
import { addLabels, ensureLabel, listIssues, removeLabelsMatching } from "./gh.js";
import { rankIssues } from "./issue-scoring.js";
import { emit } from "./events.js";

const INTERVAL_MS = Number(process.env.TRIAGE_INTERVAL_MS ?? 45_000);

async function pass(): Promise<void> {
  const issues = await listIssues(60);
  if (issues.length === 0) {
    emit("triage", "idle", "no open issues");
    return;
  }

  const ranked = rankIssues(
    issues.map((i) => ({ number: i.number, title: i.title, body: i.body ?? "" })),
  );

  let updated = 0;
  for (const scored of ranked) {
    const issue = issues.find((i) => i.number === scored.number)!;
    const wanted = [
      `score:${scored.score}`,
      `sev:${scored.signals.severity}`,
      `int:${scored.signals.interest}`,
    ];
    const current = issue.labels.map((l) => l.name);
    if (wanted.every((w) => current.includes(w))) continue;

    await removeLabelsMatching(issue, "score:");
    await removeLabelsMatching(issue, "sev:");
    await removeLabelsMatching(issue, "int:");
    for (const label of wanted) await ensureLabel(label, labelColor(label), "Backlog Autopilot");
    await addLabels(issue.number, wanted);
    updated += 1;
  }

  const top = ranked[0];
  emit(
    "triage",
    "ranked",
    `${ranked.length} open issues, ${updated} relabelled — top: #${top?.number} (${top?.score})`,
    { issue: top?.number },
  );
}

function labelColor(label: string): string {
  if (label.startsWith("score:")) {
    const value = Number(label.split(":")[1] ?? 0);
    if (value >= 70) return "D73A4A";
    if (value >= 45) return "D97706";
    return "9CA3AF";
  }
  return "5B5BD6";
}

async function main(): Promise<void> {
  emit("triage", "start", `re-ranking every ${INTERVAL_MS / 1000}s`);
  for (;;) {
    try {
      await pass();
    } catch (error) {
      emit("triage", "error", (error as Error).message);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

void main();
