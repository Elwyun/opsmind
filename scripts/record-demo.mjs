#!/usr/bin/env node
/**
 * Records the OpsMind demo as a screen-only video with burnt-in captions.
 *
 *   npm run demo:record                         # http://localhost:3000
 *   DEMO_URL=http://localhost:3100 npm run demo:record
 *   OPSMIND_DEMO_CAPTIONS=off npm run demo:record
 *
 * The script drives the real UI in Chromium at 1600x900, adds a synthetic
 * pointer + lower-third captions (so the recording reads without audio), and
 * converts Playwright's WebM to H.264 MP4 with ffmpeg. It also writes an SRT
 * file with the same cues, for editing or for a re-record without captions.
 *
 * The take must stay under three minutes (the submission limit). The script
 * fails if the encoded video is longer than 179 seconds.
 */
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (process.env.DEMO_URL ?? "http://localhost:3000").replace(/\/$/, "");
const showCaptions = (process.env.OPSMIND_DEMO_CAPTIONS ?? "on").toLowerCase() !== "off";
const outDir = path.resolve(root, process.env.OPSMIND_DEMO_OUT ?? "submission/video");
const mp4Path = path.join(outDir, "OpsMind_Demo_Draft_EN.mp4");
const srtPath = path.join(outDir, "OpsMind_Demo_Draft_EN.srt");
const cuesPath = path.join(outDir, "OpsMind_Demo_Draft_EN.captions.md");
const rawDir = path.join(root, ".demo-recording", "raw");

const VIEWPORT = { width: 1600, height: 900 };
const MAX_SECONDS = 179;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Injected HUD: synthetic pointer, click ripple and lower-third caption.
// Re-created on every navigation because it lives in the page DOM.
// ---------------------------------------------------------------------------
function installHud(options) {
  if (window.__opsmindHud) return;
  const captionsEnabled = !options || options.captions !== false;

  const style = document.createElement("style");
  style.textContent = `
    nextjs-portal, [data-nextjs-toast] { display: none !important; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    #demo-cursor {
      position: fixed; left: 0; top: 0; width: 20px; height: 20px; z-index: 2147483647;
      border-radius: 50%; border: 2px solid #0d7d78; background: rgba(13, 125, 120, .18);
      box-shadow: 0 0 0 4px rgba(13, 125, 120, .10);
      transform: translate(-50%, -50%); pointer-events: none;
      transition: left .16s linear, top .16s linear;
    }
    #demo-ripple {
      position: fixed; z-index: 2147483646; width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid #0d7d78; transform: translate(-50%, -50%); pointer-events: none;
      animation: demo-ripple .55s ease-out forwards;
    }
    @keyframes demo-ripple {
      from { opacity: .9; width: 14px; height: 14px; }
      to { opacity: 0; width: 74px; height: 74px; }
    }
    #demo-caption {
      position: fixed; left: 50%; bottom: 26px; z-index: 2147483645;
      transform: translateX(-50%); width: min(1180px, 92vw);
      display: none; gap: 16px; align-items: flex-start;
      padding: 16px 22px; border-radius: 14px;
      background: rgba(8, 24, 38, .94); color: #f8fafc;
      box-shadow: 0 20px 44px rgba(2, 12, 22, .38);
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    #demo-caption[data-visible="true"] { display: flex; }
    #demo-caption .step {
      flex: 0 0 auto; margin-top: 2px; padding: 4px 9px; border-radius: 999px;
      background: rgba(13, 125, 120, .28); border: 1px solid rgba(45, 212, 191, .55);
      color: #99f6e4; font-size: 12px; font-weight: 700; letter-spacing: .10em;
      font-variant-numeric: tabular-nums;
    }
    #demo-caption .body { min-width: 0; }
    #demo-caption .title {
      margin: 0 0 4px; font-size: 13px; font-weight: 700; letter-spacing: .14em;
      text-transform: uppercase; color: #5eead4;
    }
    #demo-caption .text {
      margin: 0; font-size: 21px; line-height: 1.42; font-weight: 500; color: #f1f5f9;
    }
  `;
  (document.head ?? document.documentElement).appendChild(style);

  const cursor = document.createElement("div");
  cursor.id = "demo-cursor";
  cursor.style.left = `${window.innerWidth / 2}px`;
  cursor.style.top = `${window.innerHeight / 2}px`;
  document.documentElement.appendChild(cursor);

  const caption = document.createElement("div");
  caption.id = "demo-caption";
  caption.dataset.visible = "false";
  caption.innerHTML = '<span class="step"></span><div class="body"><p class="title"></p><p class="text"></p></div>';
  document.documentElement.appendChild(caption);

  window.addEventListener(
    "mousemove",
    (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    },
    true,
  );

  window.addEventListener(
    "mousedown",
    (event) => {
      const ripple = document.createElement("div");
      ripple.id = "demo-ripple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.documentElement.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    },
    true,
  );

  window.__opsmindHud = {
    set(step, title, text) {
      caption.querySelector(".step").textContent = step;
      caption.querySelector(".title").textContent = title;
      caption.querySelector(".text").textContent = text;
      caption.dataset.visible = captionsEnabled ? "true" : "false";
    },
    hide() {
      caption.dataset.visible = "false";
    },
  };

  if (!captionsEnabled) caption.dataset.visible = "false";
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
const startedAt = { value: 0 };
const cues = [];
let openCue = null;

function elapsed() {
  return Date.now() - startedAt.value;
}

async function caption(page, step, title, text) {
  if (openCue) {
    openCue.end = elapsed();
    cues.push(openCue);
  }
  openCue = { start: elapsed(), end: null, step, title, text };
  await page
    .evaluate(([s, t, x]) => window.__opsmindHud?.set(s, t, x), [step, title, text])
    .catch(() => {});
}

function hideCaption(page) {
  return page.evaluate(() => window.__opsmindHud?.hide()).catch(() => {});
}

async function waitForVideoFile(dir, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let previousSize = -1;
  let stableChecks = 0;

  while (Date.now() < deadline) {
    const entries = await readdir(dir).catch(() => []);
    const name = entries.find((entry) => entry.endsWith(".webm"));
    if (name) {
      const candidate = path.join(dir, name);
      const info = await stat(candidate).catch(() => null);
      if (info && info.size > 0) {
        stableChecks = info.size === previousSize ? stableChecks + 1 : 0;
        previousSize = info.size;
        if (stableChecks >= 2) return candidate;
      }
    }
    await sleep(500);
  }

  throw new Error("Playwright video file did not become stable in time.");
}

function srtTime(ms) {
  const total = Math.max(0, Math.round(ms));
  const h = String(Math.floor(total / 3_600_000)).padStart(2, "0");
  const m = String(Math.floor((total % 3_600_000) / 60_000)).padStart(2, "0");
  const s = String(Math.floor((total % 60_000) / 1000)).padStart(2, "0");
  const milli = String(total % 1000).padStart(3, "0");
  return `${h}:${m}:${s},${milli}`;
}

function clock(ms) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function step(label) {
  console.error(`[demo] ${clock(elapsed())} ${label}`);
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------
async function moveTo(page, locator) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
  await sleep(420);
}

async function smoothScroll(page, pixels) {
  await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: "smooth" }), pixels);
  await sleep(1200);
}

async function scrollTo(page, locator, block = "center") {
  const handle = await locator.first().elementHandle().catch(() => null);
  if (!handle) return;
  await handle.evaluate(
    (element, where) => element.scrollIntoView({ block: where, behavior: "smooth" }),
    block,
  );
  await sleep(1300);
}

async function clickSlowly(page, locator) {
  await moveTo(page, locator);
  await locator.click();
}

function cardHtml({ eyebrow, title, lead, bullets, foot }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; }
    body {
      display: grid; place-items: center; padding: 72px;
      background:
        radial-gradient(1200px 600px at 82% 8%, #dbeafe 0%, rgba(219, 234, 254, 0) 60%),
        linear-gradient(135deg, #f8fafc 0%, #eef4f8 100%);
      color: #0e3a5c;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    .frame { width: min(1180px, 100%); border-left: 10px solid #0d7d78; padding: 8px 0 8px 54px; }
    .eyebrow {
      margin: 0 0 22px; font-size: 17px; font-weight: 700; letter-spacing: .18em;
      text-transform: uppercase; color: #0d7d78;
    }
    h1 { margin: 0 0 26px; font-size: 74px; line-height: 1.04; letter-spacing: -.02em; }
    .lead { margin: 0 0 26px; max-width: 980px; font-size: 30px; line-height: 1.42; color: #34506b; }
    ul { margin: 0; padding-left: 26px; max-width: 1000px; }
    li { margin: 0 0 12px; font-size: 24px; line-height: 1.4; color: #1f3d57; }
    .foot {
      margin: 40px 0 0; padding-top: 20px; border-top: 1px solid #cbd5e1;
      font-size: 19px; color: #5b7285; letter-spacing: .01em;
    }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 34px; color: #0e3a5c; }
    .brand .mark {
      width: 34px; height: 34px; border-radius: 9px;
      background: linear-gradient(135deg, #0d7d78, #0e3a5c);
    }
    .brand .name { font-size: 21px; font-weight: 700; letter-spacing: .04em; }
    .brand .tag { font-size: 15px; color: #5b7285; letter-spacing: .08em; text-transform: uppercase; }
  </style></head><body><div class="frame">
    <div class="brand"><span class="mark"></span><span class="name">OpsMind</span>
      <span class="tag">AI Operational Intelligence</span></div>
    <p class="eyebrow">${eyebrow}</p>
    <h1>${title}</h1>
    ${lead ? `<p class="lead">${lead}</p>` : ""}
    ${bullets ? `<ul>${bullets.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
    ${foot ? `<p class="foot">${foot}</p>` : ""}
  </div></body></html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await mkdir(outDir, { recursive: true });
  await rm(rawDir, { recursive: true, force: true });
  await mkdir(rawDir, { recursive: true });

  const watchdog = setTimeout(() => {
    console.error("[demo] watchdog: the take exceeded 300s, stopping");
    process.exit(4);
  }, 300_000);
  watchdog.unref?.();

  // Deterministic starting point for the take.
  const health = await fetch(`${baseUrl}/api/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(
      `Cannot reach ${baseUrl}/api/health. Start the app first (npm run build && PORT=3100 npm start).`,
    );
  }
  const healthBody = await health.json().catch(() => null);
  const aiInfo = healthBody?.data?.ai ?? {};
  const aiLive = aiInfo.isLive === true;
  const aiModel = aiInfo.modelName ?? "unknown";
  const reset = await fetch(`${baseUrl}/api/demo/reset`, { method: "POST" }).catch(() => null);
  if (reset && reset.status !== 200) {
    console.warn(`[demo] demo reset returned ${reset.status}; continuing with current data.`);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: rawDir, size: VIEWPORT },
  });
  await context.addInitScript(installHud, { captions: showCaptions });

  const page = await context.newPage();
  page.setDefaultTimeout(60_000);

  startedAt.value = Date.now();
  await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2, { steps: 4 });

  // 1. Title -----------------------------------------------------------------
  step("title card");
  await caption(
    page,
    "00 · INTRO",
    "OpsMind — AI operational intelligence",
    "A working prototype that turns separated operations data into evidence a manager can check.",
  );
  await hideCaption(page);
  await page.setContent(
    cardHtml({
      eyebrow: "Google Cloud AI Builder Cup 2026 · ABB Catalyst",
      title: "OpsMind",
      lead:
        "AI operational intelligence for small manufacturers: find energy waste that production data alone does not explain.",
      foot:
        "Draft screen recording · every figure comes from a deterministic simulated dataset · no saving has been verified.",
    }),
  );
  await sleep(7500);

  // 2. Problem ---------------------------------------------------------------
  step("problem card");
  await caption(
    page,
    "00 · PROBLEM",
    "The numbers live in separate places",
    "Production, electricity, hours and weather sit in different sheets. A spike rarely explains itself, so nobody investigates it.",
  );
  await hideCaption(page);
  await page.setContent(
    cardHtml({
      eyebrow: "The problem",
      title: "The numbers live in separate places.",
      lead:
        "Production, electricity, operating hours and weather sit in different sheets. A power spike rarely explains itself, so nobody investigates it.",
      bullets: [
        "Comparing periods by hand takes hours and is rarely reproducible.",
        "A generic chatbot cannot show which records its answer came from.",
      ],
      foot: "OpsMind: the app calculates the metrics, then the model explains only that evidence.",
    }),
  );
  await sleep(8500);

  // 3. Overview --------------------------------------------------------------
  step("overview");
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await caption(
    page,
    "01 · OVERVIEW",
    "One period, three numbers",
    "30 labelled simulated days. Production stays flat while electricity rises; energy intensity is calculated by the app, not by the model.",
  );
  await sleep(3200);
  await moveTo(page, page.getByText("Production", { exact: true }).first());
  await sleep(1600);
  await smoothScroll(page, 430);
  await moveTo(page, page.getByText("Investigation queue", { exact: true }).last());
  await sleep(1800);

  await caption(
    page,
    "01 · OVERVIEW",
    "The strongest candidate",
    "17 Sep 2026 is +36.0% above its trailing baseline. Method baseline-v1, threshold 15% — a prototype heuristic, not an industry standard.",
  );
  await scrollTo(page, page.getByRole("heading", { name: "What needs attention?" }));
  await moveTo(page, page.getByText("+36.0%").first());
  await sleep(5200);

  // 4. Queue + investigate ---------------------------------------------------
  step("investigation queue");
  await page.getByRole("navigation", { name: "Main sections" }).getByRole("link", { name: "Investigations" }).click();
  await page.waitForURL(/\/investigations$/);
  await caption(
    page,
    "02 · INVESTIGATE",
    "Investigation queue",
    "Two candidate days, each with deviation, severity, estimated impact and a one-line evidence summary.",
  );
  const row = page.locator("tbody tr").filter({ hasText: "17 Sep 2026" }).first();
  await moveTo(page, row);
  await sleep(5000);

  await caption(
    page,
    "02 · INVESTIGATE",
    "Run the investigation",
    "The button calls the backend. The metrics are computed first; only then is the model asked to explain them.",
  );
  await sleep(2200);
  await clickSlowly(page, row.getByRole("button", { name: "Investigate" }));
  await page.waitForURL(/\/investigations\/[^/]+$/, { timeout: 60_000 });
  await page.getByRole("heading", { name: "Anomaly summary" }).waitFor();
  await sleep(1400);

  // 5. Evidence --------------------------------------------------------------
  step("evidence");
  await caption(
    page,
    "03 · EVIDENCE",
    "Evidence before explanation",
    "Actual and baseline intensity, the comparison window and the deviation are stored with the result, so any claim can be traced back.",
  );
  await sleep(4200);
  await scrollTo(page, page.getByRole("heading", { name: "Evidence", exact: true }));
  await moveTo(page, page.getByText("E1", { exact: false }).first());
  await sleep(3600);

  await caption(
    page,
    "03 · EVIDENCE",
    "E1–E13, the only context the model sees",
    "The model cannot run SQL or shell. Citations of evidence that was not supplied are discarded and counted.",
  );
  await sleep(5200);
  await scrollTo(page, page.getByRole("heading", { name: "Estimated impact" }));
  await caption(
    page,
    "04 · IMPACT",
    "A transparent cost estimate",
    "excess kWh × tariff. The formula and its assumptions are printed; this is a potential estimate, not a bill and not a verified saving.",
  );
  await sleep(7200);

  // 6. AI output -------------------------------------------------------------
  step("ai output");
  await caption(
    page,
    "05 · AI OUTPUT",
    aiLive ? `Live model — ${aiModel}` : "Simulated model — labelled as such",
    aiLive
      ? "Gemini wrote this answer from the supplied evidence only. Its output is validated server-side against a Zod schema before it is stored."
      : "No API key is configured for this take, so a deterministic mock wrote this answer. It is never presented as live AI.",
  );
  await scrollTo(page, page.getByRole("heading", { name: "AI summary" }));
  await sleep(6000);
  await scrollTo(page, page.getByRole("heading", { name: "Possible contributing factors" }));
  await caption(
    page,
    "05 · AI OUTPUT",
    "Hypotheses, not conclusions",
    "Observations cite evidence IDs. Each possible factor lists the evidence that is still missing before it can be confirmed.",
  );
  await sleep(5200);
  await scrollTo(page, page.getByRole("heading", { name: "Recommended checks" }));
  await caption(
    page,
    "05 · AI OUTPUT",
    "AI suggests, a person decides",
    "Recommended checks are human inspections. No autonomous equipment control is ever proposed.",
  );
  await sleep(5200);
  await scrollTo(page, page.getByRole("heading", { name: "Limitations" }), "start");
  await sleep(2600);

  // 7. Action + verification -------------------------------------------------
  step("action flow");
  await caption(
    page,
    "06 · ACTION",
    "Record the human decision",
    "The operator adds the check they intend to run, then marks it completed with a short note.",
  );
  await scrollTo(page, page.getByRole("heading", { name: "Add an action" }));
  await clickSlowly(page, page.getByLabel("Action or check to perform"));
  await page.getByLabel("Action or check to perform").pressSequentially("Compare cooling runtime with the baseline week", { delay: 38 });
  await sleep(500);
  await clickSlowly(page, page.getByLabel("Owner (optional)"));
  await page.getByLabel("Owner (optional)").pressSequentially("Maintenance lead", { delay: 42 });
  await sleep(500);
  await clickSlowly(page, page.getByRole("button", { name: "Add action" }));
  const actionCard = page.getByText("Compare cooling runtime with the baseline week").first();
  await actionCard.waitFor({ timeout: 30_000 });
  await sleep(1600);

  await caption(
    page,
    "06 · ACTION",
    "Human sign-off, then verification",
    "Marking the action completed unlocks a before/after comparison over two explicit date windows.",
  );
  await clickSlowly(page, page.getByRole("button", { name: "Mark completed" }).first());
  await page.getByRole("button", { name: "Record before/after comparison" }).waitFor({ timeout: 30_000 });
  await sleep(1600);
  await clickSlowly(page, page.getByRole("button", { name: "Record before/after comparison" }));
  await page.getByText(/^Observed change:/).waitFor({ timeout: 30_000 });
  await scrollTo(page, page.getByText(/^Observed change:/), "center");
  await caption(
    page,
    "06 · ACTION",
    "Observed change, not causation",
    "The comparison reports before and after intensity and states the caveat: other factors are not controlled, so this does not prove the action caused the change.",
  );
  await sleep(5600);

  // 8. Data labels -----------------------------------------------------------
  step("data page");
  await page.getByRole("navigation", { name: "Main sections" }).getByRole("link", { name: "Data" }).click();
  await page.waitForURL(/\/data$/);
  await caption(
    page,
    "07 · DATA",
    "Every row carries its source",
    "Rows are labelled SIMULATED. Days without enough baseline are reported as insufficient, never estimated.",
  );
  await scrollTo(page, page.getByRole("heading", { name: "Daily operational data" }), "start");
  await moveTo(page, page.locator("tbody tr").filter({ hasText: "2026-09-17" }).first());
  await smoothScroll(page, 220);
  await sleep(5200);

  // 9. Health / failure state ------------------------------------------------
  step("health");
  await page.goto(`${baseUrl}/api/health`, { waitUntil: "domcontentloaded" });
  await caption(
    page,
    "08 · HEALTH",
    "Failure shown as failure",
    "The health endpoint reports database and model state. A failed model call is stored as FAILED with an error code — no substitute answer is invented.",
  );
  await sleep(7500);

  // 10. Closing --------------------------------------------------------------
  step("closing card");
  await caption(
    page,
    "09 · CLOSING",
    "A working, honest prototype",
    "Next: managed PostgreSQL, a Cloud Run deployment, real weather data and authentication — without dropping the evidence trail.",
  );
  await hideCaption(page);
  await page.setContent(
    cardHtml({
      eyebrow: "What is real today",
      title: "A working, honest prototype.",
      bullets: [
        "Deterministic, traceable metrics · AI output validated server-side with Zod.",
        aiLive
          ? `Live Gemini (${aiModel}) writes the explanation; its output is validated server-side and failures are stored as FAILED.`
          : "Mock investigator clearly labelled <em>Simulated model</em>; live Gemini is one environment variable away.",
        "Next: managed PostgreSQL, Cloud Run deployment, live Gemini key, real weather provider, authentication.",
      ],
      foot:
        "Repository, deployed URL and final voice-over are added before submission · ABB Catalyst · OpsMind",
    }),
  );
  await sleep(9000);

  // Finalise ----------------------------------------------------------------
  const video = page.video();
  if (!video) throw new Error("Playwright did not record a video.");
  const webmPath = path.join(root, ".demo-recording", "take.webm");
  await rm(webmPath, { force: true });

  // The video is finalised when the context closes. On Windows the WebM keeps
  // being flushed for a moment afterwards, so wait for a stable file instead
  // of racing `saveAs` against the finalizer.
  await context.close();
  const originalRecording = await waitForVideoFile(rawDir);
  await copyFile(originalRecording, webmPath);
  await rm(originalRecording, { force: true });
  await Promise.race([browser.close().catch(() => {}), sleep(8_000)]);

  if (openCue) {
    openCue.end = elapsed();
    cues.push(openCue);
    openCue = null;
  }

  const ffmpeg = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i", webmPath,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-movflags", "+faststart",
      "-an",
      mp4Path,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (ffmpeg.status !== 0) {
    throw new Error(`ffmpeg failed:\n${ffmpeg.stderr?.slice(-2000) ?? ""}`);
  }
  await rm(webmPath, { force: true });

  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", mp4Path],
    { encoding: "utf8" },
  );
  const duration = Number.parseFloat(probe.stdout.trim());

  const srt = cues
    .map((cue, index) => {
      const end = cue.end ?? cue.start + 2000;
      return `${index + 1}\n${srtTime(cue.start)} --> ${srtTime(end)}\n${cue.title}\n${cue.text}\n`;
    })
    .join("\n");
  await writeFile(srtPath, srt, "utf8");

  const table = [
    "# OpsMind demo draft — caption and voice-over script",
    "",
    `Recorded ${new Date().toISOString().slice(0, 10)} against \`${baseUrl}\`.`,
    `Video: \`${path.basename(mp4Path)}\` · ${clock(duration * 1000)} long · 1600×900 · captions burned in.`,
    "",
    "Read the *Say* column aloud if you add a voice-over; keep each line inside its window.",
    "",
    "| Time | Section | Say |",
    "| --- | --- | --- |",
    ...cues.map((cue) => {
      const end = cue.end ?? cue.start;
      return `| ${clock(cue.start)}–${clock(end)} | ${cue.title.replace(/\|/g, "/")} | ${cue.text.replace(/\|/g, "/")} |`;
    }),
    "",
  ].join("\n");
  await writeFile(cuesPath, table, "utf8");

  console.log(`[demo] model at record time: ${JSON.stringify(healthBody?.data?.ai ?? null)}`);
  console.log(`[demo] mp4: ${mp4Path}`);
  console.log(`[demo] duration: ${duration.toFixed(1)}s`);
  console.log(`[demo] srt: ${srtPath}`);
  console.log(`[demo] captions: ${cuesPath}`);

  clearTimeout(watchdog);

  if (duration > MAX_SECONDS) {
    throw new Error(
      `Recording is ${duration.toFixed(1)}s, over the ${MAX_SECONDS}s limit. Tighten the scene pauses.`,
    );
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(`[demo] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
