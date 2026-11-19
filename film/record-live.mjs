// The production device shell is recorded at double resolution. CDP sends
// actual touch events. The edit adds a short translucent ring for each tap.
import { createRequire } from "node:module";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { spawn } from "node:child_process";
import path from "node:path";

const require = createRequire(new URL("../web/package.json", import.meta.url));
const { chromium } = require("playwright");
const root = fileURLToPath(new URL(".", import.meta.url));
const out = path.join(root, "work", "mobile");
const base = process.env.AED_DEMO_URL || "http://127.0.0.1:5194/";
const { shots } = JSON.parse(
  await readFile(path.join(root, "scenes.json"), "utf8"),
);
const scenes = shots.filter((s) => !["open", "close"].includes(s[0]));
const selected = process.argv.slice(2);
if (selected.some((s) => !scenes.some(([k]) => k === s)))
  throw Error("Unknown shot");
const queue = scenes.filter(([s]) => !selected.length || selected.includes(s));
const fps = 30;
const start = { latitude: 52.23123, longitude: 21.01416, accuracy: 4 };
const target = { latitude: 52.2321787, longitude: 21.0146526, accuracy: 4 };
const row = '[data-act="select"][data-val="node/14154384101"]';
const sel = {
  tile: ".nearby-service",
  directions: '[data-act="directions"]',
  guide: '[data-act="guide"]',
  cancel: ".call-toast-actions button",
  record: '[data-act="recording"]',
  back: '[data-act="return"]',
  instructions: '[data-act="arrive"]',
  next: ".rescue-actions .rescue-primary",
  read: ".rescue-voice-controls button:first-child",
};
const events = {
  home: [[4.72, sel.tile]],
  choose: [[3.0, row]],
  call: [
    [0.54, sel.guide],
    [5.38, sel.cancel],
    [7.24, sel.record],
  ],
  return: [
    [1.1, sel.back],
    [6.36, sel.instructions],
  ],
  guide: [
    [0.64, sel.next],
    [1.7, sel.next],
    [3.12, sel.read],
  ],
};
function focus(scene, time) {
  switch (scene) {
    case "home":
      return [
        time < 0.72 ? ".wallet-brand" : time < 4.85 ? sel.tile : ".am-map",
        time < 0.72 ? 320 : 389,
        time < 4.85 ? 0 : 10,
      ];
    case "choose":
      return [
        time < 2.16
          ? ".am-map"
          : time < 3.2
            ? row
            : time < 4.7
              ? ".am-panel-head"
              : ".am-map",
        390,
        time < 2.16 ? 15 : 0,
      ];
    case "call":
      return [
        time < 0.6
          ? sel.guide
          : time < 5.56
            ? ".call-toast"
            : time < 6.82
              ? ".am-steps"
              : sel.record,
        386,
        time < 0.6 ? -12 : 0,
      ];
    case "street":
    case "turn":
      return [".ar-guideline", 390, 3];
    case "cabinet":
      return [
        time < 2.74
          ? ".ar-guideline"
          : time < 4.61
            ? ".ar-camera"
            : ".ar-instruction",
        382,
        time < 2.74 ? 0 : time < 4.61 ? 18 : -8,
      ];
    case "return":
      return [
        time < 1.18
          ? sel.back
          : time < 4.05
            ? ".am-map"
            : time < 5.8
              ? ".am-panel-head"
              : sel.instructions,
        386,
        0,
      ];
    case "voice":
      return [".rescue-art", 385, 20];
    case "guide":
      return [
        time < 0.76
          ? ".rescue-copy h2"
          : time < 2.65
            ? ".rescue-art"
            : time < 3.5
              ? sel.read
              : ".rescue-art",
        385,
        time < 0.76 ? 0 : time < 2.65 ? 0 : time < 3.5 ? -24 : 0,
      ];
  }
}
async function ensureVisible(page, selector) {
  await page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const pane = document.querySelector(".phone-scroll"),
        box = pane.getBoundingClientRect(),
        r = el.getBoundingClientRect();
      if (r.top < box.top + 3 || r.bottom > box.bottom - 8)
        pane.scrollTop += r.y + r.height * 0.5 - (box.top + box.height * 0.56);
    });
}
async function touch(page, cdp, selector) {
  const node = page.locator(selector).first();
  await node.waitFor({ state: "visible", timeout: 10000 });
  await ensureVisible(page, selector);
  const r = await node.boundingBox(),
    shell = await page.locator(".phone-body").boundingBox();
  const x = r.x + r.width * 0.54,
    y = r.y + r.height * 0.5;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, radiusX: 7, radiusY: 7, force: 0.58 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  return { x: x - shell.x, y: y - shell.y };
}
async function setup(page, ctx, cdp, scene) {
  const film = ["street", "turn", "cabinet"].includes(scene);
  const entry = film
    ? "nagranie"
    : scene === "home"
      ? "pulpit"
      : scene === "guide"
        ? "instrukcja"
        : "mapa";
  await page.goto(new URL("#" + entry, base).href, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  if (entry === "mapa") await page.locator(row).first().waitFor();
  if (scene === "call" || scene === "return") {
    await touch(page, cdp, row);
    await touch(page, cdp, sel.directions);
    if (scene === "return") {
      await touch(page, cdp, sel.guide);
      await touch(page, cdp, sel.cancel);
      await ctx.setGeolocation(target);
      await page.locator(sel.back).waitFor();
    }
  }
  if (film)
    await page.waitForFunction(
      () =>
        document.querySelector("video")?.readyState >= 2 &&
        !!document.querySelector(".ar-maneuver"),
    );
  if (scene === "guide") {
    // Select the app's bundled Polish reader. No speech result or UI transition is injected.
    await page.evaluate(() =>
      Object.defineProperty(speechSynthesis, "getVoices", { value: () => [] }),
    );
  }
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 180));
}
async function mediaFrame(page, t) {
  await page.evaluate(async (time) => {
    const v = document.querySelector("video");
    if (Math.abs(v.currentTime - time) < 0.012 && v.readyState >= 2) return;
    await new Promise((res, rej) => {
      v.addEventListener("seeked", res, { once: true });
      v.addEventListener("error", rej, { once: true });
      v.currentTime = time;
    });
  }, t);
}
function footageTime(scene, t) {
  if (scene === "street") return 0.15 + t * 1.43;
  if (scene === "turn") return 14.38 + t * 0.31;
  return 19.05 + t * 0.96;
}
async function prepareVoice(page, cdp) {
  await page.goto(new URL("#instrukcja", base).href, {
    waitUntil: "networkidle",
  });
  await page
    .getByText("O instrukcji i obsłudze głosowej", { exact: true })
    .click();
  await page.getByLabel("Rozpoznawaj mowę na urządzeniu").check();
  await page
    .getByText("O instrukcji i obsłudze głosowej", { exact: true })
    .click();
  const mic = ".rescue-voice-controls button:nth-child(2)";
  await touch(page, cdp, mic);
  await page
    .getByText("Mikrofon gotowy. Powiedz „dalej”.", { exact: true })
    .waitFor({ timeout: 90000 });
  await touch(page, cdp, mic);
  await page.getByRole("button", { name: "Krok 3. Naklej elektrody" }).click();
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    // Observe speech onset without supplying recognition results to the app.
    navigator.mediaDevices.getUserMedia = async (...args) => {
      const stream = await original(...args),
        audio = new AudioContext(),
        input = audio.createMediaStreamSource(stream),
        meter = audio.createAnalyser();
      meter.fftSize = 512;
      input.connect(meter);
      const samples = new Float32Array(512);
      function check() {
        meter.getFloatTimeDomainData(samples);
        if (samples.some((sample) => Math.abs(sample) > 0.024)) {
          window.__speechOn = performance.now();
          input.disconnect();
          void audio.close();
        } else if (stream.active) requestAnimationFrame(check);
      }
      await audio.resume();
      requestAnimationFrame(check);
      return stream;
    };
  });
  await touch(page, cdp, mic);
  await page.locator(".phone-scroll").evaluate((p) => {
    p.scrollTop = 0;
  });
}
async function record(browser, shot) {
  const [scene, from, to] = shot;
  const context = await browser.newContext({
    viewport: { width: 520, height: 900 },
    deviceScaleFactor: 2,
    locale: "pl-PL",
    permissions:
      scene === "voice" ? ["geolocation", "microphone"] : ["geolocation"],
    geolocation: start,
  });
  const page = await context.newPage(),
    cdp = await context.newCDPSession(page);
  const pending = path.join(out, scene + ".pending.mp4");
  const ff = spawn(
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
      "setsar=1",
      "-c:v",
      "libx264",
      "-threads",
      "2",
      "-preset",
      "veryfast",
      "-crf",
      "15",
      "-g",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      pending,
    ],
    { stdio: ["pipe", "ignore", "inherit"] },
  );
  const finished = once(ff, "close");
  const track = [],
    taps = [],
    overlays = [],
    art = [];
  try {
    if (scene === "voice") await prepareVoice(page, cdp);
    else await setup(page, context, cdp, scene);
    const frame = await page.locator(".phone-body").boundingBox();
    if (frame.width !== 410 || frame.height !== 864)
      throw Error("Expected the mobile device shell");
    let last = { x: 205, y: 380, w: 389 };
    let speechOn = null,
      advancedAt = null;
    const wall = performance.now();
    const totalFrames =
      scene === "voice" ? 14 * fps : Math.round((to - from) * fps);
    for (let i = 0; i < totalFrames; i++) {
      const t = i / fps;
      if (["street", "turn", "cabinet"].includes(scene))
        await mediaFrame(page, footageTime(scene, t));
      if (scene === "return" && i === Math.round(4.6 * fps)) {
        await context.setGeolocation(start);
        await page
          .getByRole("heading", { name: "Jesteś przy punkcie startu" })
          .waitFor();
      }
      const action = (events[scene] || []).find(
        ([at]) => Math.round(at * fps) === i,
      );
      if (action) {
        const position = await touch(page, cdp, action[1]);
        taps.push({ t, ...position });
      }
      if (scene === "voice") {
        await new Promise((done) =>
          setTimeout(done, Math.max(0, wall + t * 1000 - performance.now())),
        );
        if (
          speechOn === null &&
          (await page.evaluate(() => Boolean(window.__speechOn)))
        )
          speechOn = t;
        if (
          advancedAt === null &&
          (await page
            .getByRole("heading", { name: "Odsuń się na polecenie AED" })
            .count())
        )
          advancedAt = t;
      } else await page.clock.runFor(i % 3 === 0 ? 34 : 33);
      const [selector, w, dy] = focus(scene, t);
      // Physical panning of the real phone and editorial crop share a target.
      if (scene === "choose" && i === Math.round(2.16 * fps))
        await ensureVisible(page, row);
      if (scene === "call" && i === Math.round(6.82 * fps))
        await ensureVisible(page, sel.record);
      if (scene === "return" && i === Math.round(1.18 * fps)) {
        await page.locator(".am-leg-return").waitFor();
        await page.locator(".phone-scroll").evaluate((p) => {
          p.scrollTop = 0;
        });
      }
      if (scene === "guide" && i === Math.round(3.55 * fps))
        await page.locator(".phone-scroll").evaluate((p) => {
          p.scrollTop = 0;
        });
      const pos = await page.evaluate(
        ({ selector, frame, w, dy }) => {
          const el = Array.from(document.querySelectorAll(selector)).find(
            (x) => x.getClientRects().length,
          );
          if (!el) return null;
          const b = el.getBoundingClientRect(),
            h = w / 1.67;
          return {
            x: Math.max(
              9 + w / 2,
              Math.min(frame.width - 9 - w / 2, b.x + b.width / 2 - frame.x),
            ),
            y: Math.max(
              50 + h / 2,
              Math.min(
                frame.height - 22 - h / 2,
                b.y + b.height / 2 - frame.y + dy,
              ),
            ),
            w,
          };
        },
        { selector, frame, w, dy },
      );
      if (pos) {
        const q = i === 0 ? 1 : 0.14;
        for (const k of ["x", "y", "w"]) last[k] += (pos[k] - last[k]) * q;
      }
      track.push([+last.x.toFixed(2), +last.y.toFixed(2), +last.w.toFixed(2)]);
      if (scene === "guide" || scene === "voice") {
        art.push(
          await page.evaluate((frame) => {
            const box = (selector) => {
              const r = document
                .querySelector(selector)
                .getBoundingClientRect();
              return [r.x - frame.x, r.y - frame.y, r.width, r.height];
            };
            const text = document.querySelector(".rescue-copy h2");
            return { panel: box(".rescue-art"), title: text.textContent };
          }, frame),
        );
      }
      if (scene === "street" || scene === "turn") {
        const overlay = await page.evaluate(
          ({ frame, sourceTime }) => {
            const camera = document.querySelector(".ar-camera"),
              ground = document.querySelector(".ar-guideline"),
              counter = document.querySelector(".ar-maneuver");
            if (!ground || !counter) return null;
            const box = (el) => {
              const r = el.getBoundingClientRect();
              return [r.x - frame.x, r.y - frame.y, r.width, r.height];
            };
            const svg = ground.cloneNode(true);
            const clones = [svg, ...svg.querySelectorAll("*")];
            [ground, ...ground.querySelectorAll("*")].forEach((item, n) => {
              const style = getComputedStyle(item),
                dst = clones[n];
              dst.removeAttribute("class");
              dst.removeAttribute("style");
              if (item === ground) return;
              for (const prop of [
                "opacity",
                "stroke",
                "stroke-width",
                "stroke-opacity",
                "stroke-linejoin",
                "stroke-linecap",
                "filter",
                "fill",
              ]) {
                let val = style.getPropertyValue(prop);
                if (val.includes("url(")) {
                  const at = val.lastIndexOf("#");
                  if (at >= 0)
                    val = "url(" + val.slice(at).replace(/["']/g, "");
                }
                dst.style.setProperty(prop, val);
              }
            });
            const r = box(ground);
            svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            svg.setAttribute("width", r[2]);
            svg.setAttribute("height", r[3]);
            return {
              card: box(counter),
              floor: r,
              camera: box(camera),
              sourceTime,
              svg: new XMLSerializer().serializeToString(svg),
            };
          },
          { frame, sourceTime: footageTime(scene, t) },
        );
        overlays.push(overlay);
      }
      const frameData = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 91,
        fromSurface: true,
        captureBeyondViewport: false,
        clip: { ...frame, scale: 1 },
      });
      if (!ff.stdin.write(Buffer.from(frameData.data, "base64")))
        await once(ff.stdin, "drain");
      if (scene === "voice" && advancedAt !== null && t > advancedAt + 1.72)
        break;
    }
    ff.stdin.end();
    if ((await finished)[0] !== 0) throw Error("Video encoder failed");
    if (scene === "voice" && (speechOn === null || advancedAt === null))
      throw Error("No recorded microphone onset or step transition");
    await rename(pending, path.join(out, scene + ".mp4"));
    await writeFile(
      path.join(out, scene + ".json"),
      JSON.stringify({
        fps,
        taps,
        track,
        ...(overlays.length ? { overlays } : {}),
        ...(art.length ? { art } : {}),
        ...(scene === "voice" ? { speechOn, advancedAt } : {}),
      }),
    );
    console.log(scene, track.length, "frames", taps.length, "touches");
  } catch (error) {
    ff.stdin.destroy();
    ff.kill();
    await rm(pending, { force: true });
    throw error;
  } finally {
    await context.close();
  }
}
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.AED_CHROME_CHANNEL || "chrome",
  headless: true,
  args: [
    "--hide-scrollbars",
    "--force-color-profile=srgb",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--use-file-for-fake-audio-capture=" +
      path.join(root, "assets", "komenda-dalej.wav"),
  ],
});
try {
  await Promise.all(
    Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (queue.length) await record(browser, queue.shift());
    }),
  );
} finally {
  await browser.close();
}
