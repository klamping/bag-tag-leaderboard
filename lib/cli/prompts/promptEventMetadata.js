const readline = require("node:readline/promises");

async function promptEventMetadata({ event, session, input = process.stdin, output = process.stdout }) {
  if (typeof session?.question === "function") {
    const name = (await session.question(`Event name [${event.name}]: `)).trim() || event.name;
    const slug = (await session.question(`Event slug [${event.slug}]: `)).trim() || event.slug;
    const eventDate = (await session.question(`Event date [${event.eventDate}]: `)).trim() || event.eventDate;
    const isMajorAnswer = (await session.question(`Major event? (y/N) [${event.isMajor ? "y" : "n"}]: `)).trim().toLowerCase();

    return {
      name,
      slug,
      eventDate,
      isMajor: isMajorAnswer ? ["y", "yes", "true"].includes(isMajorAnswer) : event.isMajor === true,
    };
  }

  const rl = readline.createInterface({ input, output });

  try {
    const name = (await rl.question(`Event name [${event.name}]: `)).trim() || event.name;
    const slug = (await rl.question(`Event slug [${event.slug}]: `)).trim() || event.slug;
    const eventDate = (await rl.question(`Event date [${event.eventDate}]: `)).trim() || event.eventDate;
    const isMajorAnswer = (await rl.question(`Major event? (y/N) [${event.isMajor ? "y" : "n"}]: `)).trim().toLowerCase();

    return {
      name,
      slug,
      eventDate,
      isMajor: isMajorAnswer ? ["y", "yes", "true"].includes(isMajorAnswer) : event.isMajor === true,
    };
  } finally {
    rl.close();
  }
}

module.exports = {
  promptEventMetadata,
};
