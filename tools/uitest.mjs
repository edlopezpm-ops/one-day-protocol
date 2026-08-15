#!/usr/bin/env node
/**
 * uitest.mjs — drives the real UI with real browser input.
 *
 *   node tools/uitest.mjs                       # tests the built app
 *   node tools/uitest.mjs "path/to/other.html"  # tests any copy
 *
 * The #selftest suite inside the page calls functions directly, so it proves the
 * logic works. It cannot prove that a human clicking the thing gets a result:
 * synthetic events dispatched from page script skip hit-testing and pointer
 * capture entirely. This drives Chrome DevTools Protocol instead, so the clicks
 * go through the same path a mouse does.
 *
 * Needs Edge or Chrome installed. No npm dependencies.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(process.argv[2] || join(ROOT_DIR, "One Day Protocol.html"));
if (!existsSync(target)) { console.error(`no such file: ${target}`); process.exit(1); }

const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const browser = BROWSERS.find(existsSync);
if (!browser) { console.error("no Edge or Chrome found"); process.exit(1); }

const PORT = 9411 + (process.pid % 200);
const profile = mkdtempSync(join(tmpdir(), "odp-uitest-"));
const proc = spawn(browser, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  "--disable-extensions", "--disable-background-networking",
  `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`,
  "--window-size=1440,900", pathToFileURL(target).href,
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------ CDP plumbing */
async function findPage() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const page = (await res.json()).find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* browser still starting */ }
    await sleep(100);
  }
  throw new Error("browser never exposed a debug target");
}

let ws, nextId = 1;
const pending = new Map();
function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    setTimeout(() => pending.has(id) && (pending.delete(id), rej(new Error(`${method} timed out`))), 15000);
  });
}
async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(`page threw: ${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description || ""}`);
  return r.result.value;
}

/* The probe reads the DOM only — no app-internal test hooks — so this harness can
   be pointed at any build, including older ones, to confirm what was broken. */
const PROBE = `window.__T__ = {
  nodes: function(){ return [].slice.call(document.querySelectorAll("#nodes .node")); },
  scroller: function(){ return document.getElementById("canvas") || document.getElementById("mapView"); },
  scale: function(){
    var t = getComputedStyle(document.getElementById("stage")).transform;
    if(!t || t === "none") return 1;
    var m = t.match(/matrix\\(([^,]+),/);
    return m ? parseFloat(m[1]) : 1;
  },
  visible: function(){
    return __T__.nodes().filter(function(el){ return el.getClientRects().length > 0; })
                        .map(function(el){ return el.dataset.id; });
  },
  open: function(){
    return __T__.nodes().filter(function(el){ return el.getAttribute("aria-expanded") === "true"; })
                        .map(function(el){ return el.dataset.id; });
  },
  state: function(){
    var s = __T__.scroller();
    return { visible: __T__.visible(), open: __T__.open(), scale: __T__.scale(),
             links: document.querySelectorAll("#links path").length,
             scrollTop: s ? s.scrollTop : 0, scrollLeft: s ? s.scrollLeft : 0,
             tab: (document.querySelector('[role=tab][aria-selected="true"]') || {}).id }; },
  rect: function(sel){
    var el = document.querySelector(sel);
    if(!el) return null;
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height, left: r.left, top: r.top };
  },
  nodeRect: function(id){ return __T__.rect('#nodes .node[data-id="' + id + '"]'); },
  nodeText: function(id){
    var el = document.querySelector('#nodes .node[data-id="' + id + '"]');
    return el ? el.textContent : null;
  }
}; true;`;

/* real mouse input: hit-tested by the browser, honours pointer capture */
async function clickAt(x, y) {
  const base = { x: Math.round(x), y: Math.round(y), button: "left", clickCount: 1 };
  await send("Input.dispatchMouseEvent", { ...base, type: "mouseMoved", buttons: 0 });
  await send("Input.dispatchMouseEvent", { ...base, type: "mousePressed", buttons: 1 });
  await send("Input.dispatchMouseEvent", { ...base, type: "mouseReleased", buttons: 0 });
  await sleep(90);
}
async function clickSel(sel) {
  const r = await evaluate(`JSON.stringify(__T__.rect(${JSON.stringify(sel)}))`);
  if (!r) throw new Error(`no element for ${sel}`);
  const { x, y } = JSON.parse(r);
  await clickAt(x, y);
}
async function clickNode(id) {
  const r = await evaluate(`JSON.stringify(__T__.nodeRect(${JSON.stringify(id)}))`);
  if (!r) throw new Error(`no node ${id}`);
  const b = JSON.parse(r);
  await clickAt(b.x - b.w / 2 + 12, b.y - b.h / 2 + 10);   /* near the label, not the middle */
}
async function drag(x1, y1, x2, y2) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved",    x: x1, y: y1, buttons: 0, button: "none" });
  await send("Input.dispatchMouseEvent", { type: "mousePressed",  x: x1, y: y1, buttons: 1, button: "left", clickCount: 1 });
  for (let i = 1; i <= 5; i++) {
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved", buttons: 1, button: "left",
      x: Math.round(x1 + (x2 - x1) * i / 5), y: Math.round(y1 + (y2 - y1) * i / 5),
    });
  }
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x2, y: y2, buttons: 0, button: "left", clickCount: 1 });
  await sleep(90);
}
async function wheel(x, y, dy) {
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY: dy, buttons: 0 });
  await sleep(90);
}
const state = () => evaluate("JSON.stringify(__T__.state())").then(JSON.parse);

/* ------------------------------------------------------------------- suite */
const fails = [];
let checks = 0;
function ok(cond, name) {
  checks++;
  if (!cond) fails.push(name);
  console.log(`${cond ? "  ok  " : "  FAIL"}  ${name}`);
}

async function run() {
  ws = new WebSocket(await findPage());
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  };
  await send("Runtime.enable");

  for (let i = 0; i < 60; i++) {
    if (await evaluate('document.documentElement.getAttribute("data-ready") === "1"')) break;
    await sleep(150);
  }
  ok(await evaluate('document.documentElement.getAttribute("data-ready") === "1"'), "page reaches ready state");
  ok(!(await evaluate('document.documentElement.hasAttribute("data-boot-error")')), "no boot error");
  await evaluate(PROBE);

  const model = await evaluate("__ODP__.model.root.children.length");

  /* --- the map opens by clicking --- */
  await clickSel('.maptools [data-map="collapse"]');
  let s = await state();
  ok(s.visible.length === 1, "Contract all button leaves one node visible");
  ok(s.scale === 1, "Contract all resets the scale");

  await clickNode("root");
  s = await state();
  ok(s.open.includes("root"), "clicking the root card opens it");
  ok(s.visible.length === 1 + model, `clicking the root reveals its ${model} branches`);
  ok(s.links === model, "one link drawn per branch");

  await clickNode("core-problem");
  s = await state();
  ok(s.open.includes("core-problem"), "clicking a branch opens it");
  ok(s.visible.includes("cp-action-layer"), "the branch's children appear");

  await clickNode("insights");
  s = await state();
  ok(s.open.includes("insights") && s.open.includes("core-problem"),
     "opening a second branch leaves the first one open");

  await clickNode("cp-not-an-accident");
  s = await state();
  ok(s.open.includes("cp-not-an-accident"), "clicking an end point opens it");
  const txt = await evaluate('__T__.nodeText("cp-not-an-accident")');
  ok(txt && txt.includes("keep buying it back"), "the end point shows its summary");

  await clickNode("cp-not-an-accident");
  s = await state();
  ok(!s.open.includes("cp-not-an-accident"), "clicking it again closes it");

  /* --- toolbar --- */
  await clickSel('.maptools [data-map="expand"]');
  s = await state();
  const total = await evaluate("(function(){var c=0;(function w(n){c++;(n.children||[]).forEach(w)})(__ODP__.model.root);return c})()");
  ok(s.visible.length === total, `Expand all shows all ${total} nodes`);
  ok(s.scale > 0 && s.scale <= 1, "Expand all leaves a sane scale");

  await clickSel('.maptools [data-map="fit"]');
  s = await state();
  ok(s.scale > 0 && s.scale <= 1 && isFinite(s.scale), "Fit to screen produces a sane scale");

  await clickSel('.maptools [data-map="collapse"]');
  s = await state();
  ok(s.visible.length === 1, "Contract all works after expanding");

  /* --- the wheel must scroll, never zoom --- */
  await clickSel('.maptools [data-map="expand"]');
  const beforeWheel = await state();
  await wheel(700, 450, 300);
  const afterWheel = await state();
  ok(afterWheel.scale === beforeWheel.scale, "the mouse wheel does not change the zoom");
  ok(afterWheel.scrollTop >= beforeWheel.scrollTop, "the mouse wheel scrolls the map");
  ok(!(await evaluate('!!document.querySelector("[data-map=zoomin]")')), "no zoom buttons in the toolbar");

  /* --- dragging pans, and must not be mistaken for a click --- */
  await clickSel('.maptools [data-map="collapse"]');
  await clickNode("root");
  const beforeDrag = await state();
  await drag(900, 500, 700, 380);
  const afterDrag = await state();
  ok(afterDrag.open.length === beforeDrag.open.length, "dragging does not accidentally open a node");

  /* --- the other two tabs --- */
  await clickSel("#tab-work");
  ok((await state()).tab === "tab-work", "the Workbook tab opens");
  await evaluate(`(function(){var t=document.getElementById("f_c-vision");
    t.value="a life I would not need a holiday from";
    t.dispatchEvent(new Event("input",{bubbles:true}));return true})()`);
  await clickSel("#tab-board");
  ok((await state()).tab === "tab-board", "the Game board tab opens");
  ok(await evaluate('document.getElementById("cards").textContent.includes("a life I would not need a holiday from")'),
     "an answer typed in the Workbook reaches the Game board");
  ok(await evaluate('document.querySelectorAll("#run .runrow").length === 3'), "the board shows three horizons");
  ok(await evaluate('!!document.querySelector(\'.built a[href="https://aekr.io"]\')'),
     "the AEKR footer links to aekr.io");
  ok(await evaluate('!!document.querySelector(\'.built a[href*="instagram.com/__aerk"]\')'),
     "the AEKR footer links to Instagram");
  ok(await evaluate('(function(){var r=__T__.rect(".built");return r && r.left>0 && r.top>0})()'),
     "the AEKR footer is on screen");

  await clickSel("#tab-map");
  ok((await state()).tab === "tab-map", "the Map tab opens again");

  /* --- Expand all must stay readable: fitting both axes gives 3px text --- */
  await clickSel('.maptools [data-map="expand"]');
  const expanded = await state();
  ok(expanded.scale >= 0.5, `Expand all keeps text readable (scale ${expanded.scale.toFixed(2)})`);
  const px = await evaluate(
    '(function(){var el=document.querySelector("#nodes .node");' +
    'return parseFloat(getComputedStyle(el).fontSize) * __T__.scale()})()');
  ok(px >= 6, `rendered label text is at least 6px (got ${px.toFixed(1)}px)`);

  /* --- the mechanics table must not keep stale colours across a theme flip --- */
  await clickSel("#tab-board");
  const themeBtn = "#themeBtn";
  const before1 = await evaluate('getComputedStyle(document.querySelector("#mechanics td.c1")).color');
  await clickSel(themeBtn);
  await sleep(150);
  const after1 = await evaluate('getComputedStyle(document.querySelector("#mechanics td.c1")).color');
  ok(before1 !== after1, "the mechanics table repaints when the theme changes");
  await clickSel("#paletteBtn");
  await sleep(150);
  const after2 = await evaluate('getComputedStyle(document.querySelector("#mechanics td.c1")).color');
  ok(after1 !== after2, "the mechanics table repaints when the palette changes");
  await clickSel(themeBtn); await clickSel("#paletteBtn");
  await clickSel("#tab-map");

  /* --- small text must clear WCAG AA (4.5:1) in both themes --- */
  const CONTRAST = `(function(){
    function lum(c){var m=c.match(/[0-9.]+/g).map(Number);
      var f=m.slice(0,3).map(function(v){v/=255;
        return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
      return 0.2126*f[0]+0.7152*f[1]+0.0722*f[2];}
    function bg(el){while(el){var b=getComputedStyle(el).backgroundColor;
      if(b&&b!=="rgba(0, 0, 0, 0)"&&b!=="transparent")return b;el=el.parentElement;}
      return "rgb(255, 255, 255)";}
    var sels=[".stake .k",".card .desc",".card .val.empty",".runrow .t small",
              ".doc th","#mechanics td.c1",".doc p.sub",".hint",".built a"];
    var worst=99, who="";
    sels.forEach(function(s){var el=document.querySelector(s); if(!el) return;
      var a=lum(getComputedStyle(el).color), b=lum(bg(el));
      var r=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
      if(r<worst){worst=r;who=s;}});
    return who+" "+worst.toFixed(2);
  })()`;
  for (const theme of ["light", "dark"]) {
    await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    await clickSel("#tab-board");
    await sleep(120);
    const res = await evaluate(CONTRAST);
    const worst = parseFloat(String(res).split(" ").pop());
    ok(worst >= 4.5, `${theme} theme: worst small-text contrast is ${res} (needs 4.5)`);
  }
  await clickSel("#tab-map");

  /* --- printing must not silently truncate a long answer --- */
  const longAnswer = "PARA ".repeat(220).trim();
  await evaluate(`(function(){var t=document.getElementById("f_av1");
    t.value=${JSON.stringify(longAnswer)};
    t.dispatchEvent(new Event("input",{bubbles:true}));return true})()`);
  await send("Emulation.setEmulatedMedia", { media: "print" });
  await evaluate('window.dispatchEvent(new Event("beforeprint"))');
  await sleep(150);
  const printed = await evaluate(
    '(function(){var el=document.getElementById("printout");' +
    'if(!el) return -1;' +
    'return el.scrollHeight <= el.clientHeight + 2 ? el.textContent.length : -2})()');
  ok(printed > longAnswer.length, "the printable copy contains the whole answer, unclipped");
  await send("Emulation.setEmulatedMedia", { media: "" });

  /* --- and the in-page suite still passes --- */
  const inner = await evaluate("__ODP__.selfTest().report.split('\\n')[0]");
  ok(String(inner).startsWith("PASS"), `in-page suite: ${inner}`);

  /* --- phone: nothing may push the page sideways --- */
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
  });
  await sleep(400);
  for (const [tab, name] of [["#tab-board", "Game board"], ["#tab-work", "Workbook"], ["#tab-map", "Map"]]) {
    await clickSel(tab);
    await sleep(200);
    const over = await evaluate(
      "JSON.stringify({doc:document.documentElement.scrollWidth, win:window.innerWidth})");
    const { doc, win } = JSON.parse(over);
    ok(doc <= win + 1, `at 390px the ${name} tab does not scroll sideways (${doc} vs ${win})`);
  }
  ok(await evaluate('(function(){var r=__T__.rect(".built");return r && r.left + r.w <= window.innerWidth + 1})()'),
     "at 390px the AEKR footer stays on screen");
  await clickSel('.maptools [data-map="expand"]');
  ok((await state()).visible.length > 1, "at 390px the map toolbar still works");

  /* nothing may sit on top of a toolbar button */
  for (const action of ["expand", "collapse", "fit"]) {
    const owns = await evaluate(
      `(function(){var b=document.querySelector('.maptools [data-map="${action}"]');` +
      `var r=b.getBoundingClientRect();` +
      `var el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);` +
      `return !!(el && b.contains(el))})()`);
    ok(owns, `at 390px nothing covers the ${action} button`);
  }

  /* a touch tap after a mouse drag must still open a node */
  await clickSel('.maptools [data-map="collapse"]');
  await drag(200, 400, 300, 500);
  const rootBox = JSON.parse(await evaluate('JSON.stringify(__T__.nodeRect("root"))'));
  await send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: [{ x: Math.round(rootBox.x), y: Math.round(rootBox.y) }],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(200);
  ok((await state()).visible.length > 1, "a touch tap still works after a mouse drag");

  await send("Emulation.clearDeviceMetricsOverride");
}

let code = 0;
try {
  await run();
} catch (err) {
  console.error(`\nERROR: ${err.message}`);
  code = 1;
} finally {
  try { ws?.close(); } catch {}
  proc.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log(`\n${fails.length ? "FAIL" : "PASS"}  ${checks - fails.length}/${checks} UI checks`);
if (fails.length) fails.forEach((f) => console.log(`  - ${f}`));
process.exit(code || (fails.length ? 1 : 0));
