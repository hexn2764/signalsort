# Import a custom inbox from pasted text

## Context
Read `AGENTS.md` first.

## Task
Create `src/import.ts` exporting `parseInbox(raw: string): Message[]`.
Input format — one message per block, blocks separated by a blank line:

```
from: anna@contoso.com
subject: Can you approve the budget today?
channel: email
to-me: yes
---
Kirill, finance needs your sign-off before EOD.
```

Rules: unknown keys are ignored; missing `channel` defaults to `email`;
missing `to-me` defaults to `no`; `receivedAt` defaults to "now" passed in as
a parameter; `id` is the 1-based block index as a string.
Malformed blocks are skipped, not thrown on.

## Acceptance criteria
- [ ] `src/import.test.ts` covers: happy path, missing optional fields,
      malformed block skipped, empty input returns `[]`
- [ ] Pure function, no I/O
- [ ] `npm test` and `npm run typecheck` green

## Out of scope
Wiring it into the server or UI — that is issue 04.
