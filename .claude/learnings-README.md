# Self-learning system — index

This directory holds my durable memory across sessions for the
ai-signal-v2 project. Purpose: **don't repeat mistakes Suraj has already
flagged, and don't ask him questions whose answers are already here.**

Suraj's framing: "feedback bhul jate ho tum" — so this exists.

## Files in this system

| File | What it holds | When to consult |
|---|---|---|
| [`learnings-claude-blunders.md`](./learnings-claude-blunders.md) | Mistakes Suraj caught (with root cause + one-sentence rule) | Before shipping any change that touches a surface listed in a past entry — email, deploy, env, design |
| [`learnings-suraj-preferences.md`](./learnings-suraj-preferences.md) | Suraj's preferences for basic things (language, brevity, asking permission, how he wants me to act as a user) | Every turn — these change my default behavior |
| [`learnings-user-audit.md`](./learnings-user-audit.md) | Findings from opening the product as a real user (basic UX issues, broken flows) | Before claiming "looks good" — re-walk the checklist; after shipping a surface change, re-audit and update |
| [`learnings-research-cache.md`](./learnings-research-cache.md) | How other newsletters / email senders / Indian SaaS builders solve problems Suraj is also hitting | When designing a feature, before writing code — check if the wheel exists |
| [`design-quality-rubric.md`](./design-quality-rubric.md) | The Figr v3 hard gates (already exists) | Before any UI change |
| [`agents/*.md`](./agents/) | Specialist critics | Loop runs, design reviews |

## Standing rules (always-on)

1. **At session start**, skim this README + `learnings-suraj-preferences.md`. The other files are loaded on-demand based on the surface I'm touching.
2. **When Suraj flags a "silly mistake / blunder"**, append to `learnings-claude-blunders.md` *without being asked*. Format is in that file.
3. **When Suraj corrects a preference or says "do X this way"**, append to `learnings-suraj-preferences.md` *without being asked*. Reason + rule format.
4. **Before claiming a surface is "done"**, walk the relevant section of `learnings-user-audit.md` and prove it (state which checks passed).
5. **When stuck on a problem**, search `learnings-research-cache.md` first. If empty for that problem, add an entry as I solve it — note the solution other builders use, source link if any.

## How to maintain

- **Grow it by writing one entry per real lesson.** Don't pre-fill with hypothetical rules; that produces noise. Wait for a real moment.
- **Prune when a rule is wrong or obsolete.** Stale memory is worse than no memory.
- **Each entry self-contained.** Future-me reads ONE file at a time without conversation context — give every rule the *why* + the *when-it-applies*.
- **Cross-link.** When a blunder entry references a preference, link the file path. Reduces drift.
