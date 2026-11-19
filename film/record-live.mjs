// Records the running prototype through real DOM controls. The camera crops the
// browser output and Playwright advances its clock by one video frame per sample.
import { createRequire } from "node:module";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../web/package.json", import.meta.url));
const { chromium } = require("playwright");
const base = process.env.AED_DEMO_URL || "http://127.0.0.1:5194/";
const realSpeech = process.env.AED_VOICE_ENGINE !== "manual";
const micFile = path.resolve(
  process.env.AED_MIC_WAV ||
    fileURLToPath(new URL("./assets/komenda-dalej.wav", import.meta.url)),
);
const output = fileURLToPath(new URL("./work/live/", import.meta.url));
const fps = 30;
const frames = 7 * fps;
const width = 1280,
  height = 720,
  dpr = 2.5;
const sceneNames = [
  "home",
  "map",
  "detail",
  "photos",
  "route",
  "ar",
  "arrival",
  "voice",
  "data",
];
const selected = process.argv.slice(2);
const names = selected.length ? selected : sceneNames;
if (names.some((name) => !sceneNames.includes(name)))
  throw new Error("Unknown scene");
const element = {
  row: '[data-act="select"][data-val="node/14154384101"]',
  nextPhoto: '[data-act="photo"]',
  start: '[data-act="navigate"]',
  advance: '[data-act="advance"]',
  map: ".am-mapwrap",
  view: ".rescue-view",
  walk: ".rescue-ar-panel .rescue-primary",
  voice: ".rescue-voice-controls button:first-child",
  next: ".rescue-actions .rescue-primary",
  mic: ".rescue-voice-controls button:nth-child(2)",
};
const at = (focus, w = 536, dy = 0, point = focus, fx = 0.5, fy = 0.5) => ({
  focus,
  w,
  dy,
  point,
  fx,
  fy,
});
const actions = {
  home: { 161: ".home-grid .primary-cta" },
  map: { 153: element.row },
  photos: {
    42: element.nextPhoto,
    99: element.nextPhoto,
    154: element.nextPhoto,
  },
  route: { 38: element.start, 155: element.advance },
  ar: { 28: element.walk },
  arrival: { 167: element.walk },
  voice: realSpeech
    ? { 59: element.voice, 84: element.voice, 100: element.mic }
    : { 59: element.voice, 84: element.voice, 149: element.next },
  data: { 169: ".download-list a[download]:last-child" },
};
function framing(name, f) {
  switch (name) {
    case "home":
      if (f < 28) return at(".topbar", 551, 95, ".wallet-identity", 0.25, 0.4);
      if (f < 53)
        return at(".doc-stack", 547, -17, ".wallet-licence", 0.46, 0.43);
      if (f < 161) return at(".aed-hero", 520, -1, ".home-grid .primary-cta");
      return at(element.map, 550, 0, ".am-mode");
    case "map":
      if (f < 89)
        return at(
          element.map,
          531,
          -5,
          element.map,
          0.35 + 0.28 * Math.min(1, Math.max(0, (f - 21) / 48)),
          0.53,
        );
      if (f < 153) return at(element.row, 528, -10, element.row, 0.72, 0.5);
      return at(".am-panel-head", 520, 65, ".am-badges span:last-child");
    case "detail":
      if (f < 82)
        return at(".am-panel-head", 527, 36, ".am-badges span:last-child");
      if (f < 150)
        return at(".am-description", 502, 21, ".am-description", 0.4, 0.5);
      return at(".am-address", 530, 64, ".am-address", 0.31, 0.5);
    case "photos":
      return at(".am-photo", 360, 0, element.nextPhoto);
    case "route":
      if (f < 38) return at(element.start, 522, -37, element.start);
      if (f < 86)
        return at(".am-panel-head", 538, -50, ".am-panel-head h3", 0.26, 0.5);
      if (f < 123) return at(element.map, 540, 12, element.map, 0.5, 0.55);
      return at(".am-actions", 525, -40, element.advance);
    case "ar":
      if (f < 28) return at(".rescue-ar-panel", 536, 35, element.walk);
      return at(element.view, 540, -3, ".rescue-camera-status", 0.64, 0.5);
    case "arrival":
      if (f < 114)
        return at(element.view, 540, 8, ".rescue-route-meta", 0.24, 0.5);
      if (f < 167) return at(".rescue-ar-panel", 540, -4, element.walk);
      return at(".rescue-art", 536, 11, ".rescue-kicker", 0.74, 0.5);
    case "voice":
      if (f < 39)
        return at(".rescue-art", 518, 32, ".rescue-copy h2", 0.25, 0.5);
      if (f < 88) return at(".rescue-voice-controls", 533, -52, element.voice);
      if (f < 150)
        return at(
          ".rescue-voice-controls",
          530,
          -53,
          realSpeech ? element.mic : element.next,
        );
      return at(".rescue-art", 510, 31, ".rescue-copy h2", 0.22, 0.5);
    case "data":
      if (f < 65)
        return at(".data-counts", 532, -36, ".data-counts strong", 0.5, 0.6);
      return at(
        ".download-list",
        520,
        13,
        f < 105
          ? ".download-list a:first-child"
          : f < 139
            ? ".download-list a:nth-child(2)"
            : ".download-list a:last-child",
        0.26,
        0.5,
      );
  }
}

async function warmVoice(page) {
  const settings = page.getByText("O instrukcji i obsłudze głosowej", {
    exact: true,
  });
  await settings.click();
  await page
    .getByLabel("Rozpoznawaj mowę na urządzeniu", { exact: false })
    .check();
  await settings.click();
  await page.getByRole("button", { name: "Mów „dalej”" }).click();
  await page
    .getByText("Mikrofon gotowy. Powiedz „dalej”.", { exact: true })
    .waitFor({ timeout: 120000 });
  await page.getByRole("button", { name: "Wyłącz mikrofon" }).click();
  await page.getByRole("button", { name: "Krok 3. Naklej elektrody" }).click();
  // Measure cue timing from the same genuine microphone stream that reaches
  // the application's recognizer. This observer never emits speech results.
  await page.evaluate(() => {
    const media = navigator.mediaDevices;
    const get = media.getUserMedia.bind(media);
    media.getUserMedia = async (constraints) => {
      const stream = await get(constraints);
      const ac = new AudioContext();
      const input = ac.createMediaStreamSource(stream),
        meter = ac.createAnalyser();
      meter.fftSize = 512;
      input.connect(meter);
      const data = new Float32Array(512);
      const inspect = () => {
        meter.getFloatTimeDomainData(data);
        if (data.some((v) => Math.abs(v) > 0.024)) {
          window.__filmSpeechOnset = performance.now();
          input.disconnect();
          void ac.close();
        } else if (stream.active) requestAnimationFrame(inspect);
      };
      await ac.resume();
      requestAnimationFrame(inspect);
      return stream;
    };
  });
}
async function setup(page, name) {
  const initial = ["ar", "arrival"].includes(name)
    ? "ar"
    : name === "voice"
      ? "instrukcja"
      : name === "data"
        ? "dane"
        : name === "home"
          ? "pulpit"
          : "mapa";
  await page.goto(base + "#" + initial, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (["detail", "photos", "route"].includes(name)) {
    await page.locator(element.row).click();
    await page.locator(element.start).waitFor();
  }
  if (name === "map") await page.locator(element.row).waitFor();
  if (name === "voice") {
    await page
      .getByRole("button", { name: "Krok 3. Naklej elektrody" })
      .click();
    if (realSpeech) await warmVoice(page);
  }
  if (name !== "voice" || !realSpeech) await page.clock.install();
  // Freeze wall-clock drift during frame encoding; the prototype still handles
  // its own timers, input events, route transitions and camera orientation.
  if (name !== "voice" || !realSpeech)
    await page.clock.pauseAt(new Date(Date.now() + 300));
  if (name === "arrival") {
    await page.locator(element.walk).evaluate((node) => node.click());
    await page.clock.runFor(6200);
  }
  await page.evaluate(() => {
    const cursor = document.createElement("div");
    cursor.id = "film-pointer";
    cursor.style.cssText =
      "position:absolute;left:0;top:0;width:23px;height:29px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 1px 2px #0009)";
    cursor.innerHTML =
      '<svg width="23" height="29" viewBox="0 0 23 29" aria-hidden="true"><path d="M2 1.8 20 15.1l-8.3 1.1 4.7 8.2-3.9 2.1-4.6-8.2L3 24Z" fill="#111a1c" stroke="white" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    const ring = document.createElement("div");
    ring.id = "film-ring";
    ring.style.cssText =
      "position:absolute;left:0;top:0;z-index:2147483646;pointer-events:none;border:2.5px solid #008965;border-radius:50%;background:#b4ffe136;opacity:0";
    const box = document.createElement("div");
    box.id = "film-highlight";
    box.style.cssText =
      "position:absolute;left:0;top:0;z-index:2147483645;pointer-events:none;border:2.5px solid #07866c;border-radius:9px;box-shadow:0 0 0 2px #fff9;background:#98f9cf0d;opacity:0";
    document.body.append(box, ring, cursor);
  });
}
function domFrame({ f, cue, pulse, mark }) {
  const abs = (node) => {
    const r = node.getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
  };
  const pick = (sel) => {
    const n = document.querySelector(sel);
    return n && n.getClientRects().length ? abs(n) : null;
  };
  const crop = window.__filmCrop || { x: 0, y: 0, w: 548, px: 85, py: 95 };
  const rect = pick(cue.focus);
  const clamp = (v, a, b) => Math.min(Math.max(v, a), Math.max(a, b));
  const desiredW = cue.w;
  const ease = f === 0 ? 1 : 0.095;
  crop.w += (desiredW - crop.w) * ease;
  const h = (crop.w * 9) / 16;
  if (rect) {
    const x = clamp(
      rect.x + rect.w * 0.5 - crop.w * 0.5,
      0,
      innerWidth - crop.w,
    );
    const y = clamp(
      rect.y + rect.h * 0.5 + cue.dy - h * 0.5,
      0,
      document.documentElement.scrollHeight - h,
    );
    crop.x += (x - crop.x) * ease;
    crop.y += (y - crop.y) * ease;
  }
  window.scrollTo({ top: Math.max(0, crop.y - 12), behavior: "instant" });
  const subject = pick(cue.point) || rect;
  if (subject) {
    const x = subject.x + subject.w * cue.fx,
      y = subject.y + subject.h * cue.fy;
    crop.px += (x - crop.px) * (f === 0 ? 0.45 : 0.12);
    crop.py += (y - crop.py) * (f === 0 ? 0.45 : 0.12);
  }
  const pointer = document.getElementById("film-pointer");
  pointer.style.transform = "translate(" + crop.px + "px," + crop.py + "px)";
  if (mark) {
    const b = pick(mark);
    if (b) crop.lastBox = b;
  }
  const box = document.getElementById("film-highlight"),
    ring = document.getElementById("film-ring");
  if (pulse === 0) crop.click = { x: crop.px, y: crop.py };
  if (crop.lastBox && pulse >= 0 && pulse < 26) {
    const b = crop.lastBox;
    Object.assign(box.style, {
      left: b.x + "px",
      top: b.y + "px",
      width: b.w + "px",
      height: b.h + "px",
      opacity: Math.min(1, (26 - pulse) / 8),
    });
  } else box.style.opacity = 0;
  if (crop.click && pulse >= 0 && pulse < 19) {
    const size = 12 + pulse * 2.5;
    Object.assign(ring.style, {
      width: size + "px",
      height: size + "px",
      left: crop.click.x - size / 2 + "px",
      top: crop.click.y - size / 2 + "px",
      opacity: 1 - pulse / 19,
    });
  } else ring.style.opacity = 0;
  window.__filmCrop = crop;
  return {
    x: crop.x,
    y: crop.y,
    width: crop.w,
    height: h,
    scrollY,
    px: crop.px,
    py: crop.py,
  };
}
async function record(browser, name) {
  const page = await browser.newPage({
    permissions: name === "voice" && realSpeech ? ["microphone"] : [],
    viewport: { width: name === "photos" ? 378 : 560, height: 685 },
    deviceScaleFactor: dpr,
    acceptDownloads: true,
  });
  const session = await page.context().newCDPSession(page);
  const pending = path.join(output, name + ".pending.mp4"),
    final = path.join(output, name + ".mp4");
  const encoder = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "image2pipe",
      "-framerate",
      String(fps),
      "-vcodec",
      "mjpeg",
      "-i",
      "pipe:0",
      "-an",
      "-vf",
      "scale=" + width + ":" + height + ":flags=lanczos,setsar=1",
      "-c:v",
      "libx264",
      "-threads",
      "2",
      "-preset",
      "veryfast",
      "-crf",
      "16",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      pending,
    ],
    { stdio: ["pipe", "ignore", "inherit"] },
  );
  const finished = once(encoder, "close");
  try {
    await setup(page, name);
    let last = -99,
      mark = "",
      heardAt = null,
      speechAt = null;
    const voiceWall = performance.now();
    for (let f = 0; f < frames; f++) {
      const clicked = actions[name]?.[f];
      if (clicked || (name === "detail" && [21, 96, 163].includes(f))) {
        last = f;
        mark =
          clicked ||
          (f === 21
            ? ".am-badges span:last-child"
            : f === 96
              ? ".am-description"
              : ".am-address");
      }
      let cue = framing(name, f);
      if (clicked)
        cue = { ...framing(name, Math.max(0, f - 1)), point: clicked };
      const crop = await page.evaluate(domFrame, {
        f,
        cue,
        pulse: f - last,
        mark: f === last ? mark : "",
      });
      if (clicked) {
        const control = page.locator(clicked).first();
        await control.evaluate((node) => node.click());
        if (name === "route" && clicked === element.start)
          await page.locator(element.advance).waitFor();
      }
      if (name === "map" && f >= 21 && f <= 69) {
        await page.mouse.move(crop.px, crop.py - crop.scrollY);
        if (f === 21) await page.mouse.down();
        if (f === 69) await page.mouse.up();
      }
      if (name === "ar" && f >= 40 && f <= 180) {
        const yaw = Math.round(Math.sin(((f - 40) / 140) * 2 * Math.PI) * 43);
        await page.locator(".rescue-slider input").fill(String(yaw));
      }
      if (name === "voice" && realSpeech) {
        const nextStep = page.getByRole("heading", {
          name: "Odsuń się na polecenie AED",
        });
        if (f === 158) await nextStep.waitFor({ timeout: 18000 });
        if (
          speechAt === null &&
          (await page.evaluate(() => Boolean(window.__filmSpeechOnset)))
        )
          speechAt = f / fps;
        if (heardAt === null && (await nextStep.count())) heardAt = f / fps;
        await new Promise((done) =>
          setTimeout(
            done,
            Math.max(0, voiceWall + (f / fps) * 1000 - performance.now()),
          ),
        );
      } else await page.clock.runFor(f % 3 === 0 ? 34 : 33);
      const clip = {
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
        scale: width / (crop.width * dpr),
      };
      const shot = await session.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 89,
        captureBeyondViewport: true,
        fromSurface: true,
        clip,
      });
      if (!encoder.stdin.write(Buffer.from(shot.data, "base64")))
        await once(encoder.stdin, "drain");
    }
    encoder.stdin.end();
    const [code] = await finished;
    if (code !== 0)
      throw new Error("ffmpeg failed for " + name + " (" + code + ")");
    if (name === "voice" && realSpeech) {
      if (heardAt === null)
        throw new Error("Voice input did not advance the step");
      await page
        .getByText("Rozpoznano „dalej”.", { exact: true })
        .waitFor({ timeout: 4000 });
    }
    await rename(pending, final);
    if (name === "voice")
      await writeFile(
        path.join(output, "voice-cues.json"),
        JSON.stringify(
          {
            input: realSpeech
              ? "Polish WAV through the browser microphone"
              : "Next button",
            electrodes: 0,
            clickRead: 59 / fps,
            clickMute: 84 / fps,
            clickMic: realSpeech ? 100 / fps : null,
            speechOnset: speechAt,
            stepFour: realSpeech ? heardAt : 149 / fps,
          },
          null,
          2,
        ) + "\n",
      );
    console.log("Recorded " + name);
  } catch (error) {
    encoder.stdin.destroy();
    encoder.kill();
    await rm(pending, { force: true });
    throw error;
  } finally {
    await page.close();
  }
}
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  args:
    names.includes("voice") && realSpeech
      ? [
          "--use-fake-ui-for-media-stream",
          "--use-fake-device-for-media-stream",
          "--use-file-for-fake-audio-capture=" + micFile,
        ]
      : [],
  headless: true,
  channel: process.env.AED_CHROME_CHANNEL || "chrome",
});
try {
  const queue = [...names];
  const jobs = Math.min(3, queue.length);
  await Promise.all(
    Array.from({ length: jobs }, async () => {
      while (queue.length) {
        const scene = queue.shift();
        await record(browser, scene);
      }
    }),
  );
} finally {
  await browser.close();
}
