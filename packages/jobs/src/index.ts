// Inngest background job functions. Every job that touches personal data must
// receive and filter on candidate_id (06-phase0-1-build.md, Row-level security).
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "interview-prep" });

export const CONNECTION_CHECK_EVENT = "system/connection.check";

// Proves the round trip: the website sends an event, Inngest calls back into
// the website to run this function. Carries no personal data.
export const connectionCheck = inngest.createFunction(
  { id: "system-connection-check", triggers: [{ event: CONNECTION_CHECK_EVENT }] },
  async ({ event, step }) => {
    return step.run("acknowledge", () => ({ received: event.name }));
  },
);

export const functions = [connectionCheck];
