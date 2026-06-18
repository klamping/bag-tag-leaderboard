const test = require("node:test");
const assert = require("node:assert/strict");

const {
  captureSeasonLeaderboardImage,
} = require("../lib/cli/captureSeasonLeaderboardImage");

test("captureSeasonLeaderboardImage opens the export page and writes a bounded png screenshot", async () => {
  const calls = [];
  const locator = {
    async boundingBox() {
      calls.push({ type: "boundingBox" });
      return { x: 0, y: 0, width: 1080, height: 1350 };
    },
    async screenshot(options) {
      calls.push({ type: "screenshot", options });
    },
  };
  const page = {
    async goto(url) {
      calls.push({ type: "goto", url });
    },
    locator(selector) {
      calls.push({ type: "locator", selector });
      return locator;
    },
  };
  const browser = {
    async newPage(options) {
      calls.push({ type: "newPage", options });
      return page;
    },
    async close() {
      calls.push({ type: "close" });
    },
  };

  await captureSeasonLeaderboardImage({
    exportPagePath: "/tmp/season-leaderboard-image/index.html",
    outputPath: "/tmp/dist/season-leaderboard.png",
    width: 1080,
    height: 1350,
    launchBrowser: async () => browser,
  });

  assert.deepEqual(calls, [
    {
      type: "newPage",
      options: {
        viewport: { width: 1080, height: 1350 },
        deviceScaleFactor: 1,
      },
    },
    {
      type: "goto",
      url: "file:///tmp/season-leaderboard-image/index.html",
    },
    {
      type: "locator",
      selector: "#season-leaderboard-image",
    },
    {
      type: "boundingBox",
    },
    {
      type: "screenshot",
      options: {
        path: "/tmp/dist/season-leaderboard.png",
        type: "png",
        animations: "disabled",
      },
    },
    {
      type: "close",
    },
  ]);
});

test("captureSeasonLeaderboardImage rejects content that exceeds the supported export bounds", async () => {
  let browserClosed = false;
  const locator = {
    async boundingBox() {
      return { x: 0, y: 0, width: 1081, height: 1350 };
    },
    async screenshot() {
      throw new Error("screenshot should not run for overflowing content");
    },
  };
  const page = {
    async goto() {},
    locator(selector) {
      assert.equal(selector, "#season-leaderboard-image");
      return locator;
    },
  };
  const browser = {
    async newPage(options) {
      assert.deepEqual(options, {
        viewport: { width: 1080, height: 1350 },
        deviceScaleFactor: 1,
      });
      return page;
    },
    async close() {
      browserClosed = true;
    },
  };

  await assert.rejects(
    captureSeasonLeaderboardImage({
      exportPagePath: "/tmp/season-leaderboard-image/index.html",
      outputPath: "/tmp/dist/season-leaderboard.png",
      width: 1080,
      height: 1350,
      launchBrowser: async () => browser,
    }),
    /exceeds the supported 1080x1350 export bounds/i
  );

  assert.equal(browserClosed, true);
});
