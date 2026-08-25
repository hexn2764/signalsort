# Ready-made issues

Copy each file's content into a GitHub Issue (title = the `#` heading).
Then hand ONE issue to ONE agent. Never two agents on the same file.

Independence map (who can run in parallel):

| Issue | Touches | Safe in parallel with |
|---|---|---|
| 01 | `src/scoring.ts`, `src/scoring.test.ts` | 02, 03, 05 |
| 02 | `src/public/index.html` | 01, 03, 04 |
| 03 | `src/data.ts` + new `src/import.ts` | 01, 02, 05 |
| 04 | `src/server.ts` | 01, 03, 05 |
| 05 | new `src/explain.ts` | 01, 02, 04 |
| 06 | `.github/workflows/ci.yml` | everything |
