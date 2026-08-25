# Group triaged items into Now / Today / Later sections with a filter

## Context
Read `AGENTS.md` first. UI is one file: `src/public/index.html`, vanilla JS,
no build step, no dependencies, no CDN links.

## Task
- Render three labelled sections: **Now**, **Today**, **Later**, each with a count.
- Add three toggle chips at the top to show/hide each bucket.
- Empty bucket renders a muted "nothing here" line instead of disappearing.
- Keep the existing score breakdown `<details>` on each item.
- Keep the light/dark CSS variables that already exist.

## Acceptance criteria
- [ ] `npm run dev`, click "Triage inbox", three sections appear with correct counts
- [ ] Toggling a chip hides/shows only that bucket
- [ ] No new dependencies, no external requests
- [ ] `npm test` still green

## Out of scope
Scoring rules, server routes, data.
