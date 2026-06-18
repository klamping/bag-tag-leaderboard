const { pathToFileURL } = require("node:url");
const playwright = require("playwright");

async function defaultLaunchBrowser() {
  return playwright.chromium.launch({ headless: true });
}

async function captureSeasonLeaderboardImage(options) {
  const {
    exportPagePath,
    outputPath,
    width,
    height,
    launchBrowser = defaultLaunchBrowser,
  } = options;
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });

    await page.goto(pathToFileURL(exportPagePath).href);

    const seasonLeaderboardImage = page.locator("#season-leaderboard-image");
    const bounds = await seasonLeaderboardImage.boundingBox();

    if (!bounds || bounds.width > width || bounds.height > height) {
      throw new Error(
        `#season-leaderboard-image exceeds the supported ${width}x${height} export bounds.`
      );
    }

    const renderedDimensions = await seasonLeaderboardImage.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
    }));

    if (
      renderedDimensions.scrollWidth > renderedDimensions.clientWidth ||
      renderedDimensions.scrollHeight > renderedDimensions.clientHeight
    ) {
      throw new Error(
        `#season-leaderboard-image exceeds the supported ${width}x${height} export bounds.`
      );
    }

    await seasonLeaderboardImage.screenshot({
      path: outputPath,
      type: "png",
      animations: "disabled",
    });
  } finally {
    await browser.close();
  }
}

module.exports = {
  captureSeasonLeaderboardImage,
  defaultLaunchBrowser,
};
