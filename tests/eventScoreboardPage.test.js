const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");

test("event scoreboard renders stable row and cell test ids", async () => {
  const { default: EventScoreboardPage } = await import("../app/events/[slug]/page.js");

  const html = renderToStaticMarkup(
    EventScoreboardPage({
      params: { slug: "spring-showdown" },
      loadEvent: () => ({
        name: "Spring Showdown",
        scoreboard: [
          {
            playerId: "p1",
            playerName: "Ada",
            startingTag: 4,
            attendance: 1,
            eventResult: 2,
            placement: 2,
            startingTagBonus: 1,
            tagOneBonus: 0,
            beatYourTagBonus: 0,
            eventTotal: 4,
          },
        ],
      }),
      notFoundHandler: () => {
        throw new Error("notFound should not be called");
      },
    })
  );

  assert.match(html, /data-testid="event-scoreboard-row-p1"/);
  assert.match(html, /data-testid="event-scoreboard-player-p1">Ada</);
  assert.match(html, /data-testid="event-scoreboard-starting-tag-p1">4</);
  assert.match(html, /data-testid="event-scoreboard-attendance-p1">1</);
  assert.match(html, /data-testid="event-scoreboard-event-result-p1">2</);
  assert.match(html, /data-testid="event-scoreboard-placement-p1">2</);
  assert.match(html, /data-testid="event-scoreboard-starting-tag-bonus-p1">1</);
  assert.match(html, /data-testid="event-scoreboard-tag-one-bonus-p1">0</);
  assert.match(html, /data-testid="event-scoreboard-beat-your-tag-bonus-p1">0</);
  assert.match(html, /data-testid="event-scoreboard-total-p1">4</);
});
