import type { Message } from "./types.js";

/** Fixed demo inbox. Timestamps are relative to `base` so the demo never goes stale. */
export function sampleInbox(base: Date = new Date()): Message[] {
  const hoursAgo = (h: number) => new Date(base.getTime() - h * 3_600_000).toISOString();

  return [
    {
      id: "1",
      from: "anna.k@contoso.com",
      subject: "Can you approve the budget today?",
      body: "Kirill, finance needs your sign-off before EOD. Deadline is today.",
      receivedAt: hoursAgo(1),
      channel: "email",
      directlyAddressed: true,
    },
    {
      id: "2",
      from: "no-reply@devnews.example",
      subject: "Weekly newsletter: 12 things you missed",
      body: "Read more. Unsubscribe here.",
      receivedAt: hoursAgo(5),
      channel: "email",
      directlyAddressed: false,
    },
    {
      id: "3",
      from: "ops-bot@contoso.com",
      subject: "Production outage in eu-west",
      body: "Blocker: checkout is down. Someone needs to look now.",
      receivedAt: hoursAgo(0.5),
      channel: "chat",
      directlyAddressed: false,
    },
    {
      id: "4",
      from: "team-feed@contoso.com",
      subject: "Someone posted in #random",
      body: "Great picture of a cat.",
      receivedAt: hoursAgo(3),
      channel: "feed",
      directlyAddressed: false,
    },
    {
      id: "5",
      from: "marco@contoso.com",
      subject: "Quick question about the API contract",
      body: "Do we version the endpoint or add a field? Need it for the sprint.",
      receivedAt: hoursAgo(20),
      channel: "chat",
      directlyAddressed: true,
    },
    {
      id: "6",
      from: "events@promo.example",
      subject: "Free webinar next month",
      body: "Register now, promo code inside. Unsubscribe.",
      receivedAt: hoursAgo(70),
      channel: "email",
      directlyAddressed: false,
    },
    {
      id: "7",
      from: "sara@contoso.com",
      subject: "Thanks!",
      body: "Nothing needed, just wanted to say the demo went well.",
      receivedAt: hoursAgo(26),
      channel: "email",
      directlyAddressed: true,
    },
    {
      id: "8",
      from: "hr@contoso.com",
      subject: "Reminder: submit your timesheet",
      body: "Deadline is today, please submit before EOD.",
      receivedAt: hoursAgo(8),
      channel: "email",
      directlyAddressed: false,
    },
  ];
}
