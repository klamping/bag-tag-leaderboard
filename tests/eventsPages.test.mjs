import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import EventsPage from "../app/events/page.js";
import EventScoreboardPage from "../app/events/[slug]/page.js";

test("/events renders heading and links to event detail pages", () => {
  const markup = renderToStaticMarkup(
    EventsPage({
      loadEvents: () => [
        { slug: "spring-open", name: "Spring Open", eventDate: "2026-03-09" },
        { slug: "summer-showdown", name: "Summer Showdown", eventDate: "2026-05-20" },
      ],
    })
  );

  assert.match(markup, /<h1>Events<\/h1>/);
  assert.match(markup, /<a href="\/events\/spring-open">Spring Open<\/a>/);
  assert.match(markup, /<a href="\/events\/summer-showdown">Summer Showdown<\/a>/);
});

test("/events renders empty state when no public events exist", () => {
  const markup = renderToStaticMarkup(EventsPage({ loadEvents: () => [] }));

  assert.match(markup, /No public events yet\./);
});

test("/events uses demo fixtures when demo=1", () => {
  const markup = renderToStaticMarkup(EventsPage({ searchParams: { demo: "1" } }));

  assert.match(markup, /<a href="\/events\/e1\?demo=1">initial-no-tags<\/a>/);
  assert.match(markup, /<a href="\/events\/e2\?demo=1">major-doubled<\/a>/);
  assert.match(markup, /<a href="\/events\/e3\?demo=1">normal-mixed-participation<\/a>/);
});

test("/events calls injected loader through page boundary", () => {
  let receivedArgs = null;

  renderToStaticMarkup(
    EventsPage({
      loadEvents: (...args) => {
        receivedArgs = args;
        return [];
      },
    })
  );

  assert.deepEqual(receivedArgs, []);
});

test("/events/:slug renders scoreboard columns and rows", () => {
  const markup = renderToStaticMarkup(
    EventScoreboardPage({
      params: { slug: "may-major" },
      loadEvent: () => ({
        slug: "may-major",
        name: "May Major",
        eventDate: "2026-05-01",
        scoreboard: [
          {
            playerId: "p1",
            playerName: "Ada",
            startingTag: 4,
            attendance: 2,
            eventResult: 1,
            placement: 8,
            startingTagBonus: 2,
            tagOneBonus: 0,
            beatYourTagBonus: 3,
            eventTotal: 15,
          },
        ],
      }),
    })
  );

  assert.match(markup, /<h1>May Major<\/h1>/);
  assert.match(markup, /<th scope="col">Player<\/th>/);
  assert.match(markup, /<th scope="col">Starting Tag<\/th>/);
  assert.match(markup, /<th scope="col">Attendance<\/th>/);
  assert.match(markup, /<th scope="col">Event Result<\/th>/);
  assert.match(markup, /<th scope="col">Placement<\/th>/);
  assert.match(markup, /<th scope="col">Starting Tag Bonus<\/th>/);
  assert.match(markup, /<th scope="col">Tag #1 Bonus<\/th>/);
  assert.match(markup, /<th scope="col">Beat Your Tag Bonus<\/th>/);
  assert.match(markup, /<th scope="col">Event Total<\/th>/);
  assert.match(markup, /<td>Ada<\/td><td>4<\/td><td>2<\/td><td>1<\/td><td>8<\/td><td>2<\/td><td>0<\/td><td>3<\/td><td>15<\/td>/);
});

test("/events/:slug renders empty scoreboard state", () => {
  const markup = renderToStaticMarkup(
    EventScoreboardPage({
      params: { slug: "empty-event" },
      loadEvent: () => ({
        slug: "empty-event",
        name: "Empty Event",
        eventDate: "2026-05-01",
        scoreboard: [],
      }),
    })
  );

  assert.match(markup, /No scores posted for this event yet\./);
  assert.match(markup, /<td colSpan="9">No scores posted for this event yet\.<\/td>/);
});

test("/events/:slug calls notFound when slug is missing", () => {
  let called = false;

  const rendered = EventScoreboardPage({
    params: { slug: "missing" },
    loadEvent: () => null,
    notFoundHandler: () => {
      called = true;
      return null;
    },
  });

  assert.equal(called, true);
  assert.equal(rendered, null);
});

test("/events/:slug calls injected loader with slug through page boundary", () => {
  let capturedSlug = null;

  renderToStaticMarkup(
    EventScoreboardPage({
      params: { slug: "spring-open" },
      loadEvent: ({ slug }) => {
        capturedSlug = slug;
        return {
          slug,
          name: "Spring Open",
          eventDate: "2026-03-09",
          scoreboard: [],
        };
      },
    })
  );

  assert.equal(capturedSlug, "spring-open");
});

test("/events/:slug uses demo fixtures when demo=1", () => {
  const markup = renderToStaticMarkup(
    EventScoreboardPage({
      params: { slug: "e1" },
      searchParams: { demo: "1" },
    })
  );

  assert.match(markup, /<h1>initial-no-tags<\/h1>/);
  assert.match(markup, /<td>Alex<\/td>/);
  assert.doesNotMatch(markup, /<td><\/td>/);
});
