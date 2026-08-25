# Harden CI: run typecheck, tests, and fail on unused exports

## Context
Read `AGENTS.md` first. CI is `.github/workflows/ci.yml`.

## Task
- Keep `npm ci`, `npm run typecheck`, `npm test`.
- Add a job step that fails if `npm test` reports zero tests.
- Cache node_modules properly so CI finishes under 60 seconds.
- Add a CI status badge to the top of `README.md`.

## Acceptance criteria
- [ ] A pull request shows a green CI check
- [ ] Badge renders in the README
- [ ] No new dependencies

## Out of scope
Deployment.
