const crypto = require("node:crypto");

const { getAdminScoreboardSeasonFixture } = require("./adminScoreboardSeason.js");

const PLAYWRIGHT_TEST_SECRET_HEADER = "x-playwright-test-secret";

function isPlaywrightTestModeEnabled({ env = process.env } = {}) {
  return env.PLAYWRIGHT_TEST_MODE === "true";
}

function timingSafeStringEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isValidPlaywrightTestRequest({ headers, env = process.env } = {}) {
  if (!isPlaywrightTestModeEnabled({ env })) {
    return false;
  }

  const configuredSecret = env.PLAYWRIGHT_TEST_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const submittedSecret = headers?.get?.(PLAYWRIGHT_TEST_SECRET_HEADER) || "";
  return timingSafeStringEqual(submittedSecret, configuredSecret);
}

function resolvePlaywrightFixtureForLeaderboardUrl({ leaderboardUrl, env = process.env } = {}) {
  if (!isPlaywrightTestModeEnabled({ env })) {
    return null;
  }

  return getAdminScoreboardSeasonFixture(leaderboardUrl);
}

module.exports = {
  PLAYWRIGHT_TEST_SECRET_HEADER,
  isPlaywrightTestModeEnabled,
  isValidPlaywrightTestRequest,
  resolvePlaywrightFixtureForLeaderboardUrl,
};
