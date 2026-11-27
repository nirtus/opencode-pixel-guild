import { createHash } from "node:crypto";

/**
 * Shared public-hygiene rules imported by tests/test-sandbox.ts,
 * docs/screenshots/capture-docs-screenshots.ts, docs/screenshots/verify-docs-assets.ts,
 * and .githooks/pre-commit so SHA-256 digests and regexes live in one canonical place.
 */

// SHA-256 digests of lowercase private tokens (usernames, machine names, company domains,
// private project names, tunnel IDs, and LAN IPs) that must never appear in public tracked files or screenshots.
export const FORBIDDEN_TOKEN_DIGESTS: ReadonlySet<string> = new Set([
  "8bd73e4fa110a7f0c9796a08f13cb4c1e8cb2b5f03d122de417078322b0742fd",
  "497a609c3748ef3740d3fc8c99cf19d83e0d790aef52ddffb07ea4a24789fd7a",
  "8c49add472750bfa38c2aac58306adf04ba2604e23a6500a5ebfe157cb9de8cb",
  "2a4f6031eee0f780212176fce01af68088ccabc54d68ca18ad0684f4e5b486a5",
  "a002f13554f02281d3118071ad0375051c2baa449058adf2e7525b542fc9bf49",
  "73e2842cfc95a76b06eda49ff984c6bbb67e67648f04171265ccb8e6099075cc",
  "4bd5ba25e037a6055efaff09c55b10040ff3b22d65c3418227d99ee6febc8705",
  "8c6bae28570476771496600cd9e67a7a00cbc9f4898325567bce4d8de0fddae6",
  "a5424c4935dc5583e2e6e375832d5b0a5f17f18029541105fbc6b8df542cca9a",
  "58ecfd084ec55c297a8bd0d4241726f8c1f1e9637c453268275ab0071d10f0d8",
  "3db3e28bcc7d7d55e341ecdc31a6884a3bb5bb614a3ee23e558743b8880eb358",
  "41bd74c027d6e6733fc8016519a99ea4cde253325412faa9d974646840f73c2f",
  "bcbecf4df99b94b2361144eec4c24b85ce19311ce3e294faf48f79fab10b8d23",
  "b1d99a8fbe097bf3d3a45db7358c5783e551113bb1934868020849eac9a6018e",
  "83a6143b62678b9b4d0366528f4c37b3d0868a924dff56e617394d16efb4efcb",
  "2926759682684b7dabc14db57401ec297b581524141dca3eb83e432172640a1c",
  "0731b1043813fb5b6f9352dcb4ad8bfa615996aadd9bc455e8117711e13a53c4",
]);

export const NON_GENERIC_HOME_REGEX =
  /(?:\/mnt\/[a-z]|\/[a-z]|[a-z]:)[/\\]Users[/\\](?!alice\w*|bob\w*|charlie\w*|dev\w*|user\w*|macuser|host|operator\w*|op[ab]\b|test\w*|admin|public|default|\.|<|\$|\*)[A-Za-z0-9_.-]+|\/home\/(?!alice\w*|bob\w*|charlie\w*|dev\w*|user\w*|ubuntu|debian|node|guild|operator\w*|op[ab]\b|test\w*|runner|\.|<|\$|\*)[A-Za-z0-9_.-]+/i;

export const LIVE_OPEN_TUNNEL_REGEX =
  /https?:\/\/[a-f0-9]{12,}\.(?!synthetictunnel)[a-z0-9]{8,}\.opentunnel\.xyz/i;

export const PRIVATE_IPV4_REGEX =
  /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3})\b/;

const ALLOWED_VISUAL_URL_HOST_PATTERNS: readonly RegExp[] = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,
  /^localhost(?::\d+)?$/i,
  /^host\.docker\.internal(?::\d+)?$/i,
  /\.example$/i,
  /synthetictunnel/i,
  /^(?:forge-east|relay-02|citadel-01|archive-west|sanctum-ci)\b/i,
  /^opencode\.local$/i,
  /^example\.com$/i,
  /^example\.org$/i,
  /^github\.com$/i,
];

export interface PublicHygieneViolation {
  readonly kind:
    | "forbidden-token"
    | "non-generic-home-path"
    | "live-opentunnel-url"
    | "private-ipv4"
    | "non-allowlisted-url";
  /** Redacted diagnostic summary (never echoes raw secret token values). */
  readonly summary: string;
}

export function findForbiddenToken(text: string): string | null {
  const lower = text.toLowerCase();
  const tokens = new Set<string>([
    ...(lower.match(/[a-z0-9_.-]{4,}/g) ?? []),
    ...(lower.match(/[a-z0-9_]{4,}/g) ?? []),
  ]);
  for (const tok of tokens) {
    const digest = createHash("sha256").update(tok).digest("hex");
    if (FORBIDDEN_TOKEN_DIGESTS.has(digest)) {
      return tok;
    }
  }
  return null;
}

export function findPublicHygieneViolations(
  text: string,
  options: { checkPrivateIps?: boolean; checkExternalUrls?: boolean } = {},
): PublicHygieneViolation[] {
  const violations: PublicHygieneViolation[] = [];

  if (NON_GENERIC_HOME_REGEX.test(text)) {
    violations.push({
      kind: "non-generic-home-path",
      summary: "Detected non-generic OS user home directory path",
    });
  }

  if (LIVE_OPEN_TUNNEL_REGEX.test(text)) {
    violations.push({
      kind: "live-opentunnel-url",
      summary: "Detected live non-synthetic OpenTunnel URL",
    });
  }

  const forbidden = findForbiddenToken(text);
  if (forbidden) {
    const digestPrefix = createHash("sha256")
      .update(forbidden)
      .digest("hex")
      .slice(0, 12);
    violations.push({
      kind: "forbidden-token",
      summary: `Matched forbidden private token digest (${digestPrefix}...)`,
    });
  }

  if (options.checkPrivateIps && PRIVATE_IPV4_REGEX.test(text)) {
    violations.push({
      kind: "private-ipv4",
      summary: "Detected non-loopback private LAN/Tailscale IPv4 address",
    });
  }

  if (options.checkExternalUrls) {
    const urlMatches = text.match(/https?:\/\/([a-z0-9.-]+(?::\d+)?)/gi) ?? [];
    for (const rawUrl of urlMatches) {
      const host = rawUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
      if (!ALLOWED_VISUAL_URL_HOST_PATTERNS.some((re) => re.test(host))) {
        violations.push({
          kind: "non-allowlisted-url",
          summary: `Detected non-allowlisted external URL host (${host.slice(0, 6)}...)`,
        });
        break;
      }
    }
  }

  return violations;
}
