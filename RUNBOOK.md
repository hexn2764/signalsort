# Runbook — stop, clean, restart

Everything the autopilot does is a real GitHub object, so "cleaning up" means closing
issues and pull requests, not dropping a database. Nothing here touches `main`, nothing
here touches merged pull requests, and nothing here touches anything a human opened.

---

## 1. Stop it

**In the terminal running `npm run autopilot`: press `Ctrl-C` once.**
That stops the server and all three agents together.

If you started them in separate terminals, `Ctrl-C` in each. For orphans:

```bash
pkill -f "src/agents"
pkill -f "scripts/autopilot.mjs"
pkill -f "tsx src/server.ts"
```

Confirm:

```bash
ps aux | grep -c "[s]rc/agents"   # expect 0
lsof -ti:3000                      # expect no output
```

Stopping mid-flight is safe. The solver either opened a pull request or it did not —
there is no half-written state. A worktree left behind is cleaned by the reset below.

---

## 2. Clean the repository

```bash
./scripts/reset.sh          # asks before each destructive step
./scripts/reset.sh --yes    # no questions, for between demo runs
```

In order, it:

1. stops any agent still running
2. closes every **open pull request** on a branch starting with `autopilot/`, deleting the branch
3. closes every **open issue** labelled `autopilot`
4. deletes remaining `autopilot/*` branches, remote and local
5. prunes stale git worktrees and deletes `.autopilot/` (the agent event log)

**Merged pull requests are left alone** — they are real history and part of your demo story.

Verify:

```bash
gh pr list --state open
gh issue list --state open --label autopilot
git branch -a | grep autopilot     # expect nothing
```

> **Do not use `git clean -fdx` to tidy up.** It deletes `node_modules`, `.autopilot/`,
> and any file not yet committed. That is what wiped this runbook the first time.

---

## 3. The 5-issue cap

`src/agents/reporter.ts` refuses to file when **5 `autopilot` issues are already open**:

```
[reporter] capped — 5/5 autopilot issues already open — holding
```

This is back-pressure on the whole loop, not a mute button on agent 1. As the solver
drains the backlog and you accept pull requests, room frees up and the reporter files
again. Queue depth stays roughly constant, which is also what keeps the Developer view
readable while you are pitching.

Change it per run, no code edit:

```bash
MAX_OPEN_ISSUES=3 npm run autopilot:fast    # calmer
MAX_OPEN_ISSUES=8 npm run autopilot         # busier
```

---

## 4. Start it again

```bash
cd ~/Documents/microsoft_mikrohack/demo-agents
git checkout main && git pull
npm install          # required after any clean; safe to run always
npm test             # must be green before you demo
npm run autopilot:fast
```

Open <http://localhost:3000> → **Developer view**.

Expected in the first two minutes:

| ~time | What you see |
|---|---|
| 0:00 | `[reporter] start`, `[triage] start`, `[solver] start` |
| 0:05 | `[reporter] filed` — a new issue appears as `queued` |
| 0:25 | `[triage] ranked` — a `score:` badge appears; labels are on github.com too |
| 0:40 | `[solver] picked` → `patched` → `verified` |
| 0:55 | `[solver] proposed` — the row flips to `proposed` with **Accept · ship it** |

Click **Accept · ship it** → the row turns green, `accepted`, merged into `main`.

### Pacing

| Command | New issue every | Use for |
|---|---|---|
| `npm run autopilot` | 1–5 min | realistic, running all afternoon |
| `npm run autopilot:fast` | 45–90 s | the pitch |

**Start `autopilot:fast` at least 4 minutes before you present**, so the backlog is
populated and a pull request is already waiting when you switch to the tab.

### If something looks wrong

| Symptom | Cause | Fix |
|---|---|---|
| Backlog tab empty | reporter has not filed yet, or `gh` not authenticated | `gh auth status`, watch the `[reporter]` lines |
| `[reporter] capped` immediately | issues still open from the last run | `./scripts/reset.sh --yes` |
| `[solver] idle` forever | every catalog item is filed or already solved | reset, or add entries to `src/agents/catalog.ts` |
| `[solver] blocked — anchor not found` | `src/scoring.ts` was edited by hand | correct behaviour — that item needs a human |
| `worktree add` fails | stale worktree from a killed run | `git worktree prune` |
| Accept does nothing | branch protection is waiting on CI | wait for green, click again |
| `Cannot find module` anything | `node_modules` was cleaned | `npm install` |

---

## 5. The full demo cycle

```bash
./scripts/reset.sh --yes        # clean slate
npm run autopilot:fast          # let it run ~4 minutes
# ... pitch ...
# Ctrl-C
./scripts/reset.sh --yes        # ready for the next run
```
