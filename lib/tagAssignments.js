function assignStartingTagsForSeason(events) {
  const assignedTagByPlayerId = new Map();
  let maxAssignedTag = 0;

  return events.map((event) => {
    const participants = event.participants.map((participant) => {
      const clone = { ...participant };

      if (Number.isInteger(clone.startingTag) && clone.startingTag >= 1) {
        assignedTagByPlayerId.set(clone.playerId, clone.startingTag);
        if (clone.startingTag > maxAssignedTag) {
          maxAssignedTag = clone.startingTag;
        }
      } else if (assignedTagByPlayerId.has(clone.playerId)) {
        clone.startingTag = assignedTagByPlayerId.get(clone.playerId);
      }

      return clone;
    });

    const newPlayers = participants.filter((participant) => !assignedTagByPlayerId.has(participant.playerId));
    if (newPlayers.length > 0) {
      const sharedNewTag = maxAssignedTag + 1;
      const allowsDuplicateStartingTag = newPlayers.length > 1;
      for (const participant of newPlayers) {
        participant.startingTag = sharedNewTag;
        if (allowsDuplicateStartingTag) {
          participant.allowsDuplicateStartingTag = true;
        }
      }

      let nextTag = sharedNewTag;
      for (const participant of newPlayers) {
        assignedTagByPlayerId.set(participant.playerId, nextTag);
        nextTag += 1;
      }
      maxAssignedTag = nextTag - 1;
    }

    return {
      ...event,
      participants,
    };
  });
}

module.exports = {
  assignStartingTagsForSeason,
};
