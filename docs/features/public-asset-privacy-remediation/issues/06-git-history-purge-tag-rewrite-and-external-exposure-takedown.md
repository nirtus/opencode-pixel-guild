# Purge docs/images/ From Git History, Force-Push Rewritten Branches/Tags & Execute External Exposure Takedown

Type: task
Label: wayfinder:task
Status: claimed
Blocked by: 01, 02

## Question

Once [Immediate Containment & Quarantine of Leaked Public Documentation Assets](./01-immediate-containment-and-quarantine-of-leaked-images.md) and [Audit All Remaining 16 Static Images in assets/images/ & Public Repo References](./02-audit-remaining-assets-and-external-references.md) are resolved, execute the HITL Git history purge and external exposure takedown checklist:

1. **Pre-Rewrite Safety Snapshot & Full `docs/images/` History Purge (`git filter-repo`)**:
   - Create a local offline backup clone before rewriting history.
   - Run `git filter-repo --invert-paths --path docs/images` (plus `--replace-text` if needed for the inline short-tag text finding in `docs/features/workflow-e2e-audit/spec.md:39` surfaced by [Audit All Remaining 16 Static Images in assets/images/ & Public Repo References](./02-audit-remaining-assets-and-external-references.md)) across all branches (`main`, `development`) and tags (`v0.8.0`, `v0.2.0`, `v0.2.1`).
   - Verify with `git log --all --stat -- docs/images/` and `git rev-list --all --objects | grep -iE 'docs/images|assets/images'` that zero leaked blobs remain reachable in Git history.
2. **Force-Push Rewritten History & Re-Tag Releases**:
   - Force-push rewritten `main`, `development`, and updated tags (`--force`) to `origin`.
   - Verify collaborators / local clones re-sync cleanly onto the rewritten refs.
3. **External Exposure & GitHub Cache Takedown Checklist (HITL)**:
   - Inspect GitHub Releases (`v0.8.0`, `v0.2.0`, `v0.2.1`) and remove/replace any leaked release notes embeds or attachments.
   - Inspect [`awesome-opencode/awesome-opencode` Discussion #1044](https://github.com/awesome-opencode/awesome-opencode/discussions/1044) and live ecosystem PRs recorded in `docs/awesome-opencode-submission.md` (`#1043`, `#65401`, `#18`, `#9`, `#689`) to confirm whether any leaked image URLs or screenshots were posted and edit/remove them if present.
   - Check any community posts made on Discord, Reddit, X/Twitter, or LinkedIn (per `docs/awesome-opencode-submission.md`) for uploaded leaked images (notably `mermaid-chat-diagrams.png`) and remove/replace them.
   - Submit a GitHub Support request to purge cached commit/blob views and `raw.githubusercontent.com` CDN entries for the old commit SHAs (`7ea7b73` through `2c7c769`).
4. Record completion status, verified rewritten commit hashes, and external takedown verification under `## Answer`.
