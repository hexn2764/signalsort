import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export type GhIssue = {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
  createdAt: string;
  state: string;
};

export type GhPull = {
  number: number;
  title: string;
  headRefName: string;
  url: string;
  state: string;
  body: string;
};

/** Thin wrapper over the `gh` CLI. No tokens, no SDK — we reuse your existing login. */
async function gh(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await run("gh", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return stdout;
}

export async function listIssues(limit = 60): Promise<GhIssue[]> {
  const out = await gh([
    "issue", "list",
    "--state", "open",
    "--limit", String(limit),
    "--json", "number,title,body,labels,createdAt,state",
  ]);
  return JSON.parse(out) as GhIssue[];
}

export async function listPulls(limit = 40): Promise<GhPull[]> {
  const out = await gh([
    "pr", "list",
    "--state", "all",
    "--limit", String(limit),
    "--json", "number,title,headRefName,url,state,body",
  ]);
  return JSON.parse(out) as GhPull[];
}

export async function createIssue(title: string, body: string, labels: string[]): Promise<number> {
  const args = ["issue", "create", "--title", title, "--body", body];
  for (const l of labels) args.push("--label", l);
  const url = (await gh(args)).trim();
  return Number(url.split("/").pop());
}

export async function addLabels(issueNumber: number, labels: string[]): Promise<void> {
  const args = ["issue", "edit", String(issueNumber)];
  for (const l of labels) args.push("--add-label", l);
  await gh(args);
}

export async function removeLabelsMatching(issue: GhIssue, prefix: string): Promise<void> {
  const stale = issue.labels.map((l) => l.name).filter((n) => n.startsWith(prefix));
  if (stale.length === 0) return;
  const args = ["issue", "edit", String(issue.number)];
  for (const l of stale) args.push("--remove-label", l);
  await gh(args);
}

export async function ensureLabel(name: string, color: string, description: string): Promise<void> {
  try {
    await gh(["label", "create", name, "--color", color, "--description", description, "--force"]);
  } catch {
    /* label already exists in a form gh cannot overwrite — not fatal */
  }
}

export async function createPull(head: string, title: string, body: string, cwd: string): Promise<string> {
  const out = await gh(
    ["pr", "create", "--base", "main", "--head", head, "--title", title, "--body", body],
    cwd,
  );
  return out.trim();
}

export async function mergePull(number: number): Promise<void> {
  await gh(["pr", "merge", String(number), "--squash", "--delete-branch"]);
}

export async function closePull(number: number, comment: string): Promise<void> {
  await gh(["pr", "close", String(number), "--comment", comment, "--delete-branch"]);
}

export async function repoSlug(): Promise<string> {
  const out = await gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);
  return out.trim();
}
