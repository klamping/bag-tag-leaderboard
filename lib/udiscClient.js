const UDISC_EVENT_ENDPOINT = "https://api.udisc.com/events";

function createUdiscError(type) {
  const error = new Error(type);
  error.type = type;
  return error;
}

async function fetchUdiscEvent({ eventId, token, fetchImpl = fetch }) {
  if (!token) {
    throw createUdiscError("CONFIG_ERROR");
  }

  try {
    const response = await fetchImpl(`${UDISC_EVENT_ENDPOINT}/${encodeURIComponent(String(eventId || "").trim())}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status === 401 || response.status === 403) {
      throw createUdiscError("AUTH_ERROR");
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
  fetchUdiscEvent,
};
