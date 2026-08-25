# Turn score reasons into one plain-English sentence

## Context
Read `AGENTS.md` first. Today `summary` is reasons joined with " + ",
which reads like a machine. Judges read this line.

## Task
Create `src/explain.ts` exporting `explain(scored: ScoredMessage): string`.
It returns one natural sentence, max 90 characters, e.g.:
- "Anna asked you a direct question and needs an answer today."
- "Automated newsletter — safe to ignore."
- "Outage alert from the ops bot, nobody is assigned yet."

Deterministic templates only, no LLM call, no network.
Wire it in `scoring.ts` so `summary` uses `explain`.

## Acceptance criteria
- [ ] `src/explain.test.ts` covers each bucket and the noise case
- [ ] Output never exceeds 90 characters (test it)
- [ ] Existing `scoring.test.ts` updated where it asserted the old format
- [ ] `npm test` and `npm run typecheck` green

## Out of scope
UI layout, server.
