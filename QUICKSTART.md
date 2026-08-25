# Land this in 5 minutes

From the repo root (`demo-agents/`), with the new files already in place:

```bash
# 1. one-time: close the old scaffold issues so the Developer view starts clean
for n in 1 2 3 4 5 6; do gh issue close $n -r "not planned" -c "superseded by Backlog Autopilot"; done

# 2. verify locally
npm test
npm run typecheck

# 3. ship it through the loop (main is protected, so: branch → PR → merge)
git checkout main && git pull
git checkout -b feat/backlog-autopilot
git add -A
git commit -m "feat: backlog autopilot — reporter, triage and solver agents + developer view"
git push -u origin feat/backlog-autopilot
gh pr create --fill --title "feat: Backlog Autopilot"
gh pr checks          # wait for green
gh pr merge --squash --delete-branch
git checkout main && git pull

# 4. run the whole thing
npm run autopilot:fast
```

Open http://localhost:3000 → **Developer view**.

Within ~90 seconds you should see: an issue filed by the reporter, `score:` labels
appearing on it, and a pull request opening once the solver's tests pass.

## If something misbehaves

| Symptom | Cause | Fix |
|---|---|---|
| `gh: command not found` in the agent log | `gh` not on PATH for the spawned process | run `gh auth status` in the same terminal first |
| Solver says `anchor for <id> not found` | someone edited `src/scoring.ts` by hand | that item needs a human — it is doing the right thing |
| `worktree add` fails | a stale worktree from a killed run | `git worktree prune` |
| PR opens but CI is red | the appended test disagrees with a merged change | close the PR, fix the catalog entry, restart the solver |
| Backlog tab empty | reporter has not filed yet, or `gh` is not authenticated | check the terminal log for `[reporter]` lines |

## Demo pacing knobs

```bash
REPORT_MIN_MS=45000 REPORT_MAX_MS=90000 \
TRIAGE_INTERVAL_MS=20000 SOLVE_INTERVAL_MS=20000 npm run autopilot
```
