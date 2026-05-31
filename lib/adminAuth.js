const crypto = require("node:crypto");

const ADMIN_SESSION_COOKIE = "admin_session";

function getAdminSharedSecret() {
  const secret = process.env.ADMIN_SHARED_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SHARED_SECRET must be set");
  }

  return secret;
}

function timingSafeStringEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyAdminSecret(candidateSecret) {
  const sharedSecret = getAdminSharedSecret();
  return timingSafeStringEqual(candidateSecret, sharedSecret);
}

function createAdminSessionToken() {
  const sharedSecret = getAdminSharedSecret();
  return crypto
    .createHmac("sha256", sharedSecret)
    .update(ADMIN_SESSION_COOKIE)
    .digest("hex");
}

function isAdminSessionTokenValid(sessionToken) {
  const expectedToken = createAdminSessionToken();
  return timingSafeStringEqual(sessionToken, expectedToken);
}

module.exports = {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  isAdminSessionTokenValid,
  verifyAdminSecret,
};
