# Specification: `awesome-opencode` & OpenCode V2 Ecosystem Submissions

## Overview

Prepare and submit **OpenCode Pixel Guild Visualizer** (`https://github.com/nirtus/opencode-pixel-guild`) across the official OpenCode ecosystem documentation, `awesome-opencode` (YAML catalog + `Projects` Discussions showcase), and community OpenCode V2 marketplaces.

## Decisions & Requirements

1. **Official Non-Affiliation Disclaimer (`README.md`)**:
   - Include an explicit non-affiliation disclaimer in `README.md` (`## OpenCode Ecosystem & Disclaimer`) as required by [`anomalyco/opencode#building-on-opencode`](https://github.com/anomalyco/opencode#building-on-opencode) for projects containing `opencode` in their name.
2. **`awesome-opencode/awesome-opencode` (`data/projects/` PR & `Projects` Discussion Showcase)**:
   - **Pull Request**: [`awesome-opencode/awesome-opencode#1043`](https://github.com/awesome-opencode/awesome-opencode/pull/1043) (`data/projects/opencode-pixel-guild.yaml`).
   - **Discussions Showcase (`Projects` Category)**: Publish a showcase post in [`awesome-opencode/awesome-opencode/discussions/categories/projects`](https://github.com/awesome-opencode/awesome-opencode/discussions/categories/projects) following the exact community convention used by `OpenChamber` ([Discussion #55](https://github.com/awesome-opencode/awesome-opencode/discussions/55)) and `opencode-helper` ([Discussion #460](https://github.com/awesome-opencode/awesome-opencode/discussions/460))—embedding `docs/images/opencode-pixel-guild-intro-preview.gif`, summarizing key OpenCode V2 features, and linking directly to [`PR #1043`](https://github.com/awesome-opencode/awesome-opencode/pull/1043).
3. **Official OpenCode Ecosystem Page (`anomalyco/opencode`)**:
   - Open a PR against `anomalyco/opencode` (`dev` branch) adding `[opencode-pixel-guild](https://github.com/nirtus/opencode-pixel-guild)` to the `## Projects` table in `services/site/src/docs/v1/content/ecosystem.mdx`.
4. **Community Marketplaces (`opencode.cafe` & `opencode-plugin-marketplace`)**:
   - Open a PR against [`R44VC0RP/opencode.cafe`](https://github.com/R44VC0RP/opencode.cafe) (`main` branch) adding `opencode-pixel-guild` (`type: "tool"`) to `bulk/plugins.json` (which also auto-syndicates to [`ThomasSanna/opencode-mercato`](https://github.com/ThomasSanna/opencode-mercato)).
   - Open a PR against [`Tommertom/opencode-plugin-marketplace`](https://github.com/Tommertom/opencode-plugin-marketplace) (`main` branch) creating `plugins/opencode-pixel-guild.plugin.json` conforming to `schema/plugin.schema.json`.
5. **Out of Scope**:
   - Publishing an npm package for `opendock.net` (`package.json` remains `"private": true`).
