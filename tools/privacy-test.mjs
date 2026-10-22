#!/usr/bin/env node
/* Real Edge/Chrome + local HTTP fixture tests. No dependencies or remote product traffic. */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sckb = existsSync(join(root, "runtime.js"));
const id = sckb ? "sckb" : "one-day-protocol";
const key = name => `${id}/privacy/${name}/v1`;
const essential = sckb ? "sckb-runtime-v1" : "one-day-protocol/v1";
const executable = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/chromium"].find(existsSync);
assert(executable, "Edge or Chrome required");
const scratch = mkdtempSync(join(tmpdir(), `${id}-privacy-`));
const downloads = join(scratch, "downloads");
const { mkdirSync } = await import("node:fs");
mkdirSync(downloads);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const requests = [];
const server = createServer((req, res) => {
  requests.push(req.url);
  let file;
  try { file = resolve(root, "." + decodeURIComponent(new URL(req.url, "http://local").pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (file === root) file = join(root, "index.html");
  if (!file.startsWith(root + sep) || !["GET", "HEAD"].includes(req.method)) { res.writeHead(403).end(); return; }
  try {
    const body = readFileSync(file);
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" })[extname(file)] || "application/octet-stream");
    res.end(req.method === "HEAD" ? undefined : body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const port = 9600 + process.pid % 300;
const proc = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions", "--disable-background-networking", `--user-data-dir=${join(scratch, "profile")}`, `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore", windowsHide: true });
let browserUrl;
for (let i = 0; i < 100; i++) {
  try { browserUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; if (browserUrl) break; } catch {}
  await sleep(100);
}
assert(browserUrl, "browser started");
const sockets = [];
async function connect(url) {
  const ws = new WebSocket(url); sockets.push(ws);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0;
  const pending = new Map(), events = [];
  ws.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.id) { const p = pending.get(m.id); if (p) { clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } }
    else events.push(m);
  };
  return { events, send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const n = ++seq;
      const timer = setTimeout(() => { pending.delete(n); reject(new Error(method + " timeout")); }, 15000);
      pending.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params }));
    });
  } };
}
const browser = await connect(browserUrl);
await browser.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
async function page(init = "", path = "") {
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const p = await connect(targets.find(x => x.id === targetId).webSocketDebuggerUrl);
  p.targetId = targetId;
  p.eval = async expression => {
    const result = await p.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  p.click = async selector => {
    const r = await p.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('missing control');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await p.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...r });
    await p.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...r });
  };
  await p.send("Page.enable"); await p.send("Runtime.enable"); await p.send("Network.enable");
  if (init) await p.send("Page.addScriptToEvaluateOnNewDocument", { source: init });
  await p.send("Page.navigate", { url: base + path });
  await ready(p);
  return p;
}
async function ready(p) {
  for (let i = 0; i < 100; i++) { if (await p.eval("!!document.getElementById('privacy-dialog')")) return; await sleep(50); }
  throw new Error("privacy UI did not initialize: " + JSON.stringify(p.events.filter(e => e.method === "Runtime.exceptionThrown")));
}
async function close(p) { if (await p.eval("document.getElementById('privacy-dialog').open")) await p.click("#privacy-close"); }
async function open(p) { if (!await p.eval("document.getElementById('privacy-dialog').open")) await p.click("#privacy-open"); }
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log("PASS " + name); }
let failure;
try {
  const p = await page();
  await check("default off; equally visible choices; institutional facts", async () => {
    assert.equal(await p.eval(`localStorage.getItem(${JSON.stringify(key("usage"))})`), null);
    assert.equal(await p.eval("document.getElementById('privacy-usage').checked"), false);
    assert(await p.eval("['accept','reject','configure'].every(x=>{const r=document.getElementById('privacy-'+x).getBoundingClientRect();return r.width>100&&r.height>30})"));
    assert(await p.eval("document.getElementById('privacy-dialog').textContent.includes('Juan Sebastián Elcano 240') && document.querySelector('a[href=\"mailto:aekr@aekr.io\"]')!==null"));
  });
  await p.click("#privacy-reject"); await close(p);
  await check("rejection retains real product functions and essential data", async () => {
    if (sckb) await p.click("#runtime-reset");
    else { await p.click("#tab-work"); await p.click("#workBody textarea"); await p.send("Input.insertText", { text: "SYNTHETIC local workbook fixture" }); await sleep(350); }
    assert.notEqual(await p.eval(`localStorage.getItem(${JSON.stringify(essential)})`), null);
    assert.equal(await p.eval(`localStorage.getItem(${JSON.stringify(key("usage"))})`), null);
  });
  await open(p);
  await check("independent structured research after usage rejection; required explicit confirmation", async () => {
    await p.click("#privacy-research-save");
    assert.equal(await p.eval(`localStorage.getItem(${JSON.stringify(key("research"))})`), null);
    await p.click("#privacy-research select");
    await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 });
    await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 });
    await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await p.click("#privacy-research-consent"); await p.click("#privacy-research-save");
    const rows = await p.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(key("research"))}))`);
    assert.equal(rows.length, 1); assert.equal(rows[0].purpose, "local-product-research");
    assert.notEqual(Object.values(rows[0].answers)[0], "unspecified");
    assert(!JSON.stringify(rows).includes("SYNTHETIC local workbook"));
  });
  await check("functional local JSON download with exact own product records and exclusions", async () => {
    await p.click("#privacy-download");
    for (let i = 0; i < 50 && !readdirSync(downloads).some(f => f.endsWith(".json")); i++) await sleep(100);
    const data = JSON.parse(readFileSync(join(downloads, readdirSync(downloads).find(f => f.endsWith(".json"))), "utf8"));
    assert.equal(data.manifest.productId, id); assert.equal(data.privacyChoice.usage, false); assert.equal(data.research.length, 1);
    assert(data.manifest.exclusions.some(x => x.includes("hosting-provider")));
    if (sckb) assert.equal(data.productData.runtime.completed, 0);
    else assert(Object.values(data.productData.answers).includes("SYNTHETIC local workbook fixture"));
  });
  await check("research-only download excludes workbook, progress and usage", async () => {
    await p.click("#privacy-research-download");
    const name = id + "-research-local.json";
    for (let i = 0; i < 50 && !existsSync(join(downloads, name)); i++) await sleep(100);
    const data = JSON.parse(readFileSync(join(downloads, name), "utf8"));
    assert.deepEqual(Object.keys(data).sort(), ["manifest", "research"]);
    assert.equal(data.research.length, 1);
    assert(!JSON.stringify(data).includes("SYNTHETIC local workbook"));
  });
  await p.click("#privacy-accept"); await close(p);
  await check("explicit opt-in creates bounded coarse local counts only", async () => {
    await p.click(sckb ? "#runtime-reset" : "#tab-board");
    const rows = await p.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(key("usage"))}))`);
    assert.equal(rows.length, 1); assert.equal(rows[0].count, 1);
    assert.deepEqual(Object.keys(rows[0]).sort(), ["count", "day", "feature"]);
  });
  const q = await page(); await close(q);
  await open(p); await p.click("#privacy-withdraw");
  await check("withdrawal propagates to concurrent tabs and deletes optional data", async () => {
    await sleep(100); await q.click(sckb ? "#runtime-reset" : "#tab-work");
    assert.equal(await q.eval(`localStorage.getItem(${JSON.stringify(key("usage"))})`), null);
    assert.equal(await q.eval(`localStorage.getItem(${JSON.stringify(key("research"))})`), null);
    assert.notEqual(await q.eval(`localStorage.getItem(${JSON.stringify(essential)})`), null);
  });
  await check("GPC blocks opt-in and persists withdrawal after signal disappears", async () => {
    await p.click("#privacy-accept");
    const g = await page("Object.defineProperty(navigator,'globalPrivacyControl',{value:true});");
    await open(g);
    assert.equal(await g.eval("document.getElementById('privacy-accept').disabled"), true);
    assert.equal(await g.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(key("choice"))})).usage`), false);
    await close(g); await q.click(sckb ? "#runtime-reset" : "#tab-board");
    assert.equal(await q.eval(`localStorage.getItem(${JSON.stringify(key("usage"))})`), null);
    const dnt = await page("Object.defineProperty(navigator,'doNotTrack',{value:'1'});");
    await open(dnt); assert.equal(await dnt.eval("document.getElementById('privacy-accept').disabled"), true);
  });
  await check("expiry and malformed optional storage fail closed", async () => {
    await q.eval(`localStorage.setItem(${JSON.stringify(key("choice"))},JSON.stringify({notice:'old',product:${JSON.stringify(id)},usage:true}));localStorage.setItem(${JSON.stringify(key("usage"))},'[{}]');localStorage.setItem(${JSON.stringify(key("research"))},JSON.stringify([{notice:'2026-10-22.1',at:1,answers:{}}]));`);
    const r = await page();
    assert.equal(await r.eval(`localStorage.getItem(${JSON.stringify(key("usage"))})`), null);
    assert.equal(await r.eval(`localStorage.getItem(${JSON.stringify(key("research"))})`), null);
    assert.equal(await r.eval("document.getElementById('privacy-usage').checked"), false);
  });
  await check("essential inactivity expiry clears actual product data", async () => {
    await q.eval(`localStorage.setItem(${JSON.stringify(key("retention"))},JSON.stringify({days:7,changedAt:Date.now()-8*86400000}));`);
    const r = await page();
    assert.equal(await r.eval(`localStorage.getItem(${JSON.stringify(essential)})`), null);
    if (!sckb) assert.equal(await r.eval("Object.keys(__ODP__.answers()).length"), 0);
  });
  await check("blocked storage preserves product input and download controls; optional off", async () => {
    const b = await page("for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=function(){throw new DOMException('fixture blocked','SecurityError')};");
    await b.click("#privacy-accept");
    assert.equal(await b.eval("document.getElementById('privacy-usage').checked"), false);
    assert(await b.eval("document.getElementById('privacy-status').textContent.includes('no disponible') || document.getElementById('privacy-status').textContent.includes('unavailable')"));
    await close(b);
    if (sckb) { await b.click("#runtime-reset"); assert(await b.eval("document.getElementById('runtime-stage').textContent.length>20")); }
    else { await b.click("#tab-work"); await b.click("#workBody textarea"); await b.send("Input.insertText", { text: "UNSAVED synthetic fixture" }); assert(Object.values(await b.eval("__ODP__.answers()")).includes("UNSAVED synthetic fixture")); }
    await open(b); assert(await b.eval("!document.getElementById('privacy-download').disabled"));
    const blockedDownloads = join(downloads, "blocked"); mkdirSync(blockedDownloads);
    await browser.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: blockedDownloads });
    await b.click("#privacy-download");
    for (let i = 0; i < 50 && !existsSync(join(blockedDownloads, id + "-local-data.json")); i++) await sleep(100);
    const data = JSON.parse(readFileSync(join(blockedDownloads, id + "-local-data.json"), "utf8"));
    assert.equal(data.privacyChoice, null);
    if (!sckb) assert(Object.values(data.productData.answers).includes("UNSAVED synthetic fixture"));
  });
  await check("product parser rejects malformed data without executing text", async () => {
    await q.eval(`localStorage.setItem(${JSON.stringify(essential)},${JSON.stringify(sckb ? '{"version":1,"completed":999999,"viewIndex":-1}' : '{"av1":123,"unknown":"<img src=x onerror=alert(1)>","__proto__":{"polluted":true}}')});`);
    const r = await page(); await close(r);
    if (sckb) assert.equal(await r.eval("document.getElementById('runtime-progress').getAttribute('aria-valuenow')"), "0");
    else { assert.equal(await r.eval("Object.keys(__ODP__.answers()).length"), 0); assert.equal(await r.eval("({}).polluted"), undefined); }
  });
  if (!sckb) await check("cross-tab erasure cancels an unsaved workbook write", async () => {
    const a = await page(); await close(a); await a.click("#tab-work"); await a.click("#workBody textarea");
    await a.send("Input.insertText", { text: "SYNTHETIC pending write" });
    await q.eval(`localStorage.removeItem(${JSON.stringify(essential)})`);
    await sleep(400);
    assert.equal(await a.eval("Object.keys(__ODP__.answers()).length"), 0);
    assert.equal(await a.eval(`localStorage.getItem(${JSON.stringify(essential)})`), null);
  });
  await check("no app egress; CSP denies network and embedded active resources", async () => {
    assert(p.events.filter(e => e.method === "Network.requestWillBeSent").every(e => e.params.request.url.startsWith(base) || e.params.request.url.startsWith("blob:") || e.params.request.url.startsWith("data:")));
    assert(await p.eval("document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]').content.includes(\"connect-src 'none'\")"));
    assert.equal(p.events.filter(e => e.method === "Runtime.exceptionThrown").length, 0);
    assert.equal(await p.eval(`window.fetch(${JSON.stringify(base + "blocked-by-csp")}).then(()=>false,()=>true)`), true);
    assert(!requests.includes("/blocked-by-csp"));
  });
  await check("mobile privacy dialog fits, keyboard Escape restores entry focus", async () => {
    await p.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await close(p); await open(p);
    assert(await p.eval("(()=>{const d=document.getElementById('privacy-dialog');return d.scrollWidth<=d.clientWidth+1 && d.getBoundingClientRect().width<=window.innerWidth})()"));
    await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    assert.equal(await p.eval("document.getElementById('privacy-dialog').open"), false);
    assert.equal(await p.eval("document.activeElement.id"), "privacy-open");
  });
  if (sckb) await check("Spanish and English controls and simulation render", async () => {
    const en = await page("", "?lang=en"); await open(en);
    assert.equal(await en.eval("document.getElementById('privacy-title').textContent"), "Privacy and data");
    await close(en); assert(await en.eval("document.getElementById('runtime-stage').textContent.includes('') && document.documentElement.lang==='en'"));
  });
} catch (error) { failure = error; console.error(error.stack); }
finally {
  try { await browser.send("Browser.close"); } catch {}
  sockets.forEach(ws => ws.close()); proc.kill(); server.close(); await sleep(350);
  // Only the absolute mkdtemp directory created above is removed; never product data.
  if (scratch.startsWith(tmpdir() + sep)) try { rmSync(scratch, { recursive: true, force: true }); } catch {}
}
console.log(`${failure ? "FAIL" : "PASS"} ${checks.length} ${id} browser/privacy checks`);
process.exitCode = failure ? 1 : 0;
