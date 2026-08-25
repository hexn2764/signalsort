# AGENTS.md — House rules

> Every agent reads this file FIRST. Do not re-explain the project in prompts.

## What we are building

**SignalSort** — a triage service that takes a list of incoming messages
(emails / chat posts / feed items) and returns them ranked by "act on this now"
score, with a human-readable reason for every item.

Demo story (this is what the judges see):
1. User opens the page and sees a messy inbox of 20 items.
2. User clicks **Triage**.
3. The list re-orders: top items are the ones that actually need action, each
   with a one-line explanation ("mentions you + asks a question + deadline today").
4. User clicks an item, sees the score breakdown.

## Stack

- Node 20+, TypeScript, ESM (`"type": "module"`)
- No web framework — plain `node:http` in `src/server.ts`
- Frontend: one static file, `src/public/index.html`, vanilla JS, no build step
- Tests: `vitest`
- No database. Sample data lives in `src/data.ts`.

## Commands (the only two that matter)

```bash
npm run dev     # start the app on http://localhost:3000
npm test        # run all unit tests once
```

Both must stay working. If you change how the app starts or tests run,
update this file and the README in the same pull request.

## Conventions

- TypeScript, strict mode. No `any` unless justified in a comment.
- Pure functions in `src/scoring.ts` — no I/O, no `fetch`, no `Date.now()`
  read directly (pass `now` in as a parameter so tests are deterministic).
- Every exported function gets at least one test in `*.test.ts` next to it.
- File names: `kebab-case.ts`. Exported types: `PascalCase`.
- Keep functions under ~40 lines. Split instead of nesting.
- No new dependencies without asking the human first.

## Rules of engagement

- One issue → one branch → one small pull request. Branch name: `feat/<issue-number>-<slug>`.
- **Max ~200 changed lines per PR.** If it grows bigger, stop and split it.
- Run `npm test` and make it green BEFORE opening the pull request.
- Never push to `main`. Never merge your own PR.
- Do not touch files outside the scope described in the issue.
- If the issue is ambiguous, state your assumption at the top of the PR
  description and continue — do not redesign the architecture.

## Definition of done

- [ ] `npm test` green
- [ ] `npm run dev` still starts and the demo story still works end to end
- [ ] PR description: what changed, which issue, how to verify in 30 seconds
