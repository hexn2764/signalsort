import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sampleInbox } from "./data.js";
import { triage } from "./scoring.js";
import { listIssues, listPulls, mergePull, closePull, repoSlug } from "./agents/gh.js";
import { rankIssues } from "./agents/issue-scoring.js";
import { readId } from "./agents/catalog.js";
import { recentEvents } from "./agents/events.js";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);

type BacklogItem = {
  issue: number;
  title: string;
  summary: string;
  score: number;
  signals: { severity: number; interest: number; effort: number };
  reasons: string[];
  status: "queued" | "proposed" | "accepted" | "dismissed";
  pr?: { number: number; url: string; state: string };
};

async function backlog(): Promise<{ repo: string; items: BacklogItem[] }> {
  const [repo, issues, pulls] = await Promise.all([repoSlug(), listIssues(60), listPulls(60)]);

  const prById = new Map<string, (typeof pulls)[number]>();
  for (const p of pulls) {
    const id = readId(p.body ?? "");
    if (id) prById.set(id, p);
  }

  const ranked = rankIssues(
    issues.map((i) => ({ number: i.number, title: i.title, body: i.body ?? "" })),
  );

  const items: BacklogItem[] = ranked.map((scored) => {
    const source = issues.find((i) => i.number === scored.number)!;
    const id = readId(source.body ?? "");
    const pr = id ? prById.get(id) : undefined;

    let status: BacklogItem["status"] = "queued";
    if (pr?.state === "MERGED") status = "accepted";
    else if (pr?.state === "CLOSED") status = "dismissed";
    else if (pr) status = "proposed";

    return {
      issue: scored.number,
      title: scored.title,
      summary: scored.summary,
      score: scored.score,
      signals: scored.signals,
      reasons: scored.reasons,
      status,
      pr: pr ? { number: pr.number, url: pr.url, state: pr.state } : undefined,
    };
  });

  return { repo, items };
}

function json(res: import("node:http").ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

async function readBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (req, res) => {
  try {
    const url = req.url ?? "/";

    if (url === "/api/triage") {
      const now = new Date();
      json(res, 200, triage(sampleInbox(now), now));
      return;
    }

    if (url === "/api/backlog") {
      json(res, 200, await backlog());
      return;
    }

    if (url === "/api/events") {
      json(res, 200, recentEvents(40));
      return;
    }

    if (url === "/api/accept" && req.method === "POST") {
      const { pr } = (await readBody(req)) as { pr?: number };
      if (!pr) return json(res, 400, { error: "pr is required" });
      await mergePull(pr);
      json(res, 200, { ok: true, merged: pr });
      return;
    }

    if (url === "/api/dismiss" && req.method === "POST") {
      const { pr } = (await readBody(req)) as { pr?: number };
      if (!pr) return json(res, 400, { error: "pr is required" });
      await closePull(pr, "Dismissed from the Developer view — a human will take this one.");
      json(res, 200, { ok: true, closed: pr });
      return;
    }

    if (url === "/" || url === "/index.html") {
      const html = await readFile(join(here, "public", "index.html"), "utf8");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  } catch (error) {
    json(res, 500, { error: (error as Error).message });
  }
});

server.listen(PORT, () => {
  console.log(`SignalSort + Backlog Autopilot on http://localhost:${PORT}`);
});
