import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (message) => {
  if (message.type() === "error") {
    console.log("CONSOLE ERROR:", message.text());
  }
});

page.on("pageerror", (error) => {
  console.log("JAVASCRIPT ERROR:", error.message);
});

page.on("requestfailed", (request) => {
  console.log("REQUEST FAILED:", request.url(), request.failure()?.errorText);
});

page.on("response", (response) => {
  if (response.status() >= 400) {
    console.log("HTTP ERROR:", response.status(), response.url());
  }
});

try {
  const response = await page.goto("http://127.0.0.1:3000", {
    waitUntil: "load",
  });

  console.log("\nHTTP:", response?.status());

  // Dajemy Reactowi czas na uruchomienie.
  await page.waitForTimeout(3000);

  const svg = page.locator("svg[data-lifelines-frame]");

  const before = await svg.getAttribute("data-lifelines-frame");

  console.log("Klatka początkowa:", before);

  const bridge = await page.evaluate(() => typeof window.setLifeLinesTime);

  console.log("Funkcja eksportu:", bridge);

  // Testujemy prawdziwy przycisk Reacta.
  const playButton = page.getByRole("button", {
    name: "Odtwórz",
  });

  await playButton.click();
  await page.waitForTimeout(1500);

  const after = await svg.getAttribute("data-lifelines-frame");

  console.log("Klatka po odtworzeniu:", after);
  console.log("Przycisk:", await playButton.textContent());

  console.log("Skrypty Next.js:", await page.locator('script[src*="_next"]').count());

  if (before !== after) {
    console.log("\n✅ React działa w Playwright!");
  } else {
    console.log("\n❌ React nie zaktualizował animacji.");
  }
} finally {
  await browser.close();
}
