# Issue 02: Submit OpenCode Pixel Guild Across Official Ecosystem Docs, Marketplaces, and `awesome-opencode` Discussions Showcase

Type: `task`
Label: `ready-for-agent`
Status: `resolved`
Blocked by: 01

## Question / Task Specification

Execute the settled multi-directory OpenCode V2 ecosystem submission plan documented in [`docs/awesome-opencode-submission.md`](../../../awesome-opencode-submission.md) and [`spec.md`](../spec.md):

1. **`README.md` Compliance**:
   - Verify the `## OpenCode Ecosystem & Disclaimer` section in `README.md` is present and committed/pushed to `nirtus/opencode-pixel-guild` (`development` & `main`) before opening upstream PRs so automated and human reviewers see the required non-affiliation disclaimer on the live repo.
2. **`awesome-opencode/awesome-opencode` Discussions (`Projects` Category) Showcase**:
   - Execute the `createDiscussion` GraphQL mutation in Section 1B of `docs/awesome-opencode-submission.md` to publish the `Projects` showcase post (matching `OpenChamber` `#55` and `opencode-helper` `#460` practice, with inline GIF preview and link to [`PR #1043`](https://github.com/awesome-opencode/awesome-opencode/pull/1043)).
3. **Official `anomalyco/opencode` Ecosystem Docs PR**:
   - Execute the workflow in Section 2 of `docs/awesome-opencode-submission.md` to add `opencode-pixel-guild` to the `## Projects` table in `services/site/src/docs/v1/content/ecosystem.mdx` (`dev` branch) and open the PR against `anomalyco:dev`.
4. **`R44VC0RP/opencode.cafe` PR**:
   - Execute the workflow in Section 3B of `docs/awesome-opencode-submission.md` to append `opencode-pixel-guild` to `bulk/plugins.json` and open the PR against `R44VC0RP/opencode.cafe:main`.
5. **`Tommertom/opencode-plugin-marketplace` PR**:
   - Execute the workflow in Section 4B of `docs/awesome-opencode-submission.md` to create `plugins/opencode-pixel-guild.plugin.json` and open the PR against `Tommertom/opencode-plugin-marketplace:main`.
6. **Record Live Links & Container Verification**:
   - Record all created PR and Discussion URLs in `docs/awesome-opencode-submission.md`, deploy and verify the container (`npm run docker:up` on port `4310`), capture visual proof in `docs/images/opencode-v2-ecosystem-submissions.png`, and mark this ticket `Status: resolved`.

## Answer

1. **Committed & Pushed Repository Compliance First**:
   - Added `## OpenCode Ecosystem & Disclaimer` to `README.md` and updated `docs/awesome-opencode-submission.md` on `development` (and fast-forwarded `main`) so `https://github.com/nirtus/opencode-pixel-guild` publicly displays the non-affiliation disclaimer required by `anomalyco/opencode#building-on-opencode`.
2. **Executed Live Upstream Ecosystem & Marketplace Submissions**:
   - **`awesome-opencode/awesome-opencode` (`Projects` Discussion Showcase)**: Published [`awesome-opencode/awesome-opencode#1044`](https://github.com/awesome-opencode/awesome-opencode/discussions/1044) in the `Projects` category with the inline animated GIF preview (`docs/images/opencode-pixel-guild-intro-preview.gif`), OpenCode V2 feature summary, and link to [`PR #1043`](https://github.com/awesome-opencode/awesome-opencode/pull/1043).
   - **Official OpenCode Ecosystem Docs (`anomalyco/opencode`)**: Forked to `nirtus/opencode`, added `opencode-pixel-guild` to the `## Projects` table in `services/site/src/docs/v1/content/ecosystem.mdx` on branch `docs/add-opencode-pixel-guild`, and opened [`anomalyco/opencode#63949`](https://github.com/anomalyco/opencode/pull/63949) against `anomalyco:dev`.
   - **`opencode.cafe` (`R44VC0RP/opencode.cafe`)**: Forked to `nirtus/opencode.cafe`, appended `opencode-pixel-guild` (`type: "tool"`) to `bulk/plugins.json` on branch `add-opencode-pixel-guild`, and opened [`R44VC0RP/opencode.cafe#18`](https://github.com/R44VC0RP/opencode.cafe/pull/18) against `R44VC0RP/opencode.cafe:main` (also auto-syndicating to `opencode-mercato`).
   - **`Tommertom/opencode-plugin-marketplace`**: Forked to `nirtus/opencode-plugin-marketplace`, created `plugins/opencode-pixel-guild.plugin.json` conforming to `schema/plugin.schema.json` on branch `add-opencode-pixel-guild`, and opened [`Tommertom/opencode-plugin-marketplace#9`](https://github.com/Tommertom/opencode-plugin-marketplace/pull/9) against `Tommertom/opencode-plugin-marketplace:main`.
3. **Container Deployment & Verification**:
   - Deployed and verified on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on `http://127.0.0.1:4310`), passed full `npm test` suite, and captured live visual proof at `docs/images/opencode-v2-ecosystem-submissions.png`.
