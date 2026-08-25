export type Message = {
  id: string;
  from: string;
  subject: string;
  body: string;
  /** ISO timestamp */
  receivedAt: string;
  channel: "email" | "chat" | "feed";
  directlyAddressed: boolean;
};

export type ScoreReason = {
  rule: string;
  points: number;
  detail: string;
};

export type ScoredMessage = {
  message: Message;
  score: number;
  bucket: "now" | "today" | "later";
  reasons: ScoreReason[];
  /** One-line human explanation shown in the UI. */
  summary: string;
};
