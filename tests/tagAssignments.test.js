const test = require("node:test");
const assert = require("node:assert/strict");

const { assignStartingTagsForSeason } = require("../lib/tagAssignments");

test("assigns duplicate highest+1 starting tag to all new players in an event, then expands pool", () => {
  const seasonEvents = [
    {
      id: "e1",
      participants: [
        { playerId: "p1", finishPlace: 1, startingTag: 1 },
        { playerId: "p2", finishPlace: 2, startingTag: 2 },
      ],
    },
    {
      id: "e2",
      participants: [
        { playerId: "p1", finishPlace: 1, startingTag: 1 },
        { playerId: "p3", finishPlace: 2 },
        { playerId: "p4", finishPlace: 3 },
      ],
    },
    {
      id: "e3",
      participants: [
        { playerId: "p3", finishPlace: 1 },
        { playerId: "p4", finishPlace: 2 },
      ],
    },
  ];

  const assigned = assignStartingTagsForSeason(seasonEvents);

  assert.equal(assigned[1].participants[1].startingTag, 3);
  assert.equal(assigned[1].participants[2].startingTag, 3);
  assert.equal(assigned[1].participants[1].allowsDuplicateStartingTag, true);
  assert.equal(assigned[1].participants[2].allowsDuplicateStartingTag, true);
  assert.equal(assigned[2].participants[0].startingTag, 3);
  assert.equal(assigned[2].participants[1].startingTag, 4);
});
