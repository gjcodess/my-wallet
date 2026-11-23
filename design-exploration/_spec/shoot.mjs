// Headless screenshot + console-error harness for design QA (Chrome DevTools Protocol, true mobile emulation).
// Usage:
//   node design-exploration/_spec/shoot.mjs <concept-dir> [route ...] [--w=390] [--h=844] [--out=<dir>] [--full]
//   Routes are hash routes WITHOUT "#/", e.g.  home  wallets  wallet/gcash  activity  settings  sheet/add-tx
//   Special: a route may carry an eval step after "::", e.g.  "home::document.querySelector('.fab').click()"
// Output: <concept-dir>/_shots/<route>.png  + prints any console errors / exceptions per route.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => { const [k, v = "1"] = a.slice(2).split("="); return [k, v]; }));
const pos = args.filter((a) => !a.startsWith("--"));
const dir = resolve(pos[0] || ".");
const routes = pos.slice(1).length ? pos.slice(1) : [
  "lock", "auth", "home", "wallets", "wallet/gcash", "activity", "activity/budgets", "settings",
  "sheet/add-tx", "sheet/transfer", "sheet/update", "sheet/add-wallet", "sheet/tx/t01", "sheet/search",
  "sheet/schedules", "sheet/budget", "empty",
];
const W = +(opts.w || 390), H = +(opts.h || 844);
const out = resolve(opts.out || join(dir, "_shots"));
mkdirSync(out, { recursive: true });
const chromePath = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
const fileUrl = pathToFileURL(join(dir, "index.html")).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), "shot-"));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(chromePath, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`, "--no-first-run", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = list.find((t) => t.type === "page"); } catch {}
}
if (!target) { console.error("Could not start Chrome"); proc.kill(); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map(); const errors = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === "Runtime.exceptionThrown") errors.push("EXCEPTION " + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push("console.error " + msg.params.args.map((a) => a.value ?? a.description).join(" "));
  if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error" && !/fonts\.(googleapis|gstatic)/.test(msg.params.entry.url || "")) errors.push("log " + msg.params.entry.text + " " + (msg.params.entry.url || ""));
});
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true });

let first = true;
for (const spec of routes) {
  const [route, script] = spec.split("::");
  errors.length = 0;
  const url = `${fileUrl}#/${route}`;
  if (first) { await send("Page.navigate", { url }); await sleep(2200); first = false; }
  else { await send("Page.navigate", { url: fileUrl + "?r=" + Date.now() + `#/${route}` }); await sleep(1800); }
  if (script) { await send("Runtime.evaluate", { expression: script, awaitPromise: true }); await sleep(900); }
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: !!opts.full });
  const name = (spec.replace(/::.*/, "") + (script ? "_x" : "")).replace(/[\/:?#]/g, "_") || "root";
  const png = join(out, name + ".png");
  writeFileSync(png, Buffer.from(shot.result.data, "base64"));
  console.log(errors.length ? "ERR " : "ok  ", spec.slice(0, 80), "->", png);
  errors.forEach((e) => console.log("      ", e.slice(0, 300)));
}
ws.close(); proc.kill();
await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
