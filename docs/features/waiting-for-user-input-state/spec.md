# Feature Specification: Waiting for User Input State & Overhead Question Mark

## Overview

When an OpenCode session is waiting for a user's answer or clarification—either via an explicit `question` tool / form Quest Gate or because the assistant ended its latest turn by asking the user a question (such as `@grilling` / `@wayfinder` rounds or a clarification question)—the character must enter a **Waiting** state (`BlockedAtQuestGate` with `kind: "question"`, `marker: "?"`) rather than transitioning to `RestingInLounge` ("Resting").

While waiting for user input:
1. **Station Placement**: The character remains standing attentively at their last active **Preparation Station** (or the **Arcane Lectern** if no prior station was visited) instead of walking to a seat in the **Break Lounge**.
2. **Overhead `?` Indicator**: A prominent bobbing `?` marker renders directly above the character's head, without a redundant overhead text pill (`?` alone is the overhead cue over the character sprite).
3. **Lifecycle Transitions**: The waiting state clears and resumes normal work as soon as the user submits a response or a new turn/tool execution begins. Normal completed turns that do not ask the user for an answer or clarification transition to `RestingInLounge` in the Break Lounge as usual.
