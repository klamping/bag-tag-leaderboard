const { isConfirmedEvent } = require("./isConfirmedEvent");

const DEFAULT_EVENTS_DATA = {
  players: [],
  events: [
    {
      id: "evt_confirmed_0001",
      slug: "spring-showdown",
      name: "Spring Showdown",
      eventDate: "2026-04-12",
      status: "confirmed",
    },
  ],
  eventResults: [],
  eventPoints: [],
};

const EVENTS_DATA = cloneStore(DEFAULT_EVENTS_DATA);

function cloneStore(data) {
  return {
    players: data.players.map((player) => ({ ...player })),
    events: data.events.map((event) => ({ ...event })),
    eventResults: data.eventResults.map((result) => ({ ...result })),
    eventPoints: data.eventPoints.map((point) => ({ ...point })),
  };
}

function replaceRows(target, rows) {
  target.length = 0;
  target.push(...rows);
}

function getNextId(rows, prefix) {
  let maxNumber = 0;

  for (const row of rows) {
    const match = typeof row?.id === "string" ? row.id.match(new RegExp(`^${prefix}_(\\d+)$`)) : null;
    if (!match) {
      continue;
    }

    maxNumber = Math.max(maxNumber, Number(match[1]));
  }

  return `${prefix}_${String(maxNumber + 1).padStart(4, "0")}`;
}

function getNextNumber(rows, prefix) {
  const nextId = getNextId(rows, prefix);
  return Number(nextId.slice(prefix.length + 1));
}

async function deleteRowById(rows, id) {
  const index = rows.findIndex((row) => row?.id === id);
  if (index >= 0) {
    rows.splice(index, 1);
  }
}

function getEventsData() {
  return EVENTS_DATA;
}

function resetEventsData(overrides = null) {
  const nextData = cloneStore(DEFAULT_EVENTS_DATA);

  if (overrides) {
    if (Array.isArray(overrides.players)) {
      nextData.players = overrides.players.map((player) => ({ ...player }));
    }

    if (Array.isArray(overrides.events)) {
      nextData.events = overrides.events.map((event) => ({ ...event }));
    }

    if (Array.isArray(overrides.eventResults)) {
      nextData.eventResults = overrides.eventResults.map((result) => ({ ...result }));
    }

    if (Array.isArray(overrides.eventPoints)) {
      nextData.eventPoints = overrides.eventPoints.map((point) => ({ ...point }));
    }
  }

  replaceRows(EVENTS_DATA.players, nextData.players);
  replaceRows(EVENTS_DATA.events, nextData.events);
  replaceRows(EVENTS_DATA.eventResults, nextData.eventResults);
  replaceRows(EVENTS_DATA.eventPoints, nextData.eventPoints);

  return EVENTS_DATA;
}

async function findConfirmedEventBySlug(slug) {
  return EVENTS_DATA.events.find(
    (event) => event.slug === slug && isConfirmedEvent(event)
  ) || null;
}

async function insertPlayer(payload) {
  const player = {
    ...payload,
    id: getNextId(EVENTS_DATA.players, "player"),
  };

  EVENTS_DATA.players.push(player);
  return player;
}

async function deletePlayer(id) {
  await deleteRowById(EVENTS_DATA.players, id);
}

async function insertConfirmedEvent(payload) {
  const event = {
    ...payload,
    id: getNextId(EVENTS_DATA.events, "evt_confirmed"),
    confirmed: true,
    status: "confirmed",
  };

  EVENTS_DATA.events.push(event);
  return event;
}

async function deleteConfirmedEvent(id) {
  await deleteRowById(EVENTS_DATA.events, id);
}

async function insertEventResults(rows) {
  const startingNumber = getNextNumber(EVENTS_DATA.eventResults, "result");
  const insertedRows = rows.map((row, index) => ({
    ...row,
    id: `result_${String(startingNumber + index).padStart(4, "0")}`,
  }));

  EVENTS_DATA.eventResults.push(...insertedRows);
  return insertedRows;
}

async function deleteEventResult(id) {
  await deleteRowById(EVENTS_DATA.eventResults, id);
}

async function insertEventPoints(rows) {
  const startingNumber = getNextNumber(EVENTS_DATA.eventPoints, "point");
  const insertedRows = rows.map((row, index) => ({
    ...row,
    id: `point_${String(startingNumber + index).padStart(4, "0")}`,
  }));

  EVENTS_DATA.eventPoints.push(...insertedRows);
  return insertedRows;
}

async function deleteEventPoint(id) {
  await deleteRowById(EVENTS_DATA.eventPoints, id);
}

module.exports = {
  getEventsData,
  resetEventsData,
  findConfirmedEventBySlug,
  insertPlayer,
  deletePlayer,
  insertConfirmedEvent,
  deleteConfirmedEvent,
  insertEventResults,
  deleteEventResult,
  insertEventPoints,
  deleteEventPoint,
};
