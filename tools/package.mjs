#!/usr/bin/env node
/**
 * package.mjs — stages the release bundles under dist/.
 *
 *   node tools/build.mjs && node tools/package.mjs
 *
 * Produces two staging folders, ready to zip:
 *
 *   dist/One-Day-Protocol/   the download. The app, the licences, and a plain-text
 *                            README. Nothing else — the HTML needs nothing else.
 *   dist/Obsidian-Vault/     optional extra for people who want it as notes.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => join(ROOT_DIR, ...s);
const APP_FILE = "One Day Protocol.html";
const REPO = "https://github.com/edlopezpm-ops/one-day-protocol";

const META = JSON.parse(readFileSync(p("data", "model.json"), "utf8")).meta;

rmSync(p("dist"), { recursive: true, force: true });

/* ------------------------------------------------------------ main bundle */
const app = p("dist", "One-Day-Protocol");
mkdirSync(app, { recursive: true });
cpSync(p(APP_FILE), join(app, APP_FILE));
cpSync(p("LICENSE"), join(app, "LICENSE"));
cpSync(p("LICENSE-CONTENT.md"), join(app, "LICENSE-CONTENT.md"));

const readme = `THE ONE-DAY PROTOCOL
${"=".repeat(20)}

${META.subtitle}.


START
-----
Double-click "${APP_FILE}". That is the whole install.
Blank page? Extract the folder out of the .zip first, then try again.


THE THREE TABS
--------------
MAP         Click the button in the middle, then keep clicking. Every
            node opens into a short explanation. Scroll to move around
            - the wheel never zooms. Expand all, Contract all and Fit
            to screen are at the bottom left.
WORKBOOK    Every question with a box to type in. Saves as you type.
GAME BOARD  Your answers laid out as a game.


YOUR ANSWERS
------------
They stay in your browser, on this computer. The page makes no internet
connections at all - nothing is uploaded, nothing is tracked.

Clearing your browser data erases them. Press "Export Markdown" before
you finish; that file is the copy that survives.


CHECKING THE FILE
-----------------
Add  #selftest  to the address bar and press Enter. You should see a
line starting with PASS. If it says FAIL, download it again.


CREDITS
-------
${META.sourceAuthor}      the original article and framework, thedankoe.com
${META.mapAuthor}  the mind-map summary this follows
             ${META.mapUrl}

An unaffiliated, non-commercial study aid containing neither the
original article nor the original images.

Code MIT (LICENSE). Text CC BY 4.0 (LICENSE-CONTENT.md).
${META.disclaimer}


Use it online                      https://edlopezpm-ops.github.io/one-day-protocol/
Guides, Obsidian version, source   ${REPO}
Built with AEKR                    https://aekr.io
                                   instagram.com/__aerk
`;
writeFileSync(join(app, "README.txt"), readme.replace(/\n/g, "\r\n"), "utf8");

/* ----------------------------------------------------------- vault bundle */
const vault = p("dist", "Obsidian-Vault");
mkdirSync(vault, { recursive: true });
cpSync(p("vault"), join(vault, "vault"), { recursive: true });
cpSync(p("LICENSE-CONTENT.md"), join(vault, "LICENSE-CONTENT.md"));
writeFileSync(join(vault, "README.txt"), `THE ONE-DAY PROTOCOL - OBSIDIAN VAULT
${"=".repeat(37)}

Optional. You do NOT need this to use the app - the main download runs
on its own.

HOW TO USE IT
-------------
1. Install Obsidian (free): https://obsidian.md
2. Open Obsidian -> "Open folder as vault".
3. Pick the "vault" folder inside this one. Pick "vault" itself.
4. Open "00 START HERE.md".
5. Open "One-Day Protocol.canvas" to see the mind map inside Obsidian.
6. Press Ctrl+G (Cmd+G on Mac) for the graph view.

No plugins, no account, no sync required.

CREDITS
-------
Ideas from "${META.sourceWork}" by ${META.sourceAuthor}.
Structure after the mind map by ${META.mapAuthor}: ${META.mapUrl}
An unaffiliated study aid. Text licensed CC BY 4.0, see LICENSE-CONTENT.md.

${META.disclaimer}

Built with AEKR - https://aekr.io - instagram.com/__aerk
`.replace(/\n/g, "\r\n"), "utf8");

/* ---------------------------------------------------------------- zipping --
 * Written here rather than shelled out to PowerShell: Compress-Archive writes
 * BACKSLASH path separators, which the zip spec forbids. Windows tolerates it;
 * macOS and Linux extract one file with a literal backslash in its name. A
 * download that only unpacks on one OS is not a download.
 */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const dosTime = (d) => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
const dosDate = (d) => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;

function listAll(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    const rel = relative(base, full).split("\\").join("/");   // forward slashes, always
    if (st.isDirectory()) { out.push({ rel: rel + "/", dir: true, mtime: st.mtime }); listAll(full, base, out); }
    else out.push({ rel, dir: false, mtime: st.mtime, data: readFileSync(full) });
  }
  return out;
}

function writeZip(srcDir, zipPath, prefix) {
  const entries = listAll(srcDir);
  const locals = [], central = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(prefix + "/" + e.rel, "utf8");
    const raw = e.dir ? Buffer.alloc(0) : e.data;
    const deflated = e.dir ? Buffer.alloc(0) : deflateRawSync(raw, { level: 9 });
    /* never let "compression" make a file bigger */
    const useStore = e.dir || deflated.length >= raw.length;
    const body = useStore ? raw : deflated;
    const method = useStore ? 0 : 8;
    const crc = e.dir ? 0 : crc32(raw);
    const t = dosTime(e.mtime), d = dosDate(e.mtime);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); // UTF-8 names
    lh.writeUInt16LE(method, 8); lh.writeUInt16LE(t, 10); lh.writeUInt16LE(d, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, body);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(t, 12); ch.writeUInt16LE(d, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(e.dir ? 0x10 : 0, 38);              // directory attribute
    ch.writeUInt32LE(offset, 42);
    central.push(ch, name);

    offset += lh.length + name.length + body.length;
  }

  const cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16);

  writeFileSync(zipPath, Buffer.concat([...locals, cd, eocd]));
  return entries.length;
}

const n1 = writeZip(app,   p("dist", "One-Day-Protocol.zip"), "One-Day-Protocol");
const n2 = writeZip(vault, p("dist", "Obsidian-Vault.zip"),   "Obsidian-Vault");

const kb = (f) => (statSync(p("dist", f)).size / 1024).toFixed(0) + " KB";
console.log(`One-Day-Protocol.zip  ${n1} entries, ${kb("One-Day-Protocol.zip")}  (app + licences + README.txt)`);
console.log(`Obsidian-Vault.zip    ${n2} entries, ${kb("Obsidian-Vault.zip")}  (notes + canvas)`);
