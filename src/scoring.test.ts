import { describe, expect, it } from "vitest";
import { bucketFor, scoreMessage, triage } from "./scoring.js";
import type { Message } from "./types.js";

const NOW = new Date("2026-08-25T12:00:00Z");

function msg(over: Partial<Message> = {}): Message {
  return {
    id: "m1",
    from: "someone@example.com",
    subject: "hello",
    body: "just saying hi",
    receivedAt: "2026-08-25T11:30:00Z",
    channel: "email",
    directlyAddressed: false,
    ...over,
  };
}

describe("scoreMessage", () => {
  it("ranks a direct question with a deadline as 'now'", () => {
    const result = scoreMessage(
      msg({ directlyAddressed: true, subject: "Can you review this today?" }),
      NOW,
    );
    expect(result.bucket).toBe("now");
    expect(result.summary).toContain("question");
  });

  it("pushes newsletters down", () => {
    const result = scoreMessage(
      msg({ from: "no-reply@news.example", subject: "Weekly newsletter" }),
      NOW,
    );
    expect(result.bucket).toBe("later");
  });

  it("never returns a score outside 0..100", () => {
    const loud = scoreMessage(
      msg({ directlyAddressed: true, subject: "URGENT ASAP blocker outage today? EOD deadline" }),
      NOW,
    );
    expect(loud.score).toBeLessThanOrEqual(100);
    expect(loud.score).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic for a fixed `now`", () => {
    const a = scoreMessage(msg(), NOW);
    const b = scoreMessage(msg(), NOW);
    expect(a.score).toBe(b.score);
  });
});

describe("triage", () => {
  it("sorts highest score first", () => {
    const ranked = triage(
      [
        msg({ id: "b", from: "no-reply@promo.example", subject: "promo webinar" }),
        msg({ id: "a", directlyAddressed: true, subject: "urgent: can you confirm?" }),
      ],
      NOW,
    );
    expect(ranked[0]?.message.id).toBe("a");
  });
});

describe("bucketFor", () => {
  it("maps score ranges to buckets", () => {
    expect(bucketFor(90)).toBe("now");
    expect(bucketFor(40)).toBe("today");
    expect(bucketFor(5)).toBe("later");
  });
});
