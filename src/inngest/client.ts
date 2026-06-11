// LOCAL DEV WORKFLOW:
// Terminal 1: pnpm dev  (or npm run dev)
// Terminal 2: npx inngest-cli@latest dev
// Inngest dev server auto-discovers events at http://localhost:3000/api/inngest
// Dashboard: http://localhost:8288

import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'ai-signal-v2' })

export interface GenerateIssueTriggerData {
  issueId: string
}

export interface ThroughlineChosenData {
  issueId: string
  candidateId?: string         // present when picking 1/2/3
  overrideThroughline?: string // present when Suraj writes his own
}
