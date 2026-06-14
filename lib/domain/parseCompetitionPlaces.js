function parseCompetitionPlaces(participants) {
  const places = participants
    .filter((participant) => Number.isInteger(participant.finishPlace))
    .map((participant) => participant.finishPlace)
    .sort((a, b) => a - b);

  for (let index = 0; index < places.length; ) {
    const place = places[index];
    let tiedCount = 1;

    while (places[index + tiedCount] === place) {
      tiedCount += 1;
    }

    if (place !== index + 1) {
      throw new Error("Finish places must follow competition ranking");
    }

    index += tiedCount;
  }

  return places;
}

module.exports = {
  parseCompetitionPlaces,
};
