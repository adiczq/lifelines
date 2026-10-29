import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";

const FPS = 25;
const DURATION = 44;
const WIDTH = 1080;
const HEIGHT = 1920;

const OUTPUT = "public/lifelines.mp4";
const URL = "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });

const page = await browser.newPage({
  viewport: {
    width: WIDTH + 80,
    height: HEIGHT + 100,
  },
  deviceScaleFactor: 1,
});

let ffmpeg;

try {
  page.on("pageerror", (error) => {
    console.error("Błąd przeglądarki:", error.message);
  });

  // Otwieramy aplikację LifeLines.
  const response = await page.goto(URL, {
    waitUntil: "load",
  });

  console.log("HTTP:", response?.status());

  if (!response?.ok()) {
    throw new Error("Nie udało się otworzyć aplikacji.");
  }

  // Czekamy na SVG.
  const svg = page.locator("svg[data-lifelines-frame]");

  await svg.waitFor({ timeout: 15000 });

  console.log("SVG znaleziony.");

  // Czekamy na funkcję sterującą animacją.
  await page.waitForFunction(() => typeof window.setLifeLinesTime === "function", null, {
    timeout: 15000,
  });

  console.log("Sterowanie animacją gotowe.");

  // Czekamy na załadowanie czcionek.
  await page.evaluate(() => document.fonts.ready);

  // Ustawiamy rozdzielczość eksportu.
  await svg.evaluate((element) => {
    const wrapper = element.parentElement;

    if (!wrapper) {
      throw new Error("Brak kontenera SVG.");
    }

    wrapper.style.setProperty("width", "1080px", "important");
    wrapper.style.setProperty("height", "1920px", "important");
    wrapper.style.setProperty("max-width", "none", "important");
    wrapper.style.setProperty("aspect-ratio", "auto", "important");
    wrapper.style.setProperty("border-radius", "0", "important");
    wrapper.style.setProperty("box-shadow", "none", "important");

    element.style.setProperty("width", "1080px", "important");
    element.style.setProperty("height", "1920px", "important");
  });

  // Uruchamiamy FFmpeg.
  ffmpeg = spawn("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "image2pipe",
    "-framerate",
    String(FPS),
    "-c:v",
    "png",
    "-i",
    "pipe:0",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    OUTPUT,
  ]);

  let ffmpegErrors = "";

  ffmpeg.stderr.on("data", (chunk) => {
    ffmpegErrors += chunk.toString();
  });

  const finished = new Promise((resolve, reject) => {
    ffmpeg.on("error", reject);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg: ${ffmpegErrors}`));
      }
    });
  });

  const totalFrames = FPS * DURATION;

  console.log(`Rozpoczynam eksport ${totalFrames} klatek...`);

  // Eksportujemy klatki.
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / FPS;

    // Ustawiamy czas animacji bezpośrednio w React.
    await page.evaluate((value) => {
      window.setLifeLinesTime(value);
    }, t);

    // Czekamy na wyrenderowanie właściwej klatki.
    await page.waitForFunction(
      (value) => {
        const element = document.querySelector("svg[data-lifelines-frame]");

        return element?.getAttribute("data-lifelines-frame") === value.toFixed(4);
      },
      t,
      { timeout: 15000 },
    );

    // Zapisujemy klatkę SVG jako PNG.
    const png = await svg.screenshot({
      type: "png",
      scale: "css",
    });

    // Przekazujemy obraz do FFmpeg.
    if (!ffmpeg.stdin.write(png)) {
      await once(ffmpeg.stdin, "drain");
    }

    // Informacja o postępie.
    if (frame % FPS === 0) {
      process.stdout.write(`\rEksport: ${Math.floor(t)} / ${DURATION} s`);
    }
  }

  // Kończymy kodowanie.
  ffmpeg.stdin.end();

  await finished;

  console.log(`\nGotowe! Film zapisany: ${OUTPUT}`);
} catch (error) {
  if (ffmpeg && !ffmpeg.killed) {
    ffmpeg.stdin.destroy();
    ffmpeg.kill();
  }

  console.error("\nBłąd eksportu:", error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
