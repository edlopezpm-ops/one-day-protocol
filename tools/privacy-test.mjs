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
const { writeFileSync } = await import("node:fs");
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
async function page(init = "", path = "", browserContextId) {
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank", ...(browserContextId ? { browserContextId } : {}) });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const p = await connect(targets.find(x => x.id === targetId).webSocketDebuggerUrl);
  p.targetId = targetId;
  p.eval = async expression => {
    const result = await p.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  p.click = async selector => {
    await p.send("Page.bringToFront");
    const r = await p.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('missing control');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await p.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...r });
    await p.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...r });
    await p.eval("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
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
async function acknowledge(p) {
  if (await p.eval("!!window.AEKR_POLICY.current()")) return;
  await p.eval("window.AEKR_POLICY.ensure()");
  await p.click("#policy-terms-check"); await p.click("#policy-privacy-check"); await p.click("#policy-continue");
}
async function close(p) { if (await p.eval("document.getElementById('privacy-dialog').open")) await p.click("#privacy-close"); await acknowledge(p); }
async function open(p) { if (!await p.eval("document.getElementById('privacy-dialog').open")) await p.click("#privacy-open"); }
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log("PASS " + name); }
let failure;
try {
  await check("new visitor: public policies and data rights never imply acknowledgement", async () => {
    const { browserContextId } = await browser.send("Target.createBrowserContext");
    try {
      const v = await page("", "", browserContextId);
      const ackKey = id + "/policies/ack/v1";
      assert.equal(await v.eval(`localStorage.getItem(${JSON.stringify(ackKey)})`), null);
      assert(await v.eval("!document.getElementById('privacy-download').disabled && document.getElementById('privacy-dialog').contains(document.getElementById('privacy-download'))"));
      assert.equal(await v.eval("document.querySelectorAll('#privacy-download').length"), 1);
      await v.click("#privacy-reject"); await v.click("#privacy-close");
      await v.click("#terms-open");
      assert(await v.eval("document.getElementById('terms-dialog').textContent.includes(document.documentElement.lang==='es'?'Uso autorizado':'Authorized and responsible')"));
      assert.equal(await v.eval(`localStorage.getItem(${JSON.stringify(ackKey)})`), null);
      assert(await v.eval("!document.getElementById('terms-dialog').textContent.includes('20261025') && document.querySelector('meta[name=aekr-public-version]').content==='20261025'"));
      if (sckb) {
        assert.equal(await v.eval("document.querySelectorAll('#language-toggle').length"), 1);
        await v.click("#language-toggle"); await sleep(500); await ready(v);
        assert.equal(await v.eval("document.documentElement.lang"), "en");
        assert(await v.eval("document.getElementById('terms-dialog').open && !document.getElementById('terms-dialog').textContent.includes('Uso autorizado')"));
        assert.equal(await v.eval(`localStorage.getItem(${JSON.stringify(ackKey)})`), null);
      }
      await v.click("#terms-dialog-close");
      await v.click(sckb ? "#runtime-reset" : "#tab-work");
      assert(await v.eval("document.getElementById('policy-ack-dialog').open && !document.getElementById('policy-terms-check').checked && !document.getElementById('policy-privacy-check').checked && document.getElementById('policy-continue').disabled"));
      assert.equal(await v.eval(`localStorage.getItem(${JSON.stringify(essential)})`), null);
      await v.eval("document.getElementById('policy-terms-check').checked=true;document.getElementById('policy-privacy-check').checked=true;document.getElementById('policy-continue').disabled=false;document.getElementById('policy-continue').click()");
      assert.equal(await v.eval(`localStorage.getItem(${JSON.stringify(ackKey)})`), null, "script click is not a user action");
      await v.eval("document.getElementById('policy-terms-check').checked=false;document.getElementById('policy-privacy-check').checked=false");
      await v.click("#policy-terms-check"); await v.click("#policy-privacy-check"); await v.click("#policy-continue");
      const records = await v.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(ackKey)}))`);
      assert.equal(records.length,1);assert.equal(records[0].productId,id);assert.equal(records[0].action,"explicit-policy-acknowledgement");assert.equal(records[0].scope,"browser-local-unverified");
      assert.equal(records[0].termsRevision,"terms-20261025.1");assert.equal(records[0].privacyRevision,"privacy-20261025.1");
      assert.equal(await v.eval(`localStorage.getItem(${JSON.stringify(key("usage"))})`),null);
      await v.click("#cookies-open");await v.click("#cookies-reject");await v.click("#cookies-dialog-close");
      assert(await v.eval("!!window.AEKR_POLICY.current()"));
      await v.click(sckb ? "#runtime-reset" : "#tab-work");
      if (!sckb) { await v.click("#workBody textarea"); await v.send("Input.insertText",{text:"SYNTHETIC explicit acknowledgement"}); await sleep(350); }
      assert.notEqual(await v.eval(`localStorage.getItem(${JSON.stringify(essential)})`),null);
      await v.send("Page.reload");await sleep(250);await ready(v);assert(await v.eval("!!window.AEKR_POLICY.current()"));
      if(await v.eval("document.getElementById('terms-dialog').open")) await v.click("#terms-dialog-close");
      await v.eval(`localStorage.setItem(${JSON.stringify(ackKey)},JSON.stringify([{...${JSON.stringify(records[0])},termsRevision:'terms-20261024.1'}]))`);
      await v.click(sckb ? "#runtime-reset" : "#tab-work");assert(await v.eval("document.getElementById('policy-ack-dialog').open"));
      await v.send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
      assert(await v.eval("(()=>{const d=document.getElementById('policy-ack-dialog');return d.scrollWidth<=d.clientWidth+1&&d.getBoundingClientRect().width<=innerWidth})()"));
    } finally { await browser.send("Target.disposeBrowserContext",{browserContextId}); }
  });
  await check("blocked storage acknowledgement lasts only for the current document", async () => {
    const { browserContextId } = await browser.send("Target.createBrowserContext");
    try {
      const v=await page("for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=function(){throw new DOMException('fixture blocked','SecurityError')};","",browserContextId);
      await v.click("#privacy-close");await acknowledge(v);
      assert(await v.eval("!!window.AEKR_POLICY.current()"));
      await v.click("#privacy-open");assert(await v.eval("document.getElementById('policy-local-status').textContent.includes('página abierta')||document.getElementById('policy-local-status').textContent.includes('open page')"));
      await v.send("Page.reload");await sleep(250);await ready(v);assert.equal(await v.eval("window.AEKR_POLICY.current()"),null);
    } finally {await browser.send("Target.disposeBrowserContext",{browserContextId});}
  });
  for (const mode of ["choice-quota", "all-quota", "unconfirmed-write"]) {
    for (const action of ["reject", "configure", "withdraw"]) {
      await check(`${action} survives ${mode}, a fresh module and storage recovery`, async () => {
        const { browserContextId } = await browser.send("Target.createBrowserContext");
        try {
          const a = await page("", "", browserContextId);
          await a.click("#privacy-accept");
          await close(a);
          if (sckb) await a.click("#runtime-reset");
          else { await a.click("#tab-work"); await a.click("#workBody textarea"); await a.send("Input.insertText", { text: "SYNTHETIC quota workbook" }); await sleep(350); }
          await a.eval("localStorage.setItem('other-product-fixture','preserve')");
          const preserved = await a.eval(`Object.fromEntries(${JSON.stringify([essential, key("retention"), "other-product-fixture"])}.map(k=>[k,localStorage.getItem(k)]))`);
          assert.notEqual(preserved[essential], null);
          await open(a);
          await a.eval(`(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(${JSON.stringify(mode)}==='all-quota'||k===${JSON.stringify(key("choice"))}){if(${JSON.stringify(mode)}==='unconfirmed-write')return;throw new DOMException('synthetic full storage','QuotaExceededError')}return original.call(this,k,v)}})()`);
          if (action === "configure") { await a.click("#privacy-configure"); await a.click("#privacy-usage"); await a.click("#privacy-save"); }
          else await a.click("#privacy-" + action);
          assert.equal(await a.eval("document.getElementById('privacy-usage').checked"), false);
          assert.deepEqual(await a.eval(`Object.fromEntries(${JSON.stringify(Object.keys(preserved))}.map(k=>[k,localStorage.getItem(k)]))`), preserved);
          // A fresh document has normal storage again; an old on-disk grant must not revive.
          const fresh = await page("", "", browserContextId); await open(fresh);
          assert.equal(await fresh.eval("document.getElementById('privacy-usage').checked"), false, "fresh module must remain off after a failed denial write");
          assert.equal(await fresh.eval(`localStorage.getItem(${JSON.stringify(key("choice"))})`), null);
          await close(fresh); await fresh.click(sckb ? "#runtime-reset" : "#tab-board");
          assert.equal(await fresh.eval(`localStorage.getItem(${JSON.stringify(key("usage"))})`), null);
          await open(fresh); await fresh.click("#privacy-accept"); await close(fresh);
          await fresh.click(sckb ? "#runtime-reset" : "#tab-work");
          const counted = await fresh.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(key("usage"))}))`);
          assert(counted, "explicit choice/action did not count: " + JSON.stringify(await fresh.eval(`({choice:JSON.parse(localStorage.getItem(${JSON.stringify(key("choice"))})),privacyOpen:document.getElementById('privacy-dialog').open,ackOpen:document.getElementById('policy-ack-dialog').open,ack:!!window.AEKR_POLICY.current(),focus:document.activeElement.id})`)));
          assert.equal(counted[0].count, 1, "only a new explicit choice restores optional usage");
        } finally { await browser.send("Target.disposeBrowserContext", { browserContextId }); }
      });
    }
  }
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
  await check("tainted records export only closed fields, including survey-only download", async () => {
    const savedResearch = await p.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(key("research"))}))[0]`);
    const fixture = `const at=Date.now();localStorage.setItem(${JSON.stringify(key("choice"))},JSON.stringify({product:${JSON.stringify(id)},notice:'2026-10-22.1',action:'accept',usage:true,at,expires:at+180*86400000,unexpected:'SYNTHETIC_PRIVATE_REFLECTION'}));localStorage.setItem(${JSON.stringify(key("usage"))},JSON.stringify([{feature:${JSON.stringify(sckb ? "runtime" : "board")},day:new Date().toISOString().slice(0,10),count:2,unexpected:'SYNTHETIC_PRIVATE_REFLECTION'}]));localStorage.setItem(${JSON.stringify(key("research"))},JSON.stringify([{...${JSON.stringify(savedResearch)},reflectionAnswers:'SYNTHETIC_PRIVATE_REFLECTION'}]));localStorage.setItem(${JSON.stringify(key("retention"))},JSON.stringify({days:7,changedAt:at,unexpected:'SYNTHETIC_PRIVATE_REFLECTION'}));`;
    const tainted = await page(fixture); await open(tainted);
    const folder = join(downloads, "closed-fields"); mkdirSync(folder);
    await browser.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: folder });
    await tainted.click("#privacy-download"); await tainted.click("#privacy-research-download");
    for (let i = 0; i < 50 && readdirSync(folder).filter(f => f.endsWith(".json")).length < 2; i++) await sleep(100);
    const full = JSON.parse(readFileSync(join(folder, id + "-local-data.json"), "utf8"));
    const survey = JSON.parse(readFileSync(join(folder, id + "-research-local.json"), "utf8"));
    assert(!JSON.stringify(full).includes("SYNTHETIC_PRIVATE_REFLECTION"));
    assert(!JSON.stringify(survey).includes("SYNTHETIC_PRIVATE_REFLECTION"));
    assert.deepEqual(Object.keys(full.privacyChoice).sort(), ["action", "at", "expires", "notice", "product", "usage"]);
    assert.deepEqual(Object.keys(full.retention).sort(), ["changedAt", "days"]);
    assert.equal(full.usage.length, 1);
    assert.deepEqual(Object.keys(full.usage[0]).sort(), ["count", "day", "feature"]);
    assert.equal(survey.research.length, 1);
    assert.deepEqual(Object.keys(survey.research[0]).sort(), ["answers", "at", "notice", "purpose"]);
    assert.deepEqual(Object.keys(survey).sort(), ["manifest", "research"]);
    await browser.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
  });
  await check("valid optional records are read without storage rewrites", async () => {
    const r = await page(`window.optionalWrites=[];const originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(${JSON.stringify([key("usage"), key("research")])}.includes(k))window.optionalWrites.push(k);return originalSet.call(this,k,v)};`);
    assert.deepEqual(await r.eval("window.optionalWrites"), []);
  });
  await check("wrong or absent research purpose is rejected rather than relabelled", async () => {
    const saved = await p.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(key("research"))}))[0]`);
    const r = await page(`localStorage.setItem(${JSON.stringify(key("research"))},JSON.stringify([{...${JSON.stringify(saved)},purpose:'other-purpose'},{...${JSON.stringify(saved)},purpose:undefined}]));`);
    assert.equal(await r.eval(`localStorage.getItem(${JSON.stringify(key("research"))})`), null);
  });
  await p.click("#privacy-withdraw"); // End the projection fixture before the fresh opt-in scenario.
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
  await check("footer policies and desktop/mobile Terms fit without visible versions", async () => {
    await close(p);
    await p.send("Page.bringToFront");
    for (const width of [1440,390]) {
      await p.send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<600});
      await p.click("#terms-open");
      assert(await p.eval("(()=>{const d=document.getElementById('terms-dialog');return d.scrollWidth<=d.clientWidth+1&&d.getBoundingClientRect().width<=innerWidth&&!d.textContent.includes('20261025')})()"));
      if(process.env.AEKR_POLICY_SCREENSHOT_DIR){
        const dir=resolve(process.env.AEKR_POLICY_SCREENSHOT_DIR);mkdirSync(dir,{recursive:true});
        const shot=await p.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(join(dir,id+"-terms-"+width+".png"),Buffer.from(shot.data,"base64"));
      }
      await p.click("#terms-dialog-close");
      assert(await p.eval("document.documentElement.scrollWidth<=innerWidth+1 && ['terms-open','privacy-open','cookies-open'].every(id=>document.querySelector('.aekr-policy-links').contains(document.getElementById(id)))"));
      if(process.env.AEKR_POLICY_SCREENSHOT_DIR){
        const shot=await p.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(join(resolve(process.env.AEKR_POLICY_SCREENSHOT_DIR),id+"-footer-"+width+".png"),Buffer.from(shot.data,"base64"));
      }
    }
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
