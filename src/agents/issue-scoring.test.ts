import { describe, expect, it } from "vitest";
import {
  W_EFFORT,
  W_INTEREST,
  W_SEVERITY,
  extractSignals,
  linearScore,
  rankIssues,
  scoreIssue,
  summarize,
} from "./issue-scoring.js";

describe("extractSignals", () => {
  it("reads high severity from breakage language", () => {
    const { signals } = extractSignals("Triage crashes on empty inbox", "It fails immediately.");
    expect(signals.severity).toBe(5);
  });

  it("reads low effort from one-line-change language", () => {
    const { signals } = extractSignals("Add keyword 'escalation'", "Just a keyword in the list.");
    expect(signals.effort).toBe(1);
  });

  it("always explains itself", () => {
    const { reasons } = extractSignals("anything", "anything");
    expect(reasons).toHaveLength(3);
  });
});

describe("linearScore", () => {
  it("follows the documented formula", () => {
    const signals = { severity: 4, interest: 3, effort: 2 };
    const expected = W_SEVERITY * 4 + W_INTEREST * 3 - W_EFFORT * 2;
    expect(linearScore(signals)).toBe(expected);
  });

  it("clamps to 0..100", () => {
    expect(linearScore({ severity: 5, interest: 5, effort: 1 })).toBeLessThanOrEqual(100);
    expect(linearScore({ severity: 1, interest: 1, effort: 5 })).toBeGreaterThanOrEqual(0);
  });

  it("ranks severity above interest at equal magnitude", () => {
    const severe = linearScore({ severity: 5, interest: 1, effort: 3 });
    const interesting = linearScore({ severity: 1, interest: 5, effort: 3 });
    expect(severe).toBeGreaterThan(interesting);
  });
});

describe("rankIssues", () => {
  it("puts the critical bug above the cosmetic one", () => {
    const ranked = rankIssues([
      { number: 2, title: "Typo in the footer", body: "Cosmetic polish." },
      { number: 1, title: "Scoring is broken for every user", body: "It fails daily." },
    ]);
    expect(ranked[0]?.number).toBe(1);
  });

  it("is deterministic — same input, same order", () => {
    const input = [
      { number: 1, title: "a", body: "" },
      { number: 2, title: "b", body: "" },
    ];
    expect(rankIssues(input).map((i) => i.number)).toEqual(rankIssues(input).map((i) => i.number));
  });
});

describe("summarize", () => {
  it("skips headings and blank lines", () => {
    expect(summarize("# Title\n\nThe real description.")).toBe("The real description.");
  });

  it("truncates long lines", () => {
    expect(summarize("x".repeat(300)).length).toBeLessThanOrEqual(120);
  });
});

describe("scoreIssue", () => {
  it("returns an auditable object", () => {
    const scored = scoreIssue(7, "Feed items outrank direct chats", "Wrong for most users.");
    expect(scored.number).toBe(7);
    expect(scored.reasons.length).toBeGreaterThan(0);
    expect(scored.score).toBe(linearScore(scored.signals));
  });
});
