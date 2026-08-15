#!/usr/bin/env node
/**
 * build.mjs — regenerates every artifact from data/model.json.
 *
 * You only need this if you EDIT data/model.json. The generated files are
 * committed to the repo, so a normal user never runs it.
 *
 *   node tools/build.mjs
 *
 * Outputs:
 *   index.html                        interactive map + workbook (self-contained)
 *   vault/*.md                        Obsidian notes, wiki-linked
 *   vault/One-Day Protocol.canvas     Obsidian Canvas mind map
 *   vault/Workbook.md                 fillable worksheet
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => join(ROOT_DIR, ...s);

const model = JSON.parse(readFileSync(p("data", "model.json"), "utf8"));
const META = model.meta;
const ROOT = model.root;

/* ------------------------------------------------------------------ utils */
const walk = (n, fn, d = 0, parent = null) => {
  fn(n, d, parent);
  (n.children || []).forEach((c) => walk(c, fn, d + 1, n));
};
walk(ROOT, (n, d, parent) => { n._depth = d; n._parent = parent; });
(ROOT.children || []).forEach((b, i) => walk(b, (n) => { n._branch = i; }));

const byId = {};
walk(ROOT, (n) => { byId[n.id] = n; });

const kids = (n) => n.children || [];
const isLeafKind = (n) => ["point", "prompt", "field"].includes(n.kind);

/** Windows/macOS/Linux-safe note filename. */
const safeName = (s) =>
  s.replace(/:\s*/g, " - ")
   .replace(/[\\/:*?"<>|#^[\]]/g, " ")
   .replace(/\s+/g, " ")
   .trim()
   .slice(0, 90);

const assert = (cond, msg) => { if (!cond) { console.error("BUILD FAILED: " + msg); process.exit(1); } };

/* ------------------------------------------------------- 0. validate model */
{
  const seen = new Set();
  walk(ROOT, (n) => {
    assert(n.id, "every node needs an id");
    assert(!seen.has(n.id), `duplicate id: ${n.id}`);
    seen.add(n.id);
    assert(n.label && n.label.trim(), `node ${n.id} has no label`);
    assert(!/<\/script/i.test([n.label, n.note, n.mechanic].join(" ")), `node ${n.id} contains a script terminator`);
    if (n.time) assert(/^\d{2}:\d{2}$/.test(n.time), `node ${n.id} has a bad time: ${n.time}`);
  });
  const names = new Map();
  walk(ROOT, (n) => {
    if (isLeafKind(n) || n === ROOT) return;      // ROOT never becomes a note
    const f = safeName(n.label);
    assert(!names.has(f), `two notes would share the filename "${f}" (${names.get(f)} / ${n.id})`);
    names.set(f, n.id);
  });
  console.log(`model ok — ${seen.size} nodes`);
}

/* --------------------------------------------------------- 1. index.html */
{
  const tpl = readFileSync(p("tools", "template.html"), "utf8");
  assert(tpl.includes("/*__MODEL_JSON__*/"), "template.html lost its /*__MODEL_JSON__*/ marker");

  /* attribution is not optional — the page must credit both authors, visibly */
  assert(tpl.includes(META.sourceAuthor), "template.html must name " + META.sourceAuthor);
  assert(tpl.includes(META.mapAuthor), "template.html must name " + META.mapAuthor);
  assert(tpl.includes(META.mapUrl), "template.html must link " + META.mapUrl);

  /* the page must stay fully offline. <a href> is navigation and is fine; anything that
     LOADS a subresource must be inline or a data: URI. */
  const loaders = tpl.match(/<(?:script|link|img|iframe|source|video|audio|embed|object)\b[^>]*>/gi) || [];
  for (const tag of loaders) {
    const url = (tag.match(/\b(?:src|href|data)\s*=\s*"([^"]*)"/i) || [])[1];
    assert(!url || url.startsWith("data:") || url.startsWith("#"),
      `external subresource would break offline use: ${tag.slice(0, 90)}`);
  }
  assert(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|importScripts|@import|@font-face/.test(tpl),
    "template.html must not fetch anything at runtime");

  // strip build-only fields before embedding
  const clean = JSON.parse(JSON.stringify(model, (k, v) => (k.startsWith("_") ? undefined : v)));
  const json = JSON.stringify(clean).replace(/</g, "\\u003c");   // can never close the <script>
  assert(!/<\/script/i.test(json), "model would break out of the script tag");

  const html = tpl.replace("/*__MODEL_JSON__*/", () => json);
  writeFileSync(p("index.html"), html, "utf8");
  console.log(`index.html — ${(html.length / 1024).toFixed(1)} KB`);
}

/* ------------------------------------------------------- 2. Obsidian notes */
const NOTE_NODES = [];
walk(ROOT, (n) => { if (!isLeafKind(n) && n !== ROOT) NOTE_NODES.push(n); });

{
  const dir = p("vault");
  mkdirSync(dir, { recursive: true });
  // clear previously generated markdown so renames never leave orphans
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".md") || f.endsWith(".canvas")) unlinkSync(join(dir, f));
    }
  }

  const link = (n) => `[[${safeName(n.label)}]]`;
  const credit =
    `> Ideas from **${META.sourceWork}** by ${META.sourceAuthor}. ` +
    `Structure after the mind map by ${META.mapAuthor} — <${META.mapUrl}>.`;

  const bullet = (c) => {
    if (c.kind === "prompt") return `- [ ] ${c.time ? `**${c.time}** — ` : ""}${c.label}`;
    if (c.kind === "field")  return `- **${c.label}** — ${c.note || ""}${c.mechanic ? ` *(${c.mechanic})*` : ""}`;
    return `- **${c.label}**${c.note ? ` — ${c.note}` : ""}`;
  };

  for (const n of NOTE_NODES) {
    const out = [];
    out.push("---");
    out.push(`tags:`);
    out.push(`  - one-day-protocol`);
    out.push(`  - ${(n._parent && n._parent !== ROOT ? safeName(n._parent.label) : "top-level").toLowerCase().replace(/\s+/g, "-")}`);
    out.push("---");
    out.push("");
    out.push(`# ${n.label}`);
    if (n.note) out.push("", `*${n.note}*`);
    if (n._parent && n._parent !== ROOT) out.push("", `Part of ${link(n._parent)}.`);
    out.push("");

    const leaves = kids(n).filter(isLeafKind);
    const branches = kids(n).filter((c) => !isLeafKind(c));

    if (leaves.length) {
      out.push(...leaves.map(bullet));
      out.push("");
    }
    if (branches.length) {
      out.push("## Sections", "");
      out.push(...branches.map((c) => `- ${link(c)}${c.note ? ` — ${c.note}` : ""}`));
      out.push("");
    }
    out.push("---", credit);
    writeFileSync(join(dir, `${safeName(n.label)}.md`), out.join("\n") + "\n", "utf8");
  }

  /* START HERE */
  const start = [
    "---", "tags:", "  - one-day-protocol", "---", "",
    `# ${META.title}`, "",
    `*${META.subtitle}*`, "",
    "**New here? Do this:**", "",
    "1. Open **[[Workbook]]** and block out one full day.",
    "2. Open **One-Day Protocol.canvas** (in this same folder) to see the whole model at once.",
    "3. Press `Ctrl/Cmd + G` for graph view — every note below is linked.", "",
    "## The five branches", "",
    ...kids(ROOT).map((b) => `- [[${safeName(b.label)}]]`),
    "",
    "## Reference", "",
    "- **Canvas mind map:** `One-Day Protocol.canvas`",
    "- **Fill-in worksheet:** [[Workbook]]",
    "",
    `> [!warning] Not advice`,
    `> ${META.disclaimer}`,
    "", "---", credit,
  ];
  writeFileSync(join(dir, "00 START HERE.md"), start.join("\n") + "\n", "utf8");

  /* Workbook */
  const wb = ["---", "tags:", "  - one-day-protocol", "  - workbook", "---", "",
    "# Workbook", "",
    "Answer underneath each question. Nothing here leaves your machine.", ""];

  const renderPart = (part, level) => {
    wb.push("#".repeat(level) + " " + part.label);
    if (part.note) wb.push("", `*${part.note}*`);
    wb.push("");
    for (const g of kids(part)) {
      if (isLeafKind(g)) continue;
      wb.push("#".repeat(level + 1) + " " + g.label, "");
      for (const q of kids(g)) {
        wb.push(`**${q.time ? q.time + " — " : ""}${q.label}**`);
        if (q.note) wb.push("", `*${q.note}*`);
        wb.push("", "> ", "");
      }
    }
  };
  renderPart(byId["part1"], 2);
  renderPart(byId["part2"], 2);
  renderPart(byId["part3"], 2);

  wb.push("## Six components to document", "",
    "This is the deliverable. Keep it where you will actually see it.", "");
  for (const f of kids(byId["six-components"])) {
    wb.push(`### ${f.label}`, "", `*${f.note}* — ${f.mechanic}`, "", "> ", "");
  }
  wb.push("---", credit);
  writeFileSync(join(dir, "Workbook.md"), wb.join("\n") + "\n", "utf8");

  console.log(`vault — ${NOTE_NODES.length + 2} notes`);
}

/* ------------------------------------------------------- 3. Obsidian canvas */
{
  const W = [300, 250, 270, 320, 360];
  const CANVAS_COLOR = ["6", "5", "4", "2", "3"];   // purple, cyan, green, orange, yellow
  const width = (d) => W[Math.min(d, W.length - 1)];

  const estHeight = (n) => {
    const w = width(n._depth) - 24;
    const text = n.label + (n.note ? " " + n.note : "");
    const lines = Math.max(1, Math.ceil((text.length * 7.1) / w));
    return Math.max(56, lines * 21 + 30);
  };

  walk(ROOT, (n) => { n._w = width(n._depth); n._h = estHeight(n); });

  const colX = [];
  const maxAt = [];
  walk(ROOT, (n) => { maxAt[n._depth] = Math.max(maxAt[n._depth] || 0, n._w); });
  colX[0] = 0;
  for (let d = 1; d < maxAt.length; d++) colX[d] = colX[d - 1] + maxAt[d - 1] + 110;

  let cursor = 0;
  const shift = (n, dy) => kids(n).forEach((k) => { k._y += dy; shift(k, dy); });
  const place = (n) => {
    n._x = colX[n._depth];
    if (!kids(n).length) { n._y = cursor; cursor += n._h + 26; return; }
    const start = cursor;
    kids(n).forEach(place);
    const first = kids(n)[0], last = kids(n)[kids(n).length - 1];
    let mid = (first._y + (last._y + last._h)) / 2 - n._h / 2;
    if (mid < start) { const dy = start - mid; shift(n, dy); mid += dy; cursor += dy; }
    n._y = mid;
    cursor = Math.max(cursor, n._y + n._h + 26);
  };
  place(ROOT);

  const nodes = [], edges = [];
  walk(ROOT, (n) => {
    const color = n._branch === undefined ? undefined : CANVAS_COLOR[n._branch % CANVAS_COLOR.length];
    let text;
    if (n === ROOT) {
      text = `# ${META.title}\n\n${META.subtitle}\n\nIdeas: ${META.sourceAuthor} · Map: ${META.mapAuthor}`;
    } else if (isLeafKind(n)) {
      text = `${n.time ? "`" + n.time + "` " : ""}${n.label}${n.note ? `\n\n${n.note}` : ""}`;
    } else {
      text = `**${n.label}**${n.note ? `\n\n${n.note}` : ""}`;
    }
    const node = { id: n.id, type: "text", text, x: Math.round(n._x), y: Math.round(n._y), width: n._w, height: n._h };
    if (color) node.color = color;
    nodes.push(node);
    if (n._parent) {
      const e = { id: `e-${n._parent.id}-${n.id}`, fromNode: n._parent.id, fromSide: "right", toNode: n.id, toSide: "left" };
      if (color) e.color = color;
      edges.push(e);
    }
  });

  writeFileSync(p("vault", "One-Day Protocol.canvas"), JSON.stringify({ nodes, edges }, null, 1) + "\n", "utf8");
  console.log(`canvas — ${nodes.length} nodes, ${edges.length} edges`);
}

/* ---------------------------------------------------- 4. verify the output */
{
  const dir = p("vault");
  const files = readdirSync(dir);
  const notes = new Set(files.filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")));

  let links = 0;
  for (const f of files.filter((f) => f.endsWith(".md"))) {
    const body = readFileSync(join(dir, f), "utf8");
    for (const m of body.matchAll(/\[\[([^\]|#]+)/g)) {
      links++;
      assert(notes.has(m[1].trim()), `broken wikilink [[${m[1].trim()}]] in ${f}`);
    }
  }

  const canvas = JSON.parse(readFileSync(join(dir, "One-Day Protocol.canvas"), "utf8"));
  const ids = new Set(canvas.nodes.map((n) => n.id));
  assert(ids.size === canvas.nodes.length, "canvas has duplicate node ids");
  for (const n of canvas.nodes) {
    assert(["x", "y", "width", "height"].every((k) => Number.isFinite(n[k])), `canvas node ${n.id} has bad geometry`);
    assert(n.width > 0 && n.height > 0, `canvas node ${n.id} has no size`);
    assert(n.type === "text" && typeof n.text === "string" && n.text.length, `canvas node ${n.id} has no text`);
  }
  for (const e of canvas.edges) {
    assert(ids.has(e.fromNode) && ids.has(e.toNode), `canvas edge ${e.id} points at a missing node`);
  }

  const html = readFileSync(p("index.html"), "utf8");
  assert(html.includes('id="model"'), "index.html lost its embedded model");
  assert(!html.includes("/*__MODEL_JSON__*/"), "index.html still has the unreplaced marker");

  console.log(`verified — ${links} wikilinks, ${canvas.nodes.length} canvas nodes, all resolve`);
}

console.log("build complete");
