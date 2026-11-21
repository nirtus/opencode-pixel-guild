import { escapeHtml } from "./hud-formatters.ts";
import { renderMermaidBlockHtml } from "./mermaid-renderer.ts";

export function sanitizeAndExtractSkillsFromChatText(rawText: string): {
  cleanText: string;
  skills: string[];
} {
  const skills = new Set<string>();
  const cleaned = String(rawText || "")
    .replace(
      /<skill_content\s+name="([^"]+)"[^>]*>[\s\S]*?(?:<\/skill_content>|$)/gi,
      (_match, name: string) => {
        if (name && name.trim()) skills.add(name.trim());
        return "";
      },
    )
    .replace(/<EXTREMELY[_-]IMPORTANT>[\s\S]*?(?:<\/EXTREMELY[_-]IMPORTANT>|$)/gi, "")
    .replace(/<SUBAGENT-STOP>[\s\S]*?(?:<\/SUBAGENT-STOP>|$)/gi, "")
    .replace(/<system-reminder>[\s\S]*?(?:<\/system-reminder>|$)/gi, "")
    .replace(/<instructions>[\s\S]*?(?:<\/instructions>|$)/gi, "")
    .replace(/<env>[\s\S]*?(?:<\/env>|$)/gi, "");

  for (const m of cleaned.matchAll(/(?:^|\s)@([a-zA-Z0-9_-]{2,})/g)) {
    if (m[1] && !m[1].includes(".")) skills.add(m[1]);
  }
  return {
    cleanText: cleaned.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(),
    skills: [...skills],
  };
}

export function buildFenceSafePreviewSlice(cleanText: string, maxChars = 420): string {
  if (cleanText.length <= maxChars) return cleanText;
  let slice = cleanText.slice(0, maxChars);
  const lastNewline = slice.lastIndexOf("\n");
  if (lastNewline >= Math.floor(maxChars * 0.65)) slice = slice.slice(0, lastNewline);
  slice = slice
    .replace(/\n\s*```[^\n]*$/, "")
    .replace(/\n\s*(?:---+|\*\*\*+|___+)\s*$/, "")
    .trimEnd();
  const fenceMatches = slice.match(/^\s*```/gm);
  if (fenceMatches && fenceMatches.length % 2 === 1) {
    return `${slice}\n…\n\`\`\``;
  }
  const lastLine = slice.slice(slice.lastIndexOf("\n") + 1);
  const inlineTicks = (lastLine.match(/`/g) ?? []).length;
  return inlineTicks % 2 === 1 ? `${slice}…\`` : `${slice}…`;
}

function classifyInlineCodeClass(rawCode: string): string {
  const trimmed = String(rawCode || "").trim();
  if (
    /^(?:(?:\.{0,2}\/|src\/|docs\/|tests\/)[a-zA-Z0-9_./-]*|[a-zA-Z0-9_-]+\/[a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)(?::\d+)?$/.test(trimmed) ||
    /\.[a-z]{2,4}(?::\d+)?$/i.test(trimmed)
  ) {
    return "chat-md-code chat-md-code-path";
  }
  if (/^(?:npm|npx|node|git|opencode|curl|GET|POST|DELETE|PUT)\b|^--?[a-zA-Z0-9_-]+/.test(trimmed)) {
    return "chat-md-code chat-md-code-cmd";
  }
  return "chat-md-code";
}

export function formatInlineMarkdown(rawLine: string): string {
  const codeSlots: string[] = [];
  const withPlaceholders = String(rawLine || "").replace(/`([^`]+)`/g, (_m, code: string) => {
    const idx = codeSlots.length;
    codeSlots.push(
      `<code class="${classifyInlineCodeClass(code)}">${escapeHtml(code)}</code>`,
    );
    return `\u0000CODE${idx}\u0000`;
  });

  const formatted = escapeHtml(withPlaceholders)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s"'<>)]+)\)/g,
      (fullMatch, label: string, url: string) => {
        if (/(?:&quot;|&#39;|&lt;|&gt;|&amp;(?:quot|#39|#x27|lt|gt);)/i.test(url)) {
          return fullMatch;
        }
        return `<a class="chat-md-link" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      },
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="chat-md-strong">$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em class="chat-md-em">$2</em>')
    .replace(
      /(^|\s)@([a-zA-Z0-9_-]{2,})(?=\s|$|[.,!?:;])/g,
      (_m, pre: string, tag: string) =>
        tag.includes(".")
          ? `${pre}@${tag}`
          : `${pre}<span class="chat-md-mention">@${tag}</span>`,
    );

  return formatted.replace(
    /\u0000CODE(\d+)\u0000/g,
    (_m, idxStr: string) => codeSlots[Number(idxStr)] ?? "",
  );
}

export function formatChatMarkdownHtml(text: string): string {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    const fenceMatch = /^\s*```([^\n`]*)$/.exec(line);
    if (fenceMatch) {
      const lang = (fenceMatch[1] || "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      const isClosedFence = i < lines.length;
      if (isClosedFence) i += 1;
      const rawCode = codeLines.join("\n").replace(/^\n+|\n+$/g, "");
      if (lang === "mermaid") {
        if (isClosedFence) {
          blocks.push(renderMermaidBlockHtml(rawCode, { diagramId: `mmd-${blocks.length}` }));
        } else {
          blocks.push(
            `<div class="chat-md-codeblock" data-mermaid-fallback="true">` +
            `<div class="chat-md-codeblock-bar"><span class="chat-md-codeblock-lang">mermaid</span></div>` +
            `<pre class="chat-md-pre tool-log-output">${escapeHtml(rawCode)}</pre></div>`,
          );
        }
        continue;
      }
      const langBadge = lang
        ? `<div class="chat-md-codeblock-bar"><span class="chat-md-codeblock-lang">${escapeHtml(lang)}</span></div>`
        : "";
      blocks.push(
        `<div class="chat-md-codeblock">${langBadge}<pre class="chat-md-pre tool-log-output">${escapeHtml(rawCode)}</pre></div>`,
      );
      continue;
    }

    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(trimmed)) {
      blocks.push('<hr class="chat-md-hr" />');
      i += 1;
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = formatInlineMarkdown(headingMatch[2].trim());
      blocks.push(
        `<div class="chat-md-heading chat-md-h${level} roster-row-title-bold">${content}</div>`,
      );
      i += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(
          formatInlineMarkdown(lines[i].trim().replace(/^>\s?/, "")),
        );
        i += 1;
      }
      blocks.push(
        `<blockquote class="chat-md-quote">${quoteLines.join("<br />")}</blockquote>`,
      );
      continue;
    }

    if (/^\|.+\|$/.test(trimmed)) {
      const tableRows: string[][] = [];
      let hasHeaderSep = false;
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        const rowText = lines[i].trim();
        if (/^\|[\s:|-]+\|$/.test(rowText)) {
          hasHeaderSep = true;
        } else {
          tableRows.push(
            rowText
              .slice(1, -1)
              .split("|")
              .map((c) => formatInlineMarkdown(c.trim())),
          );
        }
        i += 1;
      }
      if (tableRows.length > 0) {
        const useHead = hasHeaderSep && tableRows.length > 1;
        const headHtml = useHead
          ? `<thead><tr>${tableRows[0].map((c) => `<th>${c}</th>`).join("")}</tr></thead>`
          : "";
        const bodyRows = useHead ? tableRows.slice(1) : tableRows;
        const bodyHtml = `<tbody>${bodyRows
          .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
          .join("")}</tbody>`;
        blocks.push(
          `<div class="chat-md-table-wrap"><table class="chat-md-table">${headHtml}${bodyHtml}</table></div>`,
        );
      }
      continue;
    }

    if (/^(\s*)(?:([-*•])|(\d+)\.)\s+(.+)$/.test(line)) {
      const itemsHtml: string[] = [];
      while (i < lines.length) {
        const m = /^(\s*)(?:([-*•])|(\d+)\.)\s+(.+)$/.exec(lines[i]);
        if (!m) break;
        const indent = Math.min(3, Math.floor((m[1] || "").length / 2));
        const marker = m[3] ? `${m[3]}.` : "•";
        itemsHtml.push(
          `<li class="chat-md-li chat-md-li-indent-${indent}"><span class="chat-md-li-marker">${marker}</span><span class="chat-md-li-body">${formatInlineMarkdown(m[4].trim())}</span></li>`,
        );
        i += 1;
      }
      blocks.push(`<ul class="chat-md-list">${itemsHtml.join("")}</ul>`);
      continue;
    }

    const paraLines: string[] = [formatInlineMarkdown(trimmed)];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\s*```/.test(lines[i]) &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i].trim()) &&
      !/^\|.+\|$/.test(lines[i].trim()) &&
      !/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(lines[i].trim()) &&
      !/^(\s*)(?:([-*•])|(\d+)\.)\s+(.+)$/.test(lines[i])
    ) {
      paraLines.push(formatInlineMarkdown(lines[i].trim()));
      i += 1;
    }
    blocks.push(`<p class="chat-md-p">${paraLines.join("<br />")}</p>`);
  }

  return blocks.join("");
}
