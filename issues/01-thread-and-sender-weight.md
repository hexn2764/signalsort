# Add sender importance and thread-reply weight to scoring

## Context
Read `AGENTS.md` first. Scoring lives in `src/scoring.ts` and must stay pure
(no I/O, `now` is passed in).

## Task
Extend `scoreMessage` with two new rules:
1. `senderWeight` — accept an optional `vipSenders: string[]` argument on
   `scoreMessage` and `triage`. A message from a VIP sender gets +25 with
   detail `"from a VIP sender"`.
2. `threadReply` — add an optional `isReplyToMe: boolean` field to `Message`.
   When true, +15, detail `"reply in a thread you started"`.

Both must appear in `reasons` and be reflected in `summary`.

## Acceptance criteria
- [ ] New tests in `src/scoring.test.ts` cover: VIP hit, VIP miss, reply true/false
- [ ] Existing tests still pass unchanged
- [ ] `vipSenders` defaults to `[]` so existing call sites keep working
- [ ] `npm test` and `npm run typecheck` are green

## Out of scope
UI, server, data. Do not touch other files.
