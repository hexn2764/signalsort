# Add POST /api/triage so the UI can send its own messages

## Context
Read `AGENTS.md` first. Server is `src/server.ts`, plain `node:http`.

## Task
- Keep `GET /api/triage` working exactly as today (demo inbox).
- Add `POST /api/triage`: body is JSON `{ "messages": Message[] }`,
  responds with the same `ScoredMessage[]` shape.
- Bad JSON → 400 with `{ "error": "..." }`. Body over 100 KB → 413.
- Serve `src/public/*` static files generally, not just `index.html`,
  with correct content-types for `.html`, `.css`, `.js`.

## Acceptance criteria
- [ ] `curl -X POST localhost:3000/api/triage -d '{"messages":[]}'` returns `[]`
- [ ] Malformed body returns 400, not a crash
- [ ] `npm test` green; add a test for the request handler if you can do it
      without starting a real server, otherwise document how you verified
- [ ] `npm run dev` still serves the page

## Out of scope
Scoring rules, UI markup.
