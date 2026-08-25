# SignalSort

Triage a noisy inbox: rank messages by "does this need me right now", and show why.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests
```

That is the whole contract. Agents read [AGENTS.md](./AGENTS.md) before touching anything.

## How it fits together

```
src/types.ts     shared types
src/scoring.ts   pure scoring rules  <- the part that is unit tested
src/data.ts      demo inbox
src/server.ts    node:http server, serves / and /api/triage
src/public/      single-page UI, no build step
```

## Delivery loop

issue → branch (`feat/<n>-<slug>`) → small PR → CI green → review → merge → main stays demo-ready.
