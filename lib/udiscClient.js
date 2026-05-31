function createUdiscError(type) {
  const error = new Error(type);
  error.type = type;
  return error;
}

function parseAndValidateLeaderboardUrl(leaderboardUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(String(leaderboardUrl || "").trim());
  } catch {
    throw createUdiscError("VALIDATION_ERROR");
  }

  const validHost = parsedUrl.hostname === "udisc.com" || parsedUrl.hostname === "www.udisc.com";
  const validPath = /^\/events\/[^/]+\/leaderboard\/?$/.test(parsedUrl.pathname);

  if (!validHost || !validPath) {
    throw createUdiscError("VALIDATION_ERROR");
  }

  return parsedUrl.toString();
}

async function fetchUdiscEventFromUrl({ leaderboardUrl, fetchImpl = fetch }) {
  const validatedUrl = parseAndValidateLeaderboardUrl(leaderboardUrl);

  try {
    const response = await fetchImpl(validatedUrl);

    if (response.ok) {
      return { html: await response.text() };
    }

    if (response.status === 404) {
      throw createUdiscError("NOT_FOUND");
    }
    if (response.status === 429) {
      throw createUdiscError("RATE_LIMITED");
    }
    if (response.status >= 500) {
      throw createUdiscError("UPSTREAM_ERROR");
    }

    throw createUdiscError("UPSTREAM_ERROR");
  } catch (error) {
    if (error?.type) {
      throw error;
    }
    throw createUdiscError("NETWORK_ERROR");
  }
}

module.exports = {
  fetchUdiscEventFromUrl,
};
