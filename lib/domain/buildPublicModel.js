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

function toKickoffBonusDisplay(value, useDashForZero) {
  if (useDashForZero && value === 0) {
    return "-";
  }

  return value;
}

function addKickoffBonusDisplayFields(row, useDashForZero) {
  return {
    ...row,
    startingTagBonusDisplay: toKickoffBonusDisplay(row.startingTagBonus, useDashForZero),
    tagOneBonusDisplay: toKickoffBonusDisplay(row.tagOneBonus, useDashForZero),
    beatYourTagBonusDisplay: toKickoffBonusDisplay(row.beatYourTagBonus, useDashForZero),
  };
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
  const sortedRows = rows
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

  let previousSeasonPoints = null;
  let previousSeasonStanding = null;

  return sortedRows.map((row, index) => {
    const seasonStanding =
      row.seasonPoints === previousSeasonPoints ? previousSeasonStanding : index + 1;

    previousSeasonPoints = row.seasonPoints;
    previousSeasonStanding = seasonStanding;

    return {
      ...row,
      seasonStanding,
    };
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
    startingTagBonusDisplay: scoreboardRow.startingTagBonusDisplay,
    tagOneBonus: scoreboardRow.tagOneBonus,
    tagOneBonusDisplay: scoreboardRow.tagOneBonusDisplay,
    beatYourTagBonus: scoreboardRow.beatYourTagBonus,
    beatYourTagBonusDisplay: scoreboardRow.beatYourTagBonusDisplay,
    eventTotal: scoreboardRow.eventTotal,
  };
}

function compareEventsForHomepageBreakdown(a, b) {
  if (a.eventDate !== b.eventDate) {
    return a.eventDate.localeCompare(b.eventDate);
  }

  return compareStrings(a.slug, b.slug);
}

function toShortMonthDay(eventDate) {
  const [, month, day] = String(eventDate).split("-");
  return `${Number.parseInt(month, 10)}/${Number.parseInt(day, 10)}`;
}

function toHomepageLeaderboardEvents(homepageEvents) {
  return homepageEvents.map((event) => ({
    slug: event.slug,
    name: event.name,
    eventDate: event.eventDate,
    shortDate: toShortMonthDay(event.eventDate),
    accessibleLabel: `${event.name} on ${event.eventDate}`,
  }));
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

function buildHomepageOverviewByPlayerId(eventPages) {
  const overviewByPlayerId = new Map();

  for (const eventPage of [...eventPages].sort(compareEventsForHomepageBreakdown)) {
    for (const row of eventPage.scoreboard) {
      const playerOverview = overviewByPlayerId.get(row.playerId) || new Map();
      playerOverview.set(eventPage.slug, {
        eventSlug: eventPage.slug,
        shortDate: toShortMonthDay(eventPage.eventDate),
        points: row.eventTotal,
        played: true,
      });
      overviewByPlayerId.set(row.playerId, playerOverview);
    }
  }

  return overviewByPlayerId;
}

function buildHomepageEventOverviewRow(leaderboardEvents, playerOverview) {
  return leaderboardEvents.map((event) => {
    const overviewCell = playerOverview.get(event.slug);

    if (overviewCell) {
      return overviewCell;
    }

    return {
      eventSlug: event.slug,
      shortDate: event.shortDate,
      points: null,
      played: false,
    };
  });
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

function createPointsRules() {
  return {
    summaryTitle: "How points work",
    summaryIntro: "Season standings combine attendance, finish placement, and tag-based bonuses.",
    summaryItems: [
      { label: "Attendance", detail: "2 points for attending an event." },
      {
        label: "Placement",
        detail: "1st gets 8, 2nd 6, 3rd 5, 4th 4, then top-half gets 2 and top-75% gets 1.",
      },
      {
        label: "Starting Tag Bonus",
        detail: "+1 for each player at the event with a worse tag than yours, capped at 6.",
      },
      { label: "Tag #1 Bonus", detail: "+2 if you start the event holding tag #1." },
      {
        label: "Beat Your Tag Bonus",
        detail: "Improve 1-2 spots for +1, 3-4 for +2, and 5+ for +3.",
      },
    ],
    summaryTieNote: "Tied players share placement points.",
    fullPageTitle: "Points Rules",
    fullPageIntro: "Bag tag points come from attendance, finish placement, and tag-based bonuses.",
    sections: [
      {
        title: "Attendance",
        items: ["2 points for attending an event."],
      },
      {
        title: "Event Placement",
        items: [
          "1st place: 8 points",
          "2nd place: 6 points",
          "3rd place: 5 points",
          "4th place: 4 points",
          "Top 50% of the field: 2 points",
          "Top 75% of the field: 1 point",
        ],
      },
      {
        title: "Starting Tag Bonus",
        items: [
          "+1 point for each player at the event with a worse tag than yours.",
          "Maximum of 6 points.",
        ],
      },
      {
        title: "Tag #1 Bonus",
        items: ["+2 points if you start the event with tag #1."],
      },
      {
        title: "Beat Your Tag Bonus",
        items: [
          "Players are ranked at the start of the event by tag among attendees.",
          "Players are ranked again by event results.",
          "Improvement is starting rank minus finishing rank.",
          "Improve by 1-2 positions: +1 point",
          "Improve by 3-4 positions: +2 points",
          "Improve by 5 or more positions: +3 points",
        ],
      },
      {
        title: "Ties",
        items: ["Tied players at the end of the event share placement points."],
      },
      {
        title: "Starting Tag Duplication Rules",
        items: [
          "Duplicate starting tags are allowed only when a player is newly joining mid-season and inherits the entry tag.",
          "Duplicate starting tags are allowed when league policy explicitly assigns the same provisional tag to multiple late joiners.",
          "Duplicate starting tags are not allowed if both players already had established tags before the event.",
          "Duplicate starting tags are not allowed when caused by admin data-entry mistakes.",
          "Duplicate starting tags are not allowed if they conflict with a previously confirmed event assignment and no correction workflow is used.",
          "When duplicate starting tags are allowed, players sharing the same tag share the same starting rank.",
          "No secondary tiebreak is used for starting-rank calculations.",
        ],
      },
    ],
    href: "/points-rules/",
  };
}

function buildPublicModel(store) {
  const pointsRules = createPointsRules();
  const events = toPublicEvents(store.events.items);
  const eventResults = toPublicEventResults(store.results.items);
  const eventPoints = toPublicEventPoints(store.results.items);
  const publicEvents = listPublicEvents({ events });
  const homepageEventSlugs = new Set(
    events
      .filter((event) => event.season === LEADERBOARD_SEASON && isConfirmedEvent(event))
      .map((event) => event.slug)
  );
  const homepageEvents = events
    .filter((event) => homepageEventSlugs.has(event.slug))
    .sort(compareEventsForHomepageBreakdown)
    .map((event) => ({
      slug: event.slug,
      name: event.name,
      eventDate: event.eventDate,
    }));
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
        (event.id === bootstrapEventId
          ? sanitizeBootstrapScoreboard(page.scoreboard, event.isMajor)
          : page.scoreboard
        ).map((row) => addKickoffBonusDisplayFields(row, event.id === bootstrapEventId))
      ),
    };
  });
  const homepageBreakdownsByPlayerId = buildHomepageBreakdowns(
    eventPages.filter((eventPage) => homepageEventSlugs.has(eventPage.slug))
  );
  const leaderboardEvents = toHomepageLeaderboardEvents(homepageEvents);
  const homepageOverviewByPlayerId = buildHomepageOverviewByPlayerId(
    eventPages.filter((eventPage) => homepageEventSlugs.has(eventPage.slug))
  );

  return {
    siteTitle: "Bag Tag Leaderboard",
    pointsRules,
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
          const playerOverview = homepageOverviewByPlayerId.get(row.playerId) || new Map();
          const eventOverview = buildHomepageEventOverviewRow(
            leaderboardEvents,
            playerOverview
          );

          return {
            ...row,
            seasonPoints: totals.eventTotal,
            eventBreakdown,
            totals,
            eventOverview,
          };
        })
      ),
      leaderboardEvents,
      events: publicEvents,
    },
    eventPages,
  };
}

module.exports = {
  buildPublicModel,
};
