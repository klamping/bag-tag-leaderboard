const readline = require("node:readline/promises");

async function confirmDelete({ event, session, input = process.stdin, output = process.stdout }) {
  const prompt = `Type the event slug \"${event.slug}\" to confirm deletion: `;

  if (typeof session?.question === "function") {
    const answer = await session.question(prompt);
    return answer.trim() === event.slug;
  }

  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(prompt);
    return answer.trim() === event.slug;
  } finally {
    rl.close();
  }
}

module.exports = {
  confirmDelete,
};
