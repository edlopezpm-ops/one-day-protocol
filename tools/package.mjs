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
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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


Guides, Obsidian version, source   ${REPO}
Built with AEKR                    https://aekr.io
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

Built with AEKR - https://aekr.io
`.replace(/\n/g, "\r\n"), "utf8");

console.log("staged dist/One-Day-Protocol  (app + licences + README.txt)");
console.log("staged dist/Obsidian-Vault    (notes + canvas)");
