# Runbook — stop, clean, restart

Everything the autopilot does is a real GitHub object, so "cleaning up" means closing
issues and pull requests, not deleting a database. Nothing here touches `main`, and
nothing here touches anything a human opened.

---

## 1. Stop it

**In the terminal running `npm run autopilot`: press `Ctrl-C` once.**
That kills the server and all three agents together.

If you started them in separate terminals, `Ctrl-C` in each. If a process got orphaned:

```bash
pkill -f "src/agents"
pkill -f "scripts/autopilot.mjs"
pkill -f "tsx src/server.ts"
```

Check nothing survived:

```bash
ps aux | grep -c "[s]rc/agents"     # expect 0
lsof -ti:3000                        # expect no output
```

Stopping mid-flight is safe. The solver either opened a pull request or it did not;
there is no half-written state. A worktree left behind is cleaned by the reset below.

---

## 2. Clean the repository

```bash
./scripts/reset.sh          # asks before each destructive step
./scripts/reset.sh --yes    # no questions, for between demo runs
```

It does exactly this, in order:

1. stops any agent still running
2. closes every **open pull request** whose branch starts with `autopilot/`, deleting the branch
3. closes every **open issue** labelled `autopilot`
4. deletes remaining `autopilot/*` branches, remote and local
5. prunes stale git worktrees and deletes `.autopilot/` (the agent event log)

**Merged pull requests are left alone** — they are real history and part of your demo story.
Human branches and human issues are untouched.

Verify:

```bash
gh pr list --state open
gh issue list --state open
git branch -a | grep autopilot   # expect nothing
```

---

## 3. The 5-issue cap

`src/agents/reporter.ts` now refuses to file when there are already **5 open
`autopilot` issues**. In the log you will see:

```
[reporter] capped — 5/5 autopilot issues already open — holding
```

This is back-pressure on the *whole loop*, not just a mute button on agent 1: as the
solver drains the backlog and you accept pull requests, room frees up and the reporter
starts filing again. The queue depth stays constant, which is also what makes the
Developer view readable during a pitch.

Change it per-run without editing code:

```bash
MAX_OPEN_ISSUES=3 npm run autopilot:fast    # tighter, calmer demo
MAX_OPEN_ISSUES=8 npm run autopilot         # busier backlog
```

---

## 4. Start it again

```bash
cd ~/Documents/microsoft_mikrohack/demo-agents
git checkout main && git pull
npm install                    # only needed after a pull that changed package.json
npm test                       # must be green before you demo
npm run autopilot:fast
```

Open <http://localhost:3000> → **Developer view**.

Expected in the first ~2 minutes:

| ~time | What you see |
|---|---|
| 0:00 | `[reporter] start`, `[triage] start`, `[solver] start` |
| 0:05 | `[reporter] filed` — a new issue appears in the Developer view as `queued` |
| 0:25 | `[triage] ranked` — a `score:` badge appears; check the labels on github.com |
| 0:40 | `[solver] picked` → `patched` → `verified` |
| 0:55 | `[solver] proposed` — the row flips to `proposed` with a **Accept · ship it** button |

Then click **Accept · ship it** and the row goes green, `accepted`, merged to `main`.

### Pacing

| Command | New issue every | Use for |
|---|---|---|
| `npm run autopilot` | 1–5 min | realistic, all-afternoon running |
| `npm run autopilot:fast` | 45–90 s | the pitch |

**Start `autopilot:fast` at least 4 minutes before you present**, so the backlog is
already populated and at least one pull request is waiting when you switch to the tab.

### If something looks wrong

| Symptom | Cause | Fix |
|---|---|---|
| Backlog tab empty | reporter has not filed yet, or `gh` not authenticated | `gh auth status`, then check the `[reporter]` lines |
| `[reporter] capped` immediately | 5 issues already open from the last run | `./scripts/reset.sh --yes` |
| `[solver] idle` forever | every catalog item is filed or already solved | reset, or add entries to `src/agents/catalog.ts` |
| `[solver] blocked — anchor not found` | `src/scoring.ts` was edited by hand | correct behaviour: that item needs a human |
| `worktree add` fails | stale worktree from a killed run | `git worktree prune` |
| Accept button does nothing | branch protection needs a passing check | wait for CI green, then click again |

---

## 5. The full demo cycle, start to finish

```bash
./scripts/reset.sh --yes        # clean slate
npm run autopilot:fast          # let it run ~4 minutes
# ... pitch ...
# Ctrl-C
./scripts/reset.sh --yes        # ready for the next run
```
