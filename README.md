# SignalSort

Ranking that explains itself — applied twice.

- **Inbox tab** — the product. A noisy message stream, ranked by "does this need me now",
  with a visible reason and score breakdown for every item.
- **Developer view tab** — the same idea turned on our own backlog. Three agents file,
  rank, and solve real GitHub issues; a human accepts or rejects.

## Run it

```bash
npm install
npm run dev              # app only            → http://localhost:3000
npm run autopilot        # app + all 3 agents  (a new issue every 1–5 min)
npm run autopilot:fast   # demo pacing         (a new issue every 45–90 s)
npm test                 # unit tests
```

Requires the [`gh` CLI](https://cli.github.com) authenticated against this repository.
No API keys, no hosted services, nothing to pay for.

## The loop

```
reporter ──files──▶ GitHub Issue
                        │
triage   ──scores──▶ score:84  sev:4  int:5        (labels on the real issue)
                        │
solver   ──▶ own git worktree ──▶ patch + test ──▶ npm test
                        │                              │
                     red ┘                          green
                   no PR opened                        ▼
                                                Pull Request  "Closes #N"
                                                       │
                                    Developer view ──▶ human: Accept │ Dismiss
                                                       │
                                              squash-merge to main
```

## Docs

- [RUNBOOK.md](RUNBOOK.md) — stop it, clean the repo, start it again
- [docs/AUTOPILOT.md](docs/AUTOPILOT.md) — how it works, and the answers to the
  questions you will be asked
- [docs/PITCH.md](docs/PITCH.md) — the 3-minute pitch script
- [AGENTS.md](AGENTS.md) — house rules every agent reads first

## Layout

```
src/scoring.ts               product ranking (pure, tested)
src/agents/issue-scoring.ts  backlog ranking (pure, tested)
src/agents/gh.ts             the only code that talks to GitHub
src/agents/catalog.ts        backlog items and their bounded fixes
src/agents/{reporter,triage,solver}.ts
src/server.ts                /api/triage /api/backlog /api/events /api/accept /api/dismiss
src/public/index.html        both tabs, one file, no build step
scripts/autopilot.mjs        one command that runs all of it
```
