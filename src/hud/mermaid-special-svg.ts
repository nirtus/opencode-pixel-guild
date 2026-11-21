import {
  escapeSvgText,
  estimateMonospaceWidth,
  hashMermaidKey,
  normalizeMermaidLabel,
  stripMermaidQuotes,
} from "./mermaid-types.ts";

const FONT = "'JetBrains Mono','Fira Code',ui-monospace,SFMono-Regular,Menlo,monospace";

interface SequenceParticipant {
  readonly id: string;
  label: string;
  isActor: boolean;
}

type SequenceEvent =
  | { readonly kind: "msg"; readonly from: string; readonly to: string; readonly label: string; readonly dashed: boolean; readonly cross: boolean }
  | { readonly kind: "note"; readonly placement: "left" | "right" | "over"; readonly targets: string[]; readonly text: string }
  | { readonly kind: "block-start"; readonly keyword: string; readonly label: string }
  | { readonly kind: "block-else"; readonly keyword: string; readonly label: string }
  | { readonly kind: "block-end" };

export function tryRenderSequenceDiagramSvg(
  rawSource: string,
  keySeed: string,
): { readonly title: string | null; readonly svg: string } | null {
  const lines = rawSource
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/%%.*$/, "").trim())
    .filter((l) => l.length > 0 && !l.startsWith("---"));

  let title: string | null = null;
  let startIdx = 0;
  while (startIdx < lines.length && /^title\s*:/i.test(lines[startIdx]!)) {
    title = lines[startIdx]!.replace(/^title\s*:/i, "").trim();
    startIdx += 1;
  }
  if (!/^sequenceDiagram\b/i.test(lines[startIdx] ?? "")) return null;

  const participantMap = new Map<string, SequenceParticipant>();
  const ensureParticipant = (id: string, label?: string, isActor = false): SequenceParticipant => {
    const cleanId = id.trim();
    let p = participantMap.get(cleanId);
    if (!p) {
      p = { id: cleanId, label: label ? normalizeMermaidLabel(label) : cleanId, isActor };
      participantMap.set(cleanId, p);
    } else {
      if (label) p.label = normalizeMermaidLabel(label);
      if (isActor) p.isActor = true;
    }
    return p;
  };

  const events: SequenceEvent[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^(?:autonumber|activate\s+|deactivate\s+)/i.test(line)) continue;
    if (/^title\s+/i.test(line)) { title = line.replace(/^title\s*:?\s*/i, "").trim(); continue; }

    const partMatch = /^(participant|actor)\s+([A-Za-z0-9_.-]+)(?:\s+as\s+(.+))?$/i.exec(line);
    if (partMatch) {
      ensureParticipant(partMatch[2]!, partMatch[3], partMatch[1]!.toLowerCase() === "actor");
      continue;
    }

    const blockStart = /^(alt|opt|loop|par|critical|break|rect)\b\s*(.*)$/i.exec(line);
    if (blockStart) {
      events.push({ kind: "block-start", keyword: blockStart[1]!.toLowerCase(), label: blockStart[2]!.trim() });
      continue;
    }
    const blockElse = /^(else|and|option)\b\s*(.*)$/i.exec(line);
    if (blockElse) {
      events.push({ kind: "block-else", keyword: blockElse[1]!.toLowerCase(), label: blockElse[2]!.trim() });
      continue;
    }
    if (/^end$/i.test(line)) {
      events.push({ kind: "block-end" });
      continue;
    }

    const noteMatch = /^Note\s+(left of|right of|over)\s+([^:]+)\s*:\s*(.+)$/i.exec(line);
    if (noteMatch) {
      const placeRaw = noteMatch[1]!.toLowerCase();
      const placement = placeRaw.startsWith("left") ? "left" : placeRaw.startsWith("right") ? "right" : "over";
      const targets = noteMatch[2]!.split(",").map((s) => s.trim()).filter(Boolean);
      for (const t of targets) ensureParticipant(t);
      events.push({ kind: "note", placement, targets, text: normalizeMermaidLabel(noteMatch[3]!) });
      continue;
    }

    const msgMatch =
      /^([A-Za-z0-9_.]+(?:-[A-Za-z0-9_.]+)*)\s*(-->>|->>|-->|->|--x|-x|--\)|-\))([+-])?\s*([A-Za-z0-9_.]+(?:-[A-Za-z0-9_.]+)*)\s*:\s*(.*)$/.exec(
        line,
      );
    if (msgMatch) {
      const from = ensureParticipant(msgMatch[1]!).id;
      const op = msgMatch[2]!;
      const to = ensureParticipant(msgMatch[4]!).id;
      events.push({
        kind: "msg",
        from,
        to,
        label: normalizeMermaidLabel(msgMatch[5]!),
        dashed: op.startsWith("--"),
        cross: op.endsWith("x"),
      });
    }
  }

  const participants = [...participantMap.values()];
  if (participants.length === 0) return null;

  const colWidth = Math.max(132, ...participants.map((p) => estimateMonospaceWidth(p.label, 7.0) + 34));
  const padX = 24;
  const titleH = title ? 24 : 0;
  const topBoxY = 14 + titleH;
  const boxH = 34;
  const xById = new Map<string, number>();
  participants.forEach((p, idx) => {
    xById.set(p.id, padX + colWidth / 2 + idx * colWidth);
  });

  const width = Math.ceil(padX * 2 + participants.length * colWidth + 24);
  const hash = hashMermaidKey(`${keySeed}:seq`);
  const arrowId = `mmd-seq-arr-${hash}`;

  interface OpenBlock { keyword: string; label: string; startY: number; depth: number; dividers: Array<{ y: number; text: string }> }
  const openBlocks: OpenBlock[] = [];
  const finishedBlocks: Array<OpenBlock & { endY: number }> = [];
  const rowSvg: string[] = [];

  let cursorY = topBoxY + boxH + 22;
  for (const ev of events) {
    if (ev.kind === "block-start") {
      openBlocks.push({ keyword: ev.keyword, label: ev.label, startY: cursorY - 6, depth: openBlocks.length, dividers: [] });
      cursorY += 22;
      continue;
    }
    if (ev.kind === "block-else") {
      const top = openBlocks[openBlocks.length - 1];
      if (top) top.dividers.push({ y: cursorY, text: `${ev.keyword}${ev.label ? ` ${ev.label}` : ""}` });
      cursorY += 22;
      continue;
    }
    if (ev.kind === "block-end") {
      const closed = openBlocks.pop();
      if (closed) finishedBlocks.push({ ...closed, endY: cursorY + 4 });
      cursorY += 12;
      continue;
    }
    if (ev.kind === "note") {
      const xs = ev.targets.map((id) => xById.get(id) ?? padX + colWidth / 2);
      const nw = Math.max(96, Math.min(220, estimateMonospaceWidth(ev.text, 6.4) + 20));
      const nh = 26;
      const cx =
        ev.placement === "over"
          ? (Math.min(...xs) + Math.max(...xs)) / 2
          : ev.placement === "left"
            ? xs[0]! - nw / 2 - 12
            : xs[0]! + nw / 2 + 12;
      const nx = Math.max(8, Math.min(width - nw - 8, cx - nw / 2));
      rowSvg.push(
        `<g class="mmd-seq-note">` +
        `<rect x="${nx.toFixed(1)}" y="${cursorY}" width="${nw}" height="${nh}" rx="4" fill="#261b0e" stroke="#f59e0b" stroke-width="1.2" />` +
        `<text x="${(nx + nw / 2).toFixed(1)}" y="${cursorY + 16.5}" text-anchor="middle" fill="#fde68a" font-family="${FONT}" font-size="10">${escapeSvgText(ev.text)}</text>` +
        `</g>`,
      );
      cursorY += nh + 14;
      continue;
    }

    const x1 = xById.get(ev.from) ?? padX + colWidth / 2;
    const x2 = xById.get(ev.to) ?? x1;
    const dash = ev.dashed ? ' stroke-dasharray="5 4"' : "";
    const stroke = ev.dashed ? "#94a3b8" : "#38bdf8";

    if (ev.from === ev.to) {
      const loopW = 36;
      const loopH = 22;
      rowSvg.push(
        `<g class="mmd-seq-msg">` +
        `<text x="${(x1 + 8).toFixed(1)}" y="${cursorY - 4}" text-anchor="start" fill="#e2e8f0" font-family="${FONT}" font-size="10">${escapeSvgText(ev.label)}</text>` +
        `<path d="M ${x1} ${cursorY} L ${x1 + loopW} ${cursorY} L ${x1 + loopW} ${cursorY + loopH} L ${x1 + 2} ${cursorY + loopH}" fill="none" stroke="${stroke}" stroke-width="1.6"${dash} marker-end="url(#${arrowId})" />` +
        `</g>`,
      );
      cursorY += loopH + 20;
    } else {
      const midX = (x1 + x2) / 2;
      const dir = x2 > x1 ? 1 : -1;
      const endX = x2 - dir * 3;
      const endAttr = ev.cross ? "" : ` marker-end="url(#${arrowId})"`;
      const crossSvg = ev.cross
        ? `<path d="M ${endX - 4} ${cursorY - 4} L ${endX + 4} ${cursorY + 4} M ${endX + 4} ${cursorY - 4} L ${endX - 4} ${cursorY + 4}" stroke="#f87171" stroke-width="1.6" />`
        : "";
      rowSvg.push(
        `<g class="mmd-seq-msg">` +
        `<text x="${midX.toFixed(1)}" y="${cursorY - 6}" text-anchor="middle" fill="#e2e8f0" font-family="${FONT}" font-size="10">${escapeSvgText(ev.label)}</text>` +
        `<line x1="${x1}" y1="${cursorY}" x2="${endX}" y2="${cursorY}" stroke="${stroke}" stroke-width="1.6"${dash}${endAttr} />` +
        `${crossSvg}</g>`,
      );
      cursorY += 32;
    }
  }

  while (openBlocks.length > 0) {
    const closed = openBlocks.pop()!;
    finishedBlocks.push({ ...closed, endY: cursorY });
  }

  const bottomBoxY = cursorY + 8;
  const height = Math.ceil(bottomBoxY + boxH + 14);

  const blocksSvg = finishedBlocks
    .map((b) => {
      const inset = 10 + b.depth * 8;
      const bw = width - inset * 2;
      const bh = Math.max(24, b.endY - b.startY);
      const tagText = `${b.keyword}${b.label ? ` ${b.label}` : ""}`;
      const tagW = Math.min(bw - 12, estimateMonospaceWidth(tagText, 6.2) + 16);
      const dividers = b.dividers
        .map(
          (d) =>
            `<line x1="${inset}" y1="${d.y}" x2="${inset + bw}" y2="${d.y}" stroke="#475569" stroke-width="1.1" stroke-dasharray="4 3" />` +
            `<text x="${inset + 8}" y="${d.y + 13}" fill="#fde68a" font-family="${FONT}" font-size="9.5" font-weight="700">${escapeSvgText(d.text)}</text>`,
        )
        .join("");
      return (
        `<g class="mmd-seq-block">` +
        `<rect x="${inset}" y="${b.startY}" width="${bw}" height="${bh}" rx="6" fill="rgba(56,189,248,0.05)" stroke="#334155" stroke-width="1.2" />` +
        `<rect x="${inset}" y="${b.startY}" width="${tagW}" height="18" rx="4" fill="#172554" stroke="#38bdf8" stroke-width="1" />` +
        `<text x="${inset + 7}" y="${b.startY + 12.5}" fill="#7dd3fc" font-family="${FONT}" font-size="9.5" font-weight="700">${escapeSvgText(tagText)}</text>` +
        `${dividers}</g>`
      );
    })
    .join("");

  const lifelinesSvg = participants
    .map((p) => {
      const x = xById.get(p.id)!;
      return `<line x1="${x}" y1="${topBoxY + boxH}" x2="${x}" y2="${bottomBoxY}" stroke="#334155" stroke-width="1.4" stroke-dasharray="4 4" />`;
    })
    .join("");

  const renderParticipantBox = (p: SequenceParticipant, y: number): string => {
    const cx = xById.get(p.id)!;
    const bw = Math.min(colWidth - 14, Math.max(88, estimateMonospaceWidth(p.label, 6.9) + 22));
    const bx = cx - bw / 2;
    const stroke = p.isActor ? "#fbbf24" : "#38bdf8";
    const fill = p.isActor ? "#261b0e" : "#121b2e";
    const labelColor = p.isActor ? "#fef08a" : "#f8fafc";
    return (
      `<g class="mmd-seq-participant">` +
      `<rect x="${bx.toFixed(1)}" y="${y}" width="${bw}" height="${boxH}" rx="${p.isActor ? 16 : 6}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />` +
      `<text x="${cx}" y="${y + 21}" text-anchor="middle" fill="${labelColor}" font-family="${FONT}" font-size="11" font-weight="700">${escapeSvgText(p.label)}</text>` +
      `</g>`
    );
  };

  const boxesSvg = participants
    .map((p) => renderParticipantBox(p, topBoxY) + renderParticipantBox(p, bottomBoxY))
    .join("");
  const titleSvg = title
    ? `<text x="${width / 2}" y="20" text-anchor="middle" fill="#fef08a" font-family="${FONT}" font-size="12" font-weight="700">${escapeSvgText(title)}</text>`
    : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeSvgText(title || "Mermaid sequence diagram")}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="chat-md-mermaid-svg">` +
    `<defs><marker id="${arrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9 z" fill="#38bdf8" /></marker></defs>` +
    `${titleSvg}${blocksSvg}${lifelinesSvg}${rowSvg.join("")}${boxesSvg}</svg>`;

  return { title, svg };
}

const PIE_PALETTE = ["#38bdf8", "#f59e0b", "#10b981", "#a855f7", "#f43f5e", "#2dd4bf", "#eab308", "#818cf8"];

export function tryRenderPieDiagramSvg(
  rawSource: string,
): { readonly title: string | null; readonly svg: string } | null {
  const lines = rawSource
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/%%.*$/, "").trim())
    .filter((l) => l.length > 0 && !l.startsWith("---"));

  if (!/^pie\b/i.test(lines[0] ?? "")) return null;
  let title: string | null = null;
  const inlineTitle = /^pie(?:\s+showData)?\s+title\s+(.+)$/i.exec(lines[0]!);
  if (inlineTitle) title = stripMermaidQuotes(inlineTitle[1]!);

  const slices: Array<{ label: string; value: number }> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const titleMatch = /^title\s+(.+)$/i.exec(line);
    if (titleMatch) { title = stripMermaidQuotes(titleMatch[1]!); continue; }
    const sliceMatch = /^"([^"]+)"\s*:\s*([0-9]+(?:\.[0-9]+)?)$/.exec(line);
    if (sliceMatch) {
      const value = Number(sliceMatch[2]);
      if (Number.isFinite(value) && value > 0) {
        slices.push({ label: sliceMatch[1]!.trim(), value });
      }
    }
  }

  if (slices.length === 0) return null;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  const titleOffset = title ? 28 : 10;
  const radius = 70;
  const cx = 96;
  const cy = titleOffset + radius + 14;
  const legendX = cx + radius + 28;
  const maxLegendChars = Math.max(...slices.map((s) => s.label.length + 12), 14);
  const width = Math.ceil(legendX + estimateMonospaceWidth("x".repeat(maxLegendChars), 6.6) + 28);
  const legendHeight = slices.length * 22;
  const height = Math.ceil(Math.max(cy + radius + 20, titleOffset + 18 + legendHeight + 16));

  let angle = -Math.PI / 2;
  const pathsSvg: string[] = [];
  const legendSvg: string[] = [];

  slices.forEach((slice, idx) => {
    const color = PIE_PALETTE[idx % PIE_PALETTE.length]!;
    const frac = slice.value / total;
    const pct = Math.round(frac * 100);
    const sweep = frac * Math.PI * 2;
    const endAngle = angle + sweep;

    if (slices.length === 1) {
      pathsSvg.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" stroke="#090d16" stroke-width="1.5" />`);
    } else {
      const x1 = cx + radius * Math.cos(angle);
      const y1 = cy + radius * Math.sin(angle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = sweep > Math.PI ? 1 : 0;
      pathsSvg.push(
        `<path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${color}" stroke="#090d16" stroke-width="1.5" />`,
      );
    }

    const ly = titleOffset + 22 + idx * 22;
    legendSvg.push(
      `<g class="mmd-pie-legend">` +
      `<rect x="${legendX}" y="${ly - 9}" width="11" height="11" rx="2" fill="${color}" />` +
      `<text x="${legendX + 18}" y="${ly}" fill="#e2e8f0" font-family="${FONT}" font-size="10.5">${escapeSvgText(slice.label)} (${pct}%)</text>` +
      `</g>`,
    );
    angle = endAngle;
  });

  const titleSvg = title
    ? `<text x="${width / 2}" y="20" text-anchor="middle" fill="#fef08a" font-family="${FONT}" font-size="12" font-weight="700">${escapeSvgText(title)}</text>`
    : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeSvgText(title || "Mermaid pie chart")}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="chat-md-mermaid-svg">` +
    `${titleSvg}${pathsSvg.join("")}${legendSvg.join("")}</svg>`;

  return { title, svg };
}
