# Map: Introduce OpenCode Pixel Guild to `awesome-opencode` & the OpenCode V2 Ecosystem

Label: `wayfinder:map`

## Destination

Deliver the complete OpenCode V2 ecosystem distribution package:
1. [`awesome-opencode/awesome-opencode`](https://github.com/awesome-opencode/awesome-opencode) YAML PR ([`#1043`](https://github.com/awesome-opencode/awesome-opencode/pull/1043)) and a community-standard [**`Projects` Discussion Showcase**](https://github.com/awesome-opencode/awesome-opencode/discussions/categories/projects) (matching `OpenChamber` `#55` and `opencode-helper` `#460`).
2. Official [`anomalyco/opencode`](https://github.com/anomalyco/opencode) non-affiliation disclaimer in `README.md` and `## Projects` table PR to `services/site/src/docs/v1/content/ecosystem.mdx` (`dev` branch).
3. Community marketplace PRs to [`R44VC0RP/opencode.cafe`](https://github.com/R44VC0RP/opencode.cafe) (`bulk/plugins.json`, auto-syndicating to `opencode-mercato`) and [`Tommertom/opencode-plugin-marketplace`](https://github.com/Tommertom/opencode-plugin-marketplace) (`plugins/opencode-pixel-guild.plugin.json`).

## Notes

- Domain: OpenCode V2 ecosystem distribution & repository documentation (`GLOSSARY.md`, `README.md`, `docs/awesome-opencode-submission.md`).
- Consulted skills: `wayfinder`, `grilling`, `domain-modeling`, `research`, `opencode`.
- Upstream targets:
  - `https://github.com/awesome-opencode/awesome-opencode` (`data/projects/opencode-pixel-guild.yaml` & `Discussions › Projects`)
  - `https://github.com/anomalyco/opencode` (`services/site/src/docs/v1/content/ecosystem.mdx` on `dev`)
  - `https://github.com/R44VC0RP/opencode.cafe` (`bulk/plugins.json` on `main`)
  - `https://github.com/Tommertom/opencode-plugin-marketplace` (`plugins/opencode-pixel-guild.plugin.json` on `main`)

## Decisions so far

- [Produce awesome-opencode Submission Package and Repository Readiness Polish](./issues/01-awesome-opencode-submission-package.md): Target `data/projects/opencode-pixel-guild.yaml` with approved 111-char tagline and OpenCode V2 description, polish `README.md` clone URLs and GitHub repo metadata, and open [`awesome-opencode/awesome-opencode#1043`](https://github.com/awesome-opencode/awesome-opencode/pull/1043).
- [Submit OpenCode Pixel Guild Across Official Ecosystem Docs, Marketplaces, and awesome-opencode Discussions Showcase](./issues/02-opencode-v2-ecosystem-directories-and-showcases.md): Committed and pushed the `anomalyco/opencode` non-affiliation disclaimer in `README.md`, published the `Projects` showcase in [`awesome-opencode/awesome-opencode` Discussion #1044](https://github.com/awesome-opencode/awesome-opencode/discussions/1044) linking to [`PR #1043`](https://github.com/awesome-opencode/awesome-opencode/pull/1043), and opened upstream PRs [`anomalyco/opencode#63949`](https://github.com/anomalyco/opencode/pull/63949) (`services/site/src/docs/v1/content/ecosystem.mdx`), [`R44VC0RP/opencode.cafe#18`](https://github.com/R44VC0RP/opencode.cafe/pull/18) (`bulk/plugins.json`), and [`Tommertom/opencode-plugin-marketplace#9`](https://github.com/Tommertom/opencode-plugin-marketplace/pull/9) (`plugins/opencode-pixel-guild.plugin.json`).

## Not yet specified

None — route to destination is complete and specified in [Submit OpenCode Pixel Guild Across Official Ecosystem Docs, Marketplaces, and awesome-opencode Discussions Showcase](./issues/02-opencode-v2-ecosystem-directories-and-showcases.md).

## Out of scope

- Wrapping the standalone companion server into an `opencode.json` npm plugin package for `data/plugins/` or publishing to npm (`"private": true` in `package.json` for `opendock.net`).
