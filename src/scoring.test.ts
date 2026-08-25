import { describe, expect, it } from "vitest";
import { bucketFor, scoreMessage, triage } from "./scoring.js";
import type { Message } from "./types.js";

type MessageWithReply = Message & { isReplyToMe?: boolean };

const NOW = new Date("2026-08-25T12:00:00Z");

function msg(over: Partial<MessageWithReply> = {}): MessageWithReply {
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

  it("adds a VIP sender bonus", () => {
    const result = scoreMessage(msg({ from: "vip@example.com" }), NOW, ["vip@example.com"]);
    expect(result.reasons).toContainEqual({
      rule: "senderWeight",
      points: 25,
      detail: "from a VIP sender",
    });
    expect(result.summary).toContain("from a VIP sender");
  });

  it("ignores non-VIP senders", () => {
    const result = scoreMessage(msg({ from: "person@example.com" }), NOW, ["vip@example.com"]);
    expect(result.reasons.some((reason) => reason.rule === "senderWeight")).toBe(false);
  });

  it("adds a reply-in-thread bonus when appropriate", () => {
    const result = scoreMessage(msg({ isReplyToMe: true }), NOW);
    expect(result.reasons).toContainEqual({
      rule: "threadReply",
      points: 15,
      detail: "reply in a thread you started",
    });
    expect(result.summary).toContain("reply in a thread you started");
  });

  it("does not add a reply bonus for regular messages", () => {
    const result = scoreMessage(msg({ isReplyToMe: false }), NOW);
    expect(result.reasons.some((reason) => reason.rule === "threadReply")).toBe(false);
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

describe("autopilot: escalation keyword", () => {
  it("treats an escalation as urgent", () => {
    const result = scoreMessage(msg({ subject: "Escalation from the support team" }), NOW);
    expect(result.reasons.some((r) => r.rule === "urgency")).toBe(true);
  });
});

describe("autopilot: question weight", () => {
  it("scores a plain question into at least the Today bucket", () => {
    const result = scoreMessage(msg({ subject: "Could you take a look?" }), NOW);
    expect(result.score).toBeGreaterThanOrEqual(28);
  });
});
