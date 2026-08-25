/**
 * The catalog is the agents' shared vocabulary.
 *
 * Each entry is one realistic backlog item AND the bounded change that fixes it.
 * Bounding the solution space is a deliberate design choice: the solver agent may
 * only touch scoring rules in `src/scoring.ts` plus its test file, which is why we
 * can let it open pull requests unattended and still trust the result.
 *
 * Swapping `patch` for an LLM call is a one-function change — see docs/AUTOPILOT.md.
 */

export type Patch = {
  /** Exact string to find in src/scoring.ts. */
  find: string;
  /** What it becomes. */
  replace: string;
  /** Marker that proves the patch is already applied — used to skip duplicates. */
  applied: string;
};

export type CatalogEntry = {
  id: string;
  title: string;
  body: string;
  labels: string[];
  patch: Patch;
  /** Test appended to src/scoring.test.ts so the change is verified, not just made. */
  test: string;
  /** Plain-language proposal shown in the Developer view before you accept. */
  proposal: string;
};

export const CATALOG: CatalogEntry[] = [
  {
    id: "escalation-keyword",
    title: "Escalation emails are not treated as urgent",
    body:
      "Support forwards a thread with the word 'escalation' and it lands in Later.\n\n" +
      "This produces a wrong result for most users on the daily path. The keyword list is missing the term.",
    labels: ["autopilot", "bug"],
    patch: {
      find: 'const URGENT_WORDS = [',
      replace: 'const URGENT_WORDS = ["escalation", ',
      applied: '"escalation"',
    },
    test: `
describe("autopilot: escalation keyword", () => {
  it("treats an escalation as urgent", () => {
    const result = scoreMessage(msg({ subject: "Escalation from the support team" }), NOW);
    expect(result.reasons.some((r) => r.rule === "urgency")).toBe(true);
  });
});
`,
    proposal: 'Add "escalation" to the urgency keyword list, plus a test that proves it now scores as urgent.',
  },
  {
    id: "invite-noise",
    title: "Calendar invites clutter the Now bucket",
    body:
      "Automatic calendar invites show up above real questions. This is noisy and confusing for every user.\n\n" +
      "They should be treated like other automated mail. One keyword in the noise list.",
    labels: ["autopilot", "bug"],
    patch: {
      find: 'const NOISE_WORDS = [',
      replace: 'const NOISE_WORDS = ["invite", ',
      applied: '"invite"',
    },
    test: `
describe("autopilot: calendar invite noise", () => {
  it("demotes calendar invites", () => {
    const result = scoreMessage(msg({ subject: "Invite: sprint planning" }), NOW);
    expect(result.reasons.some((r) => r.rule === "noise")).toBe(true);
  });
});
`,
    proposal: 'Add "invite" to the noise keyword list so calendar spam drops out of the Now bucket.',
  },
  {
    id: "feed-penalty",
    title: "Feed items still outrank direct chats",
    body:
      "A post in #random can beat a direct question from a colleague. That is incorrect for most users " +
      "and it is the first thing anyone notices in the demo.\n\nThe channel weight constant is too small.",
    labels: ["autopilot", "bug"],
    patch: {
      find: 'rule: "channel", points: -10',
      replace: 'rule: "channel", points: -20',
      applied: 'rule: "channel", points: -20',
    },
    test: `
describe("autopilot: feed penalty", () => {
  it("keeps a direct question above a feed post", () => {
    const direct = scoreMessage(msg({ id: "d", directlyAddressed: true, subject: "can you check?" }), NOW);
    const feed = scoreMessage(msg({ id: "f", channel: "feed", subject: "look at this" }), NOW);
    expect(direct.score).toBeGreaterThan(feed.score);
  });
});
`,
    proposal: "Increase the feed channel penalty from -10 to -20, with a test asserting direct messages win.",
  },
  {
    id: "stale-window",
    title: "Two-day-old messages are still ranked as fresh",
    body:
      "The stale threshold is 48 hours, which is too generous — yesterday's mail outranks this morning's. " +
      "Wrong for daily users. Change the threshold constant to 24.",
    labels: ["autopilot", "enhancement"],
    patch: {
      find: "} else if (ageHours > 48) {",
      replace: "} else if (ageHours > 24) {",
      applied: "ageHours > 24",
    },
    test: `
describe("autopilot: stale window", () => {
  it("marks a 30-hour-old message as stale", () => {
    const old = new Date(NOW.getTime() - 30 * 3_600_000).toISOString();
    const result = scoreMessage(msg({ receivedAt: old }), NOW);
    expect(result.reasons.some((r) => r.rule === "stale")).toBe(true);
  });
});
`,
    proposal: "Tighten the stale threshold from 48h to 24h and test a 30-hour-old message.",
  },
  {
    id: "survey-noise",
    title: "Automated survey mails are not filtered",
    body:
      "'How did we do?' survey mails arrive daily and reach the Today bucket. Noisy for every user. " +
      "Add the keyword to the noise list.",
    labels: ["autopilot", "bug"],
    patch: {
      find: 'const NOISE_WORDS = [',
      replace: 'const NOISE_WORDS = ["survey", ',
      applied: '"survey"',
    },
    test: `
describe("autopilot: survey noise", () => {
  it("demotes survey mail", () => {
    const result = scoreMessage(msg({ subject: "Quick survey: how did we do?" }), NOW);
    expect(result.reasons.some((r) => r.rule === "noise")).toBe(true);
  });
});
`,
    proposal: 'Add "survey" to the noise keyword list, with a regression test.',
  },
  {
    id: "question-weight",
    title: "Direct questions are undervalued against urgency words",
    body:
      "A polite question with no deadline loses to a marketing mail shouting 'today'. That is incorrect " +
      "on the happy path judges see. Raise the question weight constant.",
    labels: ["autopilot", "enhancement"],
    patch: {
      find: 'rule: "question", points: 20',
      replace: 'rule: "question", points: 28',
      applied: 'rule: "question", points: 28',
    },
    test: `
describe("autopilot: question weight", () => {
  it("scores a plain question into at least the Today bucket", () => {
    const result = scoreMessage(msg({ subject: "Could you take a look?" }), NOW);
    expect(result.score).toBeGreaterThanOrEqual(28);
  });
});
`,
    proposal: "Raise the question rule from +20 to +28 so real questions outrank shouted marketing.",
  },
  {
    id: "sev1-keyword",
    title: "Incident wording 'sev1' is not recognized as urgent",
    body:
      "On-call pages use 'sev1' rather than 'outage'. Those pages are currently ranked as Later, " +
      "which breaks the person on call. Missing keyword, one-line change.",
    labels: ["autopilot", "bug"],
    patch: {
      find: 'const URGENT_WORDS = [',
      replace: 'const URGENT_WORDS = ["sev1", ',
      applied: '"sev1"',
    },
    test: `
describe("autopilot: sev1 keyword", () => {
  it("treats a sev1 page as urgent", () => {
    const result = scoreMessage(msg({ subject: "sev1 page: checkout latency" }), NOW);
    expect(result.reasons.some((r) => r.rule === "urgency")).toBe(true);
  });
});
`,
    proposal: 'Add "sev1" to the urgency keyword list so on-call pages surface immediately.',
  },
  {
    id: "sale-noise",
    title: "Marketing 'sale' mails clutter the inbox",
    body:
      "Retail mail with the word 'sale' reaches the Today bucket. Cosmetic clutter, narrow impact, " +
      "but a one-line keyword fix.",
    labels: ["autopilot", "enhancement"],
    patch: {
      find: 'const NOISE_WORDS = [',
      replace: 'const NOISE_WORDS = ["sale", ',
      applied: '"sale"',
    },
    test: `
describe("autopilot: sale noise", () => {
  it("demotes marketing sale mail", () => {
    const result = scoreMessage(msg({ subject: "Summer sale ends tonight" }), NOW);
    expect(result.reasons.some((r) => r.rule === "noise")).toBe(true);
  });
});
`,
    proposal: 'Add "sale" to the noise keyword list.',
  },
  {
    id: "fresh-window",
    title: "The two-hour freshness window is too narrow for every user",
    body:
      "Messages that arrived three hours ago get no freshness credit at all, so the morning backlog " +
      "looks flat. This is a wrong result on the daily path. Widen the threshold constant to four hours.",
    labels: ["autopilot", "enhancement"],
    patch: {
      find: "if (ageHours <= 2) {",
      replace: "if (ageHours <= 4) {",
      applied: "ageHours <= 4",
    },
    test: `
describe("autopilot: freshness window", () => {
  it("still credits a three-hour-old message", () => {
    const recent = new Date(NOW.getTime() - 3 * 3_600_000).toISOString();
    const result = scoreMessage(msg({ receivedAt: recent }), NOW);
    expect(result.reasons.some((r) => r.rule === "fresh")).toBe(true);
  });
});
`,
    proposal: "Widen the freshness window from 2h to 4h so the morning backlog still ranks meaningfully.",
  },
];

export function entryById(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.id === id);
}

/** The autopilot marks each issue with its catalog id so the solver knows the bounded fix. */
export const ID_MARKER = "<!-- autopilot-id:";

export function stampId(body: string, id: string): string {
  return `${body}\n\n${ID_MARKER} ${id} -->`;
}

export function readId(body: string): string | undefined {
  const m = body.match(/<!-- autopilot-id:\s*([a-z0-9-]+)\s*-->/i);
  return m?.[1];
}
