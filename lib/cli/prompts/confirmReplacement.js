const readline = require("node:readline/promises");

async function confirmReplacement({ existingEvent, nextEvent, session, input = process.stdin, output = process.stdout }) {
  const prompt = `Type the event slug to continue [${existingEvent.slug}]: `;

  if (typeof session?.question === "function") {
    output.write(
      `Replacing existing event \"${existingEvent.name}\" (${existingEvent.slug}) with \"${nextEvent.name}\". This is destructive.\n`
    );
    const answer = (await session.question(prompt)).trim();
    return answer === existingEvent.slug;
  }

  const rl = readline.createInterface({ input, output });

  try {
    output.write(
      `Replacing existing event \"${existingEvent.name}\" (${existingEvent.slug}) with \"${nextEvent.name}\". This is destructive.\n`
    );
    const answer = (await rl.question(prompt)).trim();
    return answer === existingEvent.slug;
  } finally {
    rl.close();
  }
}

module.exports = {
  confirmReplacement,
};
