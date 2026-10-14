import type { DataCollection } from "@sentry/core";

// Privacy (CLAUDE.md rule 6): never send CV content, answers or transcripts to Sentry.
// Sentry collects bodies, AI inputs and outputs, query data and local variables by default,
// any of which could hold candidate text, so every category is switched off.
export const dataCollection: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};
