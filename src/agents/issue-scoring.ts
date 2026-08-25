/**
 * Backlog Autopilot — issue scoring.
 *
 * Deliberately a SIMPLE LINEAR MODEL. Every input is visible, every weight is a
 * constant you can read, and the output is reproducible. That is the point: a
 * human can audit why the agent picked this issue and not that one.
 *
 *   score = W_SEVERITY * severity + W_INTEREST * interest - W_EFFORT * effort
 *
 * severity / interest / effort are each estimated 1..5 from the issue text by
 * keyword rules. Pure functions, no I/O, no network, no clock.
 */

export type IssueSignals = {
  severity: number; // 1..5 — how much damage if we ignore it
  interest: number; // 1..5 — how much a user or judge would care
  effort: number; // 1..5 — how big the change looks
};

export type ScoredIssue = {
  number: number;
  title: string;
  body: string;
  score: number;
  signals: IssueSignals;
  reasons: string[];
  /** Short one-line description shown in the Developer view. */
  summary: string;
};

export const W_SEVERITY = 12;
export const W_INTEREST = 8;
export const W_EFFORT = 4;

const SEVERITY_RULES: [RegExp, number, string][] = [
  [/\b(crash|data loss|security|leak|broken|breaks|cannot|does not work|fails)\b/i, 5, "breaks a user"],
  [/\b(wrong|incorrect|misranked|ranked too|outranks|inaccurate)\b/i, 4, "produces a wrong result"],
  [/\b(confusing|unclear|hard to|noisy|clutter)\b/i, 3, "hurts the experience"],
  [/\b(nice to have|polish|cosmetic|typo)\b/i, 1, "cosmetic"],
];

const INTEREST_RULES: [RegExp, number, string][] = [
  [/\b(every user|everyone|all users|most users|daily)\b/i, 5, "affects everyone"],
  [/\b(demo|judge|first impression|onboarding)\b/i, 4, "visible on the happy path"],
  [/\b(power user|advanced|edge case|rare)\b/i, 2, "narrow audience"],
];

const EFFORT_RULES: [RegExp, number, string][] = [
  [/\b(rewrite|refactor|migrate|redesign|architecture)\b/i, 5, "large change"],
  [/\b(new (feature|endpoint|screen|tab))\b/i, 4, "new surface"],
  [/\b(constant|threshold|keyword|weight|typo|label)\b/i, 1, "one-line change"],
  [/\b(add|extend|support)\b/i, 2, "additive change"],
];

function firstMatch(
  text: string,
  rules: [RegExp, number, string][],
  fallback: number,
  reasons: string[],
  kind: string,
): number {
  for (const [re, value, why] of rules) {
    if (re.test(text)) {
      reasons.push(`${kind} ${value}/5 — ${why}`);
      return value;
    }
  }
  reasons.push(`${kind} ${fallback}/5 — no strong signal`);
  return fallback;
}

export function extractSignals(title: string, body: string): { signals: IssueSignals; reasons: string[] } {
  const text = `${title}\n${body}`;
  const reasons: string[] = [];
  const severity = firstMatch(text, SEVERITY_RULES, 2, reasons, "severity");
  const interest = firstMatch(text, INTEREST_RULES, 3, reasons, "interest");
  const effort = firstMatch(text, EFFORT_RULES, 3, reasons, "effort");
  return { signals: { severity, interest, effort }, reasons };
}

export function linearScore(signals: IssueSignals): number {
  const raw =
    W_SEVERITY * signals.severity + W_INTEREST * signals.interest - W_EFFORT * signals.effort;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function scoreIssue(number: number, title: string, body: string): ScoredIssue {
  const { signals, reasons } = extractSignals(title, body);
  const score = linearScore(signals);
  return {
    number,
    title,
    body,
    score,
    signals,
    reasons,
    summary: summarize(body),
  };
}

export function rankIssues(
  issues: { number: number; title: string; body: string }[],
): ScoredIssue[] {
  return issues
    .map((i) => scoreIssue(i.number, i.title, i.body ?? ""))
    .sort((a, b) => b.score - a.score || a.number - b.number);
}

/** First non-empty, non-heading line of the body, trimmed to one line. */
export function summarize(body: string, max = 120): string {
  const line =
    body
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("<!--")) ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}
