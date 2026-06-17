const he = require("he");
const { LEADERBOARD_SEASON, getSeasonLeaderboardRows } = require("../leaderboardQuery");
const { isConfirmedEvent } = require("../isConfirmedEvent");
const {
  listPublicEvents,
  getPublicEventScoreboardBySlug,
} = require("../publicEventsQuery");

function toPublicEvents(events) {
  return events.map((event) => ({
    ...event,
    confirmed: true,
    season: Number.parseInt(String(event.eventDate).slice(0, 4), 10),
  }));
}

function toPublicEventResults(results) {
  return results.map((result) => ({
    id: result.id,
    eventId: result.eventId,
    playerId: result.playerId,
    finishPlace: result.finishPlace,
    startingTag: result.startingTag,
  }));
}

function toPublicEventPoints(results) {
  return results.map((result) => ({
    eventResultId: result.id,
    attendance: result.attendancePoints,
    placement: result.placementPoints,
    startingTagBonus: result.startingTagBonusPoints,
    tagOneBonus: result.tagOneBonusPoints,
    beatYourTagBonus: result.beatYourTagBonusPoints,
    eventTotal: result.eventTotalPoints,
    points: result.eventTotalPoints,
  }));
}

function findBootstrapEventId(events) {
  if (events.length === 0) {
    return null;
  }

  return [...events]
    .sort((a, b) => {
      if (a.eventDate !== b.eventDate) {
        return a.eventDate.localeCompare(b.eventDate);
      }

      return a.slug.localeCompare(b.slug);
    })[0].id;
}

function sanitizeBootstrapScoreboard(scoreboard, isMajor) {
  const multiplier = isMajor ? 2 : 1;

  return scoreboard.map((row) => ({
    ...row,
    startingTag: null,
    startingTagBonus: 0,
    tagOneBonus: 0,
    beatYourTagBonus: 0,
    eventTotal: (row.attendance + row.placement) * multiplier,
  }));
}

function compareStrings(a, b) {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

function decodeNumericEntity(value, radix) {
  const codePoint = Number.parseInt(value, radix);

  if (
    !Number.isInteger(codePoint) ||
    codePoint <= 0 ||
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
  ) {
    return null;
  }

  return String.fromCodePoint(codePoint);
}

function createMalformedEntityPlaceholder(input, index) {
  let placeholder = `__MALFORMED_HTML_ENTITY_${index}__`;
  let suffix = 0;

  while (input.includes(placeholder)) {
    suffix += 1;
    placeholder = `__MALFORMED_HTML_ENTITY_${index}_${suffix}__`;
  }

  return placeholder;
}

function decodeHtmlEntities(value) {
  const malformedEntities = [];
  const input = String(value || "");
  const protectedValue = input.replace(
    /&#(?:x([\da-f]+)|(\d+));?/gi,
    (entity, hexCodePoint, decimalCodePoint) => {
      const decoded = decodeNumericEntity(
        hexCodePoint || decimalCodePoint,
        hexCodePoint ? 16 : 10
      );

      if (decoded != null) {
        return entity;
      }

      const placeholder = createMalformedEntityPlaceholder(input, malformedEntities.length);
      malformedEntities.push({ placeholder, entity });
      return placeholder;
    }
  );

  let decoded = he.decode(protectedValue);

  for (const malformedEntity of malformedEntities) {
    decoded = decoded.replace(malformedEntity.placeholder, malformedEntity.entity);
  }

  return decoded;
}

function toDisplayScoreboard(scoreboard) {
  return scoreboard
    .map((row) => ({
      ...row,
      playerName: decodeHtmlEntities(row.playerName),
    }))
    .sort((a, b) => {
      const aDidNotFinish = a.eventResult == null;
      const bDidNotFinish = b.eventResult == null;

      if (aDidNotFinish !== bDidNotFinish) {
        return aDidNotFinish ? 1 : -1;
      }

      if (!aDidNotFinish && a.eventResult !== b.eventResult) {
        return a.eventResult - b.eventResult;
      }

      if (a.playerName !== b.playerName) {
        return compareStrings(a.playerName, b.playerName);
      }

      return compareStrings(a.playerId, b.playerId);
    });
}

function toDisplayLeaderboardRows(rows) {
  return rows
    .map((row) => ({
      ...row,
      playerName: decodeHtmlEntities(row.playerName),
    }))
    .sort((a, b) => {
      if (b.seasonPoints !== a.seasonPoints) {
        return b.seasonPoints - a.seasonPoints;
      }

      if (a.playerName !== b.playerName) {
        return compareStrings(a.playerName, b.playerName);
      }

      return compareStrings(a.playerId, b.playerId);
    });
}

function createEmptyHomepageTotals() {
  return {
    attendance: 0,
    placement: 0,
    startingTagBonus: 0,
    tagOneBonus: 0,
    beatYourTagBonus: 0,
    eventTotal: 0,
  };
}

function createHomepageBreakdownRow(eventPage, scoreboardRow) {
  return {
    eventName: eventPage.name,
    eventSlug: eventPage.slug,
    attendance: scoreboardRow.attendance,
    placement: scoreboardRow.placement,
    startingTagBonus: scoreboardRow.startingTagBonus,
    tagOneBonus: scoreboardRow.tagOneBonus,
    beatYourTagBonus: scoreboardRow.beatYourTagBonus,
    eventTotal: scoreboardRow.eventTotal,
  };
}

function compareEventsForHomepageBreakdown(a, b) {
  if (a.eventDate !== b.eventDate) {
    return a.eventDate.localeCompare(b.eventDate);
  }

  return compareStrings(a.slug, b.slug);
}

function buildHomepageBreakdowns(eventPages) {
  const breakdownsByPlayerId = new Map();

  for (const eventPage of [...eventPages].sort(compareEventsForHomepageBreakdown)) {
    for (const row of eventPage.scoreboard) {
      const eventBreakdown = breakdownsByPlayerId.get(row.playerId) || [];
      eventBreakdown.push(createHomepageBreakdownRow(eventPage, row));
      breakdownsByPlayerId.set(row.playerId, eventBreakdown);
    }
  }

  return breakdownsByPlayerId;
}

function sumHomepageTotals(eventBreakdown) {
  return eventBreakdown.reduce(
    (totals, row) => ({
      attendance: totals.attendance + row.attendance,
      placement: totals.placement + row.placement,
      startingTagBonus: totals.startingTagBonus + row.startingTagBonus,
      tagOneBonus: totals.tagOneBonus + row.tagOneBonus,
      beatYourTagBonus: totals.beatYourTagBonus + row.beatYourTagBonus,
      eventTotal: totals.eventTotal + row.eventTotal,
    }),
    createEmptyHomepageTotals()
  );
}

function buildPublicModel(store) {
  const events = toPublicEvents(store.events.items);
  const eventResults = toPublicEventResults(store.results.items);
  const eventPoints = toPublicEventPoints(store.results.items);
  const homepageEventSlugs = new Set(
    events
      .filter((event) => event.season === LEADERBOARD_SEASON && isConfirmedEvent(event))
      .map((event) => event.slug)
  );
  const bootstrapEventId = findBootstrapEventId(events);
  const eventPages = events.map((event) => {
    const page = getPublicEventScoreboardBySlug({
      slug: event.slug,
      players: store.players.items,
      events,
      eventResults,
      eventPoints,
    });

    return {
      ...page,
      isMajor: event.isMajor,
      udiscUrl: event.udiscUrl,
      scoreboard: toDisplayScoreboard(
        event.id === bootstrapEventId
          ? sanitizeBootstrapScoreboard(page.scoreboard, event.isMajor)
          : page.scoreboard
      ),
    };
  });
  const homepageBreakdownsByPlayerId = buildHomepageBreakdowns(
    eventPages.filter((eventPage) => homepageEventSlugs.has(eventPage.slug))
  );

  return {
    siteTitle: "Bag Tag Leaderboard",
    homepage: {
      leaderboardRows: toDisplayLeaderboardRows(
        getSeasonLeaderboardRows({
          players: store.players.items,
          events,
          eventResults,
          eventPoints,
        }).map((row) => {
          const eventBreakdown = homepageBreakdownsByPlayerId.get(row.playerId) || [];
          const totals = sumHomepageTotals(eventBreakdown);

          return {
            ...row,
            seasonPoints: totals.eventTotal,
            eventBreakdown,
            totals,
          };
        })
      ),
      events: listPublicEvents({ events }),
    },
    eventPages,
  };
}

module.exports = {
  buildPublicModel,
};
