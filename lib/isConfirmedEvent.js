function isConfirmedEvent(event) {
  if (typeof event?.confirmed === "boolean") {
    return event.confirmed;
  }

  return event?.status === "confirmed";
}

module.exports = {
  isConfirmedEvent,
};
