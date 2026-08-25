/**
 * Agent 3 — the Solver.
 *
 * Takes the highest-scored open issue, gives itself an isolated git worktree,
 * applies the bounded change, WRITES A TEST FOR IT, runs the suite, and only then
 * opens a real pull request. A red suite means no pull request — the agent never
 * asks a human to review work it could not verify itself.
 *
 *   npm run agent:solver
 */
import { execFile } from "node:child_process";
import { existsSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { CATALOG, ID_MARKER, readId, stampId } from "./catalog.js";
import { createPull, listIssues, listPulls } from "./gh.js";
import { emit, STATE_DIR } from "./events.js";
import { rankIssues } from "./issue-scoring.js";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INTERVAL_MS = Number(process.env.SOLVE_INTERVAL_MS ?? 30_000);

async function git(args: string[], cwd = ROOT): Promise<string> {
  const { stdout } = await run("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return stdout;
}

function scoreFromLabels(labels: { name: string }[]): number | undefined {
  const l = labels.find((x) => x.name.startsWith("score:"));
  return l ? Number(l.name.split(":")[1]) : undefined;
}

async function pickIssue() {
  const [issues, pulls] = await Promise.all([listIssues(60), listPulls(60)]);
  const claimed = new Set(
    pulls.filter((p) => p.state !== "CLOSED").map((p) => readId(p.body ?? "")).filter(Boolean),
  );

  const candidates = issues
    .filter((i) => i.labels.some((l) => l.name === "autopilot"))
    .map((i) => ({ issue: i, id: readId(i.body ?? "") }))
    .filter((c) => c.id && !claimed.has(c.id) && CATALOG.some((e) => e.id === c.id));

  if (candidates.length === 0) return undefined;

  // Prefer the score Triage wrote onto the issue; fall back to computing it ourselves.
  const local = new Map(
    rankIssues(candidates.map((c) => ({ number: c.issue.number, title: c.issue.title, body: c.issue.body ?? "" })))
      .map((s) => [s.number, s.score] as const),
  );

  return candidates
    .map((c) => ({
      ...c,
      score: scoreFromLabels(c.issue.labels) ?? local.get(c.issue.number) ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.issue.number - b.issue.number)[0];
}

async function solve(): Promise<void> {
  const picked = await pickIssue();
  if (!picked) {
    emit("solver", "idle", "nothing unclaimed in the backlog");
    return;
  }

  const entry = CATALOG.find((e) => e.id === picked.id)!;
  const branch = `autopilot/${entry.id}`;
  const wt = join(STATE_DIR, `wt-${entry.id}`);

  emit("solver", "picked", `#${picked.issue.number} "${entry.title}" (score ${picked.score})`, {
    issue: picked.issue.number,
  });

  await git(["fetch", "origin", "main"]);
  if (existsSync(wt)) await git(["worktree", "remove", "--force", wt]).catch(() => {});
  await git(["worktree", "add", "-B", branch, wt, "origin/main"]);

  try {
    if (!existsSync(join(wt, "node_modules"))) {
      symlinkSync(join(ROOT, "node_modules"), join(wt, "node_modules"), "dir");
    }

    const scoringPath = join(wt, "src", "scoring.ts");
    const testPath = join(wt, "src", "scoring.test.ts");
    const scoring = readFileSync(scoringPath, "utf8");

    if (scoring.includes(entry.patch.applied)) {
      emit("solver", "skipped", `${entry.id} is already on main`, { issue: picked.issue.number });
      return;
    }
    if (!scoring.includes(entry.patch.find)) {
      emit("solver", "blocked", `anchor for ${entry.id} not found — needs a human`, {
        issue: picked.issue.number,
      });
      return;
    }

    writeFileSync(scoringPath, scoring.replace(entry.patch.find, entry.patch.replace), "utf8");
    writeFileSync(testPath, `${readFileSync(testPath, "utf8")}\n${entry.test.trim()}\n`, "utf8");
    emit("solver", "patched", `${entry.id}: change + regression test written`, {
      issue: picked.issue.number,
    });

    try {
      await run("npm", ["test"], { cwd: wt, maxBuffer: 10 * 1024 * 1024 });
    } catch (error) {
      emit("solver", "rejected", `tests failed for ${entry.id} — no pull request opened`, {
        issue: picked.issue.number,
      });
      void error;
      return;
    }
    emit("solver", "verified", `tests green for ${entry.id}`, { issue: picked.issue.number });

    await git(["add", "-A"], wt);
    await git(["commit", "-m", `fix: ${entry.title.toLowerCase()}\n\nCloses #${picked.issue.number}`], wt);
    await git(["push", "--force-with-lease", "-u", "origin", branch], wt);

    const body = stampId(
      [
        `Closes #${picked.issue.number}`,
        "",
        "### Proposed change",
        entry.proposal,
        "",
        "### How this was verified",
        "The solver agent ran the full unit-test suite in an isolated git worktree before opening",
        "this pull request. CI re-runs it on this branch. A red suite means no pull request at all.",
        "",
        `_Opened automatically by Backlog Autopilot · issue score ${picked.score}._`,
      ].join("\n"),
      entry.id,
    );

    const url = await createPull(branch, `fix: ${entry.title}`, body, wt);
    emit("solver", "proposed", `pull request open for #${picked.issue.number} → ${url}`, {
      issue: picked.issue.number,
    });
  } finally {
    await git(["worktree", "remove", "--force", wt]).catch(() => {});
  }
}

async function main(): Promise<void> {
  emit("solver", "start", `checking the backlog every ${INTERVAL_MS / 1000}s`);
  for (;;) {
    try {
      await solve();
    } catch (error) {
      emit("solver", "error", (error as Error).message);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

void main();
void ID_MARKER;
