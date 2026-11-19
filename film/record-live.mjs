// Record the complete mobile UI at a fixed size. Every visible touch activates the real app.
import { createRequire } from "node:module";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";

const require = createRequire(new URL("../web/package.json", import.meta.url));
const { chromium } = require("playwright");
const root = fileURLToPath(new URL(".", import.meta.url));
const out = path.join(root, "work", "silent");
const base = process.env.AED_DEMO_URL || "http://127.0.0.1:5194/";
const { chapters, cardDuration } = JSON.parse(
  await readFile(path.join(root, "scenes.json"), "utf8"),
);
const selection = process.argv.slice(2);
if (selection.some((id) => !chapters.some((chapter) => chapter.id === id)))
  throw Error("Unknown chapter");
const queue = chapters.filter(
  (chapter) => !selection.length || selection.includes(chapter.id),
);
const fps = 30;
const start = { latitude: 52.23123, longitude: 21.01416, accuracy: 4 };
const cabinet = { latitude: 52.2321787, longitude: 21.0146526, accuracy: 4 };
const target = '.leaflet-marker-icon[title="Dom towarowy Bracia Jabłkowscy"]';
const directions = '[data-act="directions"]',
  guide = '[data-act="guide"]';
const cancel = ".call-toast-actions button",
  back = '[data-act="return"]';
const microphone = ".rescue-voice-controls button:nth-child(2)";
const events = {
  map: [
    [2.35, ".nearby-service"],
    [6.45, target],
  ],
  help: [
    [1.8, guide],
    [6.35, cancel],
  ],
  return: [
    [1.85, back],
    [6.93, '[data-act="arrive"]'],
  ],
};

async function reveal(page, selector) {
  await page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const pane = document.querySelector(".phone-scroll");
      const box = pane.getBoundingClientRect(),
        r = el.getBoundingClientRect();
      if (r.top < box.top + 3 || r.bottom > box.bottom - 9)
        pane.scrollTop += r.y + r.height / 2 - (box.top + box.height * 0.56);
    });
}
async function touch(page, cdp, selector) {
  const node = page.locator(selector).first();
  await node.waitFor({ state: "visible" });
  await reveal(page, selector);
  const b = await node.boundingBox(),
    frame = await page.locator(".phone-body").boundingBox();
  const x = b.x + b.width / 2,
    y = b.y + b.height / 2;
  const hit = await page.evaluate(
    ({ x, y, sel }) => !!document.elementFromPoint(x, y)?.closest(sel),
    { x, y, sel: selector },
  );
  if (!hit) throw Error("Touch misses " + selector);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, radiusX: 7, radiusY: 7, force: 0.55 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  return { x: x - frame.x, y: y - frame.y };
}
async function prepare(page, ctx, cdp, id) {
  const entry = {
    map: "pulpit",
    help: "mapa",
    ar: "nagranie",
    return: "mapa",
    guide: "instrukcja",
  }[id];
  await page.goto(new URL("#" + entry, base).href, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  if (id === "help" || id === "return") {
    await touch(page, cdp, target);
    await touch(page, cdp, directions);
    await reveal(page, guide);
    if (id === "return") {
      await touch(page, cdp, guide);
      await touch(page, cdp, cancel);
      await ctx.setGeolocation(cabinet);
      await page.locator(back).waitFor();
      await reveal(page, back);
    }
  }
  if (id === "ar")
    await page.waitForFunction(
      () =>
        document.querySelector("video")?.readyState >= 2 &&
        !!document.querySelector(".ar-maneuver"),
    );
  if (id === "guide") {
    // Warm the app's on-device recognizer before timing the recorded microphone input.
    await page
      .getByText("O instrukcji i obsłudze głosowej", { exact: true })
      .click();
    await page.getByLabel("Rozpoznawaj mowę na urządzeniu").check();
    await page
      .getByText("O instrukcji i obsłudze głosowej", { exact: true })
      .click();
    await touch(page, cdp, microphone);
    await page
      .getByText("Mikrofon gotowy. Powiedz „dalej”.", { exact: true })
      .waitFor({ timeout: 90000 });
    await touch(page, cdp, microphone);
    await page
      .getByRole("button", { name: "Krok 3. Naklej elektrody" })
      .click();
    await touch(page, cdp, microphone);
    await page.locator(".phone-scroll").evaluate((el) => {
      el.scrollTop = 0;
    });
  } else {
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 200));
  }
}
async function setWalkFrame(page, time) {
  await page.evaluate(async (time) => {
    const video = document.querySelector("video");
    if (Math.abs(video.currentTime - time) < 0.008 && video.readyState >= 2)
      return;
    await new Promise((resolve, reject) => {
      const onError = () => {
        video.removeEventListener("seeked", onSeek);
        reject(Error("Street video decode failed"));
      };
      const onSeek = () => {
        video.removeEventListener("error", onError);
        resolve();
      };
      video.addEventListener("error", onError, { once: true });
      video.addEventListener("seeked", onSeek, { once: true });
      video.currentTime = time;
    });
  }, time);
}
async function record(browser, chapter) {
  const scene = chapter.id;
  const ctx = await browser.newContext({
    viewport: { width: 520, height: 900 },
    deviceScaleFactor: 2,
    locale: "pl-PL",
    permissions:
      scene === "guide" ? ["geolocation", "microphone"] : ["geolocation"],
    geolocation: start,
  });
  const page = await ctx.newPage(),
    cdp = await ctx.newCDPSession(page);
  const pending = path.join(out, scene + ".pending.mp4");
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
      "24",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      pending,
    ],
    { stdio: ["pipe", "ignore", "inherit"] },
  );
  const finished = once(encoder, "close");
  const taps = [];
  let changedStep = null;
  try {
    await prepare(page, ctx, cdp, scene);
    const frame = await page.locator(".phone-body").boundingBox();
    if (frame.width !== 410 || frame.height !== 864)
      throw Error("Unexpected mobile viewport");
    const total = Math.round(
      (chapter.end - chapter.start - cardDuration) * fps,
    );
    const wall = performance.now();
    for (let i = 0; i < total; i++) {
      const t = i / fps;
      if (scene === "ar") await setWalkFrame(page, 12.95 + t);
      if (scene === "return" && i === Math.round(5.12 * fps)) {
        await ctx.setGeolocation(start);
        await page
          .getByRole("heading", { name: "Jesteś przy punkcie startu" })
          .waitFor();
      }
      const action = events[scene]?.find(([at]) => Math.round(at * fps) === i);
      if (action) {
        const position = await touch(page, cdp, action[1]);
        taps.push({ t, ...position });
        if (scene === "return" && action[1] === back) {
          await page.locator(".am-leg-return").waitFor();
          await page.locator(".phone-scroll").evaluate((el) => {
            el.scrollTop = 0;
          });
        }
      }
      if (scene === "guide") {
        await new Promise((done) =>
          setTimeout(done, Math.max(0, wall + t * 1000 - performance.now())),
        );
        if (
          changedStep === null &&
          (await page
            .getByRole("heading", { name: "Odsuń się na polecenie AED" })
            .count())
        )
          changedStep = t;
      } else {
        await page.clock.runFor(i % 3 === 0 ? 34 : 33);
      }
      const capture = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 94,
        fromSurface: true,
        captureBeyondViewport: false,
        clip: { ...frame, scale: 1 },
      });
      if (!encoder.stdin.write(Buffer.from(capture.data, "base64")))
        await once(encoder.stdin, "drain");
    }
    // Verify recorded UI results before promoting a clip into the renderer.
    if (scene === "map") await page.locator(directions).waitFor();
    if (scene === "help" && (await page.locator(cancel).count()))
      throw Error("Countdown was not cancelled");
    if (scene === "return")
      await page
        .getByRole("heading", { name: /pomoc|reakcję/i })
        .first()
        .waitFor({ timeout: 3000 });
    if (scene === "guide" && changedStep === null)
      throw Error("The actual microphone did not advance the guide");
    encoder.stdin.end();
    if ((await finished)[0] !== 0) throw Error("Video encoder failed");
    await rename(pending, path.join(out, scene + ".mp4"));
    await writeFile(
      path.join(out, scene + ".json"),
      JSON.stringify({ fps, taps, changedStep }),
    );
    console.log(
      scene,
      total + " frames",
      taps.length + " touches",
      changedStep === null
        ? ""
        : "voice advanced at " + changedStep.toFixed(2) + "s",
    );
  } catch (e) {
    encoder.stdin.destroy();
    encoder.kill();
    await rm(pending, { force: true });
    throw e;
  } finally {
    await ctx.close();
  }
}
await mkdir(out, { recursive: true });
const command = path.join(out, "komenda-dalej.wav");
execFileSync("ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-i",
  path.join(root, "assets", "komenda-dalej.wav"),
  "-af",
  "adelay=1700:all=1,apad=pad_dur=8",
  command,
]);
const browser = await chromium.launch({
  channel: process.env.AED_CHROME_CHANNEL || "chrome",
  headless: true,
  args: [
    "--hide-scrollbars",
    "--force-color-profile=srgb",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--use-file-for-fake-audio-capture=" + command,
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
