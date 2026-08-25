# AGENTS.md — House rules

> Every agent reads this file FIRST. Do not re-explain the project in prompts.

## What we are building

**SignalSort** — ranking that explains itself, applied twice.

1. **Inbox tab** — the product. A noisy stream of messages is ranked by "does this
   need me now", with a visible reason for every item.
2. **Developer view tab** — the same idea turned on our own backlog.
   Three agents keep the repository moving; a human accepts or rejects.

Demo story (this is what the judges see):
1. Inbox tab: messy inbox → click **Triage** → ordered list, each with a reason.
2. Developer view: real GitHub issues, ranked by score, agents working live.
3. A pull request appears with a proposed fix and a green test suite.
4. Human clicks **Accept · ship it** → merged to `main`.

## Stack

- Node 20+, TypeScript, ESM (`"type": "module"`)
- No web framework — plain `node:http` in `src/server.ts`
- Frontend: one static file, `src/public/index.html`, vanilla JS, no build step
- Tests: `vitest`
- GitHub access: the **`gh` CLI only**, wrapped in `src/agents/gh.ts`.
  No API tokens, no SDKs, no hosted services, no paid infrastructure.
- No database. Issues and pull requests on GitHub *are* the state.

## Commands (the only ones that matter)

```bash
npm run dev        # app on http://localhost:3000
npm test           # unit tests
npm run autopilot  # app + all three agents, one terminal
```

All three must stay working. If you change how any of them starts,
update this file and the README in the same pull request.

## Conventions

- TypeScript, strict mode. No `any` unless justified in a comment.
- Pure functions in `src/scoring.ts` and `src/agents/issue-scoring.ts` —
  no I/O, no network, no clock read inside (pass `now` in as a parameter).
- Every exported function gets at least one test in `*.test.ts` next to it.
- Anything that talks to GitHub goes through `src/agents/gh.ts`. Nowhere else.
- File names: `kebab-case.ts`. Exported types: `PascalCase`.
- Keep functions under ~40 lines. Split instead of nesting.
- No new dependencies. The project has four devDependencies and that is the budget.

## Rules of engagement

- One issue → one branch → one small pull request. Branch: `feat/<issue-number>-<slug>`
  for humans, `autopilot/<catalog-id>` for the solver agent.
- **Max ~200 changed lines per PR.** If it grows bigger, stop and split it.
- Run `npm test` and make it green BEFORE opening the pull request.
- Never push to `main`. Never merge your own PR.
- Do not touch files outside the scope described in the issue.
- If the issue is ambiguous, state your assumption at the top of the PR
  description and continue — do not redesign the architecture.

## The solver agent's boundary

`src/agents/solver.ts` may only change **scoring rules** in `src/scoring.ts`,
plus append a test to `src/scoring.test.ts`. That boundary is what makes an
unattended agent safe to run. Widening it is a human decision, not an agent one.

## Definition of done

- [ ] `npm test` green
- [ ] `npm run dev` still starts and both tabs still work
- [ ] PR description: what changed, which issue, how to verify in 30 seconds
