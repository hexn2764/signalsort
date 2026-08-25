import type { Message, ScoreReason, ScoredMessage } from "./types.js";

type MessageWithReply = Message & { isReplyToMe?: boolean };

const URGENT_WORDS = ["escalation", "asap", "urgent", "today", "deadline", "blocker", "outage", "eod"];
const NOISE_WORDS = ["newsletter", "unsubscribe", "webinar", "promo", "no-reply"];

/** Pure. `now` is injected so tests are deterministic. */
export function scoreMessage(
  message: MessageWithReply,
  now: Date,
  vipSenders: string[] = [],
): ScoredMessage {
  const reasons: ScoreReason[] = [];
  const text = `${message.subject} ${message.body}`.toLowerCase();

  if (message.directlyAddressed) {
    reasons.push({ rule: "addressed", points: 30, detail: "you are addressed directly" });
  }

  if (vipSenders.some((sender) => sender.toLowerCase() === message.from.toLowerCase())) {
    reasons.push({ rule: "senderWeight", points: 25, detail: "from a VIP sender" });
  }

  if (message.isReplyToMe) {
    reasons.push({ rule: "threadReply", points: 15, detail: "reply in a thread you started" });
  }

  if (text.includes("?")) {
    reasons.push({ rule: "question", points: 20, detail: "contains a question" });
  }

  const urgent = URGENT_WORDS.filter((w) => text.includes(w));
  if (urgent.length > 0) {
    reasons.push({
      rule: "urgency",
      points: 15 * urgent.length,
      detail: `urgency words: ${urgent.join(", ")}`,
    });
  }

  const noise = NOISE_WORDS.filter((w) => text.includes(w) || message.from.toLowerCase().includes(w));
  if (noise.length > 0) {
    reasons.push({ rule: "noise", points: -25, detail: `looks automated: ${noise.join(", ")}` });
  }

  const ageHours = (now.getTime() - new Date(message.receivedAt).getTime()) / 3_600_000;
  if (ageHours <= 2) {
    reasons.push({ rule: "fresh", points: 10, detail: "arrived in the last 2 hours" });
  } else if (ageHours > 24) {
    reasons.push({ rule: "stale", points: -10, detail: "older than 2 days" });
  }

  if (message.channel === "feed") {
    reasons.push({ rule: "channel", points: -10, detail: "feed item, not a direct message" });
  }

  const score = clamp(reasons.reduce((sum, r) => sum + r.points, 0));

  return {
    message,
    score,
    bucket: bucketFor(score),
    reasons,
    summary: buildSummary(reasons),
  };
}

export function triage(messages: MessageWithReply[], now: Date, vipSenders: string[] = []): ScoredMessage[] {
  return messages
    .map((m) => scoreMessage(m, now, vipSenders))
    .sort((a, b) => b.score - a.score || a.message.id.localeCompare(b.message.id));
}

export function bucketFor(score: number): ScoredMessage["bucket"] {
  if (score >= 60) return "now";
  if (score >= 30) return "today";
  return "later";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function buildSummary(reasons: ScoreReason[]): string {
  const positive = reasons.filter((r) => r.points > 0).map((r) => r.detail);
  if (positive.length === 0) return "nothing here asks for you";
  return positive.join(" + ");
}
