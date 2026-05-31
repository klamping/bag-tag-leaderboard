function createUdiscError(type) {
  const error = new Error(type);
  error.type = type;
  return error;
}

const KNOWN_UDISC_ERROR_TYPES = new Set([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "NETWORK_ERROR",
  "UPSTREAM_FORMAT_CHANGED",
]);

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function normalizeNameKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseFinishPlace(value) {
  const number = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function mapStructuredParticipants(items) {
  const participants = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const playerName = stripTags(item.name || item.playerName || item.player || item.competitorName);
    const externalPlayerId = String(item.identifier || item.externalPlayerId || item.playerId || "").trim() || undefined;
    const finishPlace = parseFinishPlace(item.position || item.rank || item.finishPlace || item.place);

    if (!playerName || finishPlace == null) {
      continue;
    }

    participants.push({ playerName, externalPlayerId, finishPlace });
  }
  return participants;
}

function dedupeParticipantsOrThrow(participants) {
  const deduped = [];
  const byIdentity = new Map();

  for (const participant of participants) {
    const key = participant.externalPlayerId
      ? `id:${participant.externalPlayerId}`
      : `name:${normalizeNameKey(participant.playerName)}`;
    const existing = byIdentity.get(key);

    if (!existing) {
      const normalizedParticipant = {
        playerName: participant.playerName,
        finishPlace: participant.finishPlace,
      };
      if (participant.externalPlayerId) {
        normalizedParticipant.externalPlayerId = participant.externalPlayerId;
      }

      byIdentity.set(key, normalizedParticipant);
      deduped.push(normalizedParticipant);
      continue;
    }

    if (existing.finishPlace !== participant.finishPlace) {
      throw createUdiscError("UPSTREAM_FORMAT_CHANGED");
    }
  }

  return deduped;
}

function parseStructuredPayload(html) {
  function collectObjectNodes(root) {
    const nodes = [];
    const stack = [root];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== "object") {
        continue;
      }

      if (!Array.isArray(current)) {
        nodes.push(current);
      }

      for (const value of Object.values(current)) {
        if (value && typeof value === "object") {
          stack.push(value);
        }
      }
    }

    return nodes;
  }

  function parseJsonCandidate(script) {
    const direct = script.trim();
    if (direct.startsWith("{") || direct.startsWith("[")) {
      return JSON.parse(direct);
    }

    const assignmentMatch = script.match(/=\s*([\s\S]*?)\s*;?\s*$/);
    if (assignmentMatch) {
      return JSON.parse(assignmentMatch[1].trim());
    }

    throw new Error("not-json");
  }

  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  for (const scriptBody of scripts) {
    const script = scriptBody.trim();
    if (!script || !/[{\[]/.test(script)) {
      continue;
    }

    try {
      const parsed = parseJsonCandidate(script);
      const candidates = collectObjectNodes(parsed);

      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") {
          continue;
        }

        const participants = mapStructuredParticipants(
          candidate.competitor || candidate.participants || candidate.results || candidate.leaderboard
        );

        if (!participants.length) {
          continue;
        }

        const name = stripTags(candidate.name || candidate.eventName || "");
        const date = normalizeDate(candidate.startDate || candidate.datePublished || candidate.date || "");
        const slugMatch = String(candidate.url || "").match(/\/events\/([^/]+)\/leaderboard/i);
        const slug = slugMatch ? slugMatch[1] : undefined;
        const majorText = `${candidate.description || ""} ${candidate.name || ""}`;
        const isMajor = /\bmajor\b/i.test(majorText) ? true : undefined;

        return {
          name,
          date,
          slug,
          isMajor,
          participants,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function parseFallbackPayload(html) {
  const name = stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]);
  const date = normalizeDate((html.match(/<time[^>]*datetime=["']([^"']+)["'][^>]*>/i) || [])[1]);
  const slugMatch = html.match(/\/events\/([^/]+)\/leaderboard/i);
  const slug = slugMatch ? slugMatch[1] : undefined;
  const isMajor = /\bmajor\b/i.test(html) ? true : undefined;

  const participants = [];
  const rows = [...html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)];

  for (const row of rows) {
    const attrs = row[1] || "";
    const body = row[2] || "";
    const finishPlace = parseFinishPlace((body.match(/class=["'][^"']*place[^"']*["'][^>]*>([^<]+)</i) || [])[1]);
    const playerName = stripTags((body.match(/class=["'][^"']*name[^"']*["'][^>]*>([\s\S]*?)<\/td>/i) || [])[1]);
    const externalPlayerId =
      ((attrs.match(/data-player-id=["']([^"']+)["']/i) || [])[1] || "").trim() || undefined;

    if (!playerName || finishPlace == null) {
      continue;
    }

    participants.push({ playerName, externalPlayerId, finishPlace });
  }

  return {
    name,
    date,
    slug,
    isMajor,
    participants,
  };
}

function parseUdiscEventPayloadOrThrow(html) {
  function normalizeCandidate(candidate) {
    const participants = dedupeParticipantsOrThrow(candidate.participants || []);
    const payload = {
      name: stripTags(candidate.name),
      date: normalizeDate(candidate.date),
      participants,
    };

    if (candidate.slug) {
      payload.slug = candidate.slug;
    }
    if (candidate.isMajor === true) {
      payload.isMajor = true;
    }

    if (!payload.name || !payload.date || payload.participants.length === 0) {
      return null;
    }

    return payload;
  }

  const structured = parseStructuredPayload(html);
  const structuredPayload = structured ? normalizeCandidate(structured) : null;
  if (structuredPayload) {
    return structuredPayload;
  }

  const fallbackPayload = normalizeCandidate(parseFallbackPayload(html));
  if (fallbackPayload) {
    return fallbackPayload;
  }

  throw createUdiscError("UPSTREAM_FORMAT_CHANGED");
}

function parseAndValidateLeaderboardUrl(leaderboardUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(String(leaderboardUrl || "").trim());
  } catch {
    throw createUdiscError("VALIDATION_ERROR");
  }

  const validHost = parsedUrl.hostname === "udisc.com" || parsedUrl.hostname === "www.udisc.com";
  const validProtocol = parsedUrl.protocol === "https:";
  const validPath = /^\/events\/[^/]+\/leaderboard\/?$/.test(parsedUrl.pathname);

  if (!validHost || !validProtocol || !validPath) {
    throw createUdiscError("VALIDATION_ERROR");
  }

  return parsedUrl.toString();
}

async function fetchUdiscEventFromUrl({ leaderboardUrl, fetchImpl = fetch }) {
  const validatedUrl = parseAndValidateLeaderboardUrl(leaderboardUrl);

  try {
    const response = await fetchImpl(validatedUrl);

    if (response.ok) {
      return parseUdiscEventPayloadOrThrow(await response.text());
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
    if (KNOWN_UDISC_ERROR_TYPES.has(error?.type)) {
      throw error;
    }
    throw createUdiscError("NETWORK_ERROR");
  }
}

module.exports = {
  fetchUdiscEventFromUrl,
};
