# The 3-minute pitch

Three minutes is roughly **380 spoken words**. Everything below fits. Rehearse it three
times with a timer before 17:00 — the third run is the one that sounds calm.

---

## Setup before you walk up

- App running: `npm run autopilot:fast` — start it **at least 4 minutes before** you pitch,
  so the backlog already has items and at least one pull request is waiting.
- Browser tab 1: <http://localhost:3000> on the **Inbox** tab.
- Browser tab 2: your GitHub repo, **Issues** view, labels visible.
- Browser tab 3: the backup demo recording, in case the network dies.
- Terminal visible somewhere on screen — the colour-coded agent log is free credibility.

---

## The script

### 0:00–0:25 · The problem, with a person in it

> "Every team has a backlog nobody reads. Issues arrive faster than anyone triages them,
> and the priority order lives in one person's head.
>
> Coding agents fixed the writing. They did not fix the choosing. So we all built the same
> new bottleneck: one human, sitting between an infinite backlog and a fleet of agents that
> are ready to work right now."

### 0:25–1:00 · The product, in one click

Switch to the Inbox tab. Click **Triage**.

> "This is SignalSort. A noisy inbox, ranked by what actually needs you — and every item
> tells you *why* it is there. Not a black box: a score you can open and audit."

Open one score breakdown. Do not explain the rules; let the screen do it.

### 1:00–2:05 · Turn it on ourselves — the live part

Switch to the **Developer view** tab.

> "Then we asked: why is our own backlog worse than our users' inbox? So we pointed the
> same idea at our own repository.
>
> Three agents are running right now. The first files real issues — that is reality:
> users, monitoring, support. The second scores every issue on severity and interest,
> and writes the score back onto the GitHub issue as a label, so anyone can audit the
> ranking without running our code.
>
> The third one takes the top-scored issue, gives itself an isolated git worktree, writes
> the fix, **writes a test for the fix, and runs the whole suite itself.** If the suite is
> red, it opens nothing. No human is ever asked to review work the agent could not verify."

Switch to the GitHub tab for three seconds. Real issues, real `score:` labels, a real PR.

> "These are real GitHub issues, in a real repository, with real pull requests."

### 2:05–2:35 · The human moment

Back to the Developer view. Point at a `proposed` item.

> "And here is the part we care about most. The agent does not merge. It proposes.
>
> A human sees the score, the reasoning, the diff, the green tests — and makes one
> decision."

Click **Accept · ship it**. Let the row flip to `accepted`.

> "That just squash-merged into main. CI had already passed. Agents propose, humans dispose."

### 2:35–3:00 · Why it is new, and close

> "GitHub already gives an issue to an agent. What is missing is everything *before* that:
> who decides which issue deserves an agent, on what evidence, and where a human says yes.
>
> That is what we built. A self-driving backlog with a human veto.
>
> SignalSort. It ranks your inbox — and it ships its own backlog."

---

## Delivery notes

- **Do not show code.** Show the two tabs, the GitHub tab, and the terminal.
- **Do not explain the scoring formula** unless asked. "Severity and interest, weighted,
  and you can read it on the issue" is enough.
- If a new issue appears live during the pitch: **stop and point at it.** That moment is
  worth more than any sentence in this script.
- If something breaks: switch to the recording, keep talking, do not apologise twice.

---

## The process slide (Julien's scoring rubric)

Have this open in a fourth tab. He asked for exactly this, and most teams will not have it.

- Every change went through one issue → one branch → one small pull request
- CI ran build + unit tests on every PR; nothing reached `main` red
- `AGENTS.md` defined the house rules once; no prompt re-explained the project
- Agents ran in isolated git worktrees, one per task
- The solver's blast radius is bounded on purpose — that is why it can run unattended
- Human review was never skipped, only made cheap

---

## One-line answers to likely questions

| Question | Answer |
|---|---|
| Is the agent really writing code? | Real branch, real diff, real test, real CI, real PR. What is bounded is *where* it may write. |
| Why a linear model, not an LLM? | Because a priority order nobody can audit is not a priority order. |
| What if it proposes something wrong? | Bounded scope, its own test run, CI, then a human. Four gates. |
| How would you scale it? | Replace one function — the patch generator — with a model call. Everything downstream is unchanged. |
| What did it cost to run? | Nothing. No API keys, no hosting, no services. The `gh` CLI and a laptop. |
