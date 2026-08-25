# Backlog Autopilot — how it works

Read this once as a team. Ten minutes, and everyone can answer any question a judge asks.

---

## 1. The one-sentence version

> GitHub can already give an issue to an agent. **We removed the last human bottleneck
> before that: deciding which issue deserves an agent at all** — and we put the human
> back where they matter, at the accept/reject decision.

---

## 2. The problem we picked

Every real backlog has the same shape: more items than anyone reads, filed faster than
anyone triages, and a priority order that exists mainly in someone's head. Coding agents
made the *writing* part cheap. They did not make the *choosing* part cheap. So teams now
have a new bottleneck — a human sitting between an infinite backlog and a fleet of agents
that are ready to work.

Julien's playbook says: one issue → one agent session → one small pull request.
That is exactly right, and it still assumes a human picks the issue. **We automate the pick.**

Note the symmetry that makes this project one idea instead of two: the product ranks a
noisy *inbox* so a human sees what matters. The autopilot ranks a noisy *backlog* so an
agent works on what matters. Same model, same explanation-first design, two surfaces.

---

## 3. The three agents

They run as three independent processes. They never call each other. They coordinate
purely through GitHub — issues and pull requests are the shared state, which means you
can kill any one of them mid-demo and the other two keep working.

### Agent 1 — Reporter (`src/agents/reporter.ts`)

Stands in for reality: users, monitoring, support, teammates. Every **1–5 minutes** it
files one real GitHub issue with a realistic title and body, tagged `autopilot`.

*Why it exists:* a backlog that does not grow proves nothing. The judges need to see a
new issue arrive during the pitch and get handled without anyone touching a keyboard.

### Agent 2 — Triage (`src/agents/triage.ts`)

Reads every open issue and scores it with a deliberately simple linear model:

```
score = 12 × severity + 8 × interest − 4 × effort        (clamped to 0..100)
```

`severity`, `interest`, `effort` are each estimated 1–5 from the issue text by keyword
rules — pure functions in `src/agents/issue-scoring.ts`, fully unit tested.

It then writes the verdict **back onto the real GitHub issue** as labels:
`score:84`, `sev:4`, `int:5`.

*Why linear and not an LLM:* a human can audit it. Open github.com, read the labels, and
you can reconstruct the decision without running our code. A model that ranks your work
must be able to explain itself; that is the same thesis as the Inbox tab.

### Agent 3 — Solver (`src/agents/solver.ts`)

Takes the highest-scored unclaimed issue and:

1. creates its **own git worktree** — isolated checkout, own branch `autopilot/<id>`
2. applies the bounded change to `src/scoring.ts`
3. **writes a regression test** for that change into `src/scoring.test.ts`
4. runs the entire suite itself
5. **if the suite is red, it stops and opens nothing**
6. if green: commits, pushes, opens a real pull request that says `Closes #N`

Point 5 is the part to say out loud in the pitch. The agent never asks a human to review
work it could not verify itself.

---

## 4. The human decision

The Developer view tab is the cockpit. For every backlog item you see the score, the
severity/interest/effort breakdown, the reason text, and — once the solver is done —
the pull request.

Two buttons:

- **Accept · ship it** → merges the PR into `main` (squash, branch deleted). CI has
  already run. With CD wired, this is a production deploy.
- **I'll do it myself** → closes the PR, hands the issue back to a human.

That is the whole product thesis in one screen: *agents propose, humans dispose.*

---

## 5. What is new here

GitHub today gives you: issues, agents you can assign to an issue, pull requests, CI.
What it does not give you:

| Missing today | What we added |
|---|---|
| An automatic, auditable priority order for the backlog | Linear scoring written back as GitHub labels |
| Automatic dispatch of the top item to a coding agent | The solver picks by score, no human in the loop |
| One screen showing *proposed work* awaiting a human verdict | The Developer view accept/dismiss cockpit |
| A hard guarantee that an agent verified its own work | Red suite → no pull request, structurally |

Call it what it is: **a self-driving backlog with a human veto.**

---

## 6. Why the solver's solution space is bounded

The solver may only change scoring rules — a keyword list or a weight constant — plus
append a test. It cannot touch the server, the UI, or the agents themselves.

This is a design decision, not a shortcut, and it is worth defending directly:
**an unattended agent is exactly as safe as the blast radius you give it.** We chose a
space small enough that "the tests are green" is a real guarantee rather than a hope.
Widening that space is a human decision.

If a judge asks "so it is not really writing code?" — it is. Real branch, real diff, real
test, real CI, real PR. What is constrained is *where* it may write, and that constraint
is the reason you can leave it running.

Swapping in an LLM is one function: replace `entry.patch` in `src/agents/catalog.ts` with
a model call that returns a diff. Everything downstream — the worktree, the self-test
gate, the PR, the human veto — is unchanged. That is the honest roadmap answer.

---

## 7. Running it

```bash
npm install
npm run autopilot        # realistic: one new issue every 1–5 minutes
npm run autopilot:fast   # demo pacing: every 45–90 seconds
```

Then open <http://localhost:3000> → **Developer view**.

One terminal shows all four processes colour-coded by agent, so an audience can watch
the reporter file, the triage rank, and the solver verify — live.

Stop everything with Ctrl-C.

Individually, if you prefer four terminals:

```bash
npm run dev
npm run agent:reporter
npm run agent:triage
npm run agent:solver
```

---

## 8. Where everything lives

```
src/scoring.ts             product: message ranking (pure, tested)
src/agents/issue-scoring.ts autopilot: issue ranking (pure, tested)
src/agents/gh.ts           the ONLY place that talks to GitHub, via the gh CLI
src/agents/catalog.ts      backlog items + their bounded fixes
src/agents/reporter.ts     agent 1
src/agents/triage.ts       agent 2
src/agents/solver.ts       agent 3 — worktree, patch, self-test, PR
src/server.ts              /api/triage /api/backlog /api/events /api/accept /api/dismiss
src/public/index.html      both tabs, one file, no build step
scripts/autopilot.mjs      one command that runs all of it
```

---

## 9. Answers to the questions you will get

**"Is this just a cron job?"**
The reporter is scheduled. Triage and the solver are not — they react to whatever state
GitHub is in. Kill the reporter and the other two still drain the backlog.

**"What if the agent writes something wrong?"**
Three gates: the bounded solution space, the agent's own test run, and CI on the PR.
Then a human. Nothing reaches `main` without all four.

**"Why not let an LLM do the ranking?"**
Then nobody can audit the priority order. The whole product is about ranking that
explains itself; using an unexplainable ranker for our own backlog would contradict it.

**"Does it scale past your catalog?"**
The catalog is the demo's source of realistic issues. The scoring, dispatch, worktree
isolation, self-verification and human-veto loop are generic — they do not know or care
where an issue came from.

**"What is genuinely new versus GitHub Copilot's coding agent?"**
Copilot answers *how do I fix this issue*. We answer *which issue should be fixed next,
why that one, and did the fix verify itself before it reached me* — plus the one screen
where a human says yes or no.
