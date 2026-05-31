const crypto = require("node:crypto");

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_TOKEN_VERSION = "admin-session-v1";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 30;

function resolveNow(nowProvider) {
  return typeof nowProvider === "function" ? nowProvider() : new Date();
}

function toEpochSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

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

function createAdminSessionToken({
  now = () => new Date(),
  nonce = crypto.randomBytes(16).toString("hex"),
} = {}) {
  const sharedSecret = getAdminSharedSecret();
  const issuedAt = toEpochSeconds(resolveNow(now));
  const payload = `${ADMIN_SESSION_TOKEN_VERSION}.${issuedAt}.${nonce}`;
  const signature = crypto
    .createHmac("sha256", sharedSecret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

function isAdminSessionTokenValid(
  sessionToken,
  { now = () => new Date(), maxAgeSeconds = ADMIN_SESSION_MAX_AGE_SECONDS } = {}
) {
  if (typeof sessionToken !== "string") {
    return false;
  }

  const parts = sessionToken.split(".");
  if (parts.length !== 4) {
    return false;
  }

  const [version, issuedAtValue, nonce, providedSignature] = parts;
  if (version !== ADMIN_SESSION_TOKEN_VERSION) {
    return false;
  }

  const issuedAt = Number(issuedAtValue);
  if (!Number.isInteger(issuedAt)) {
    return false;
  }

  const currentEpochSeconds = toEpochSeconds(resolveNow(now));
  const ageInSeconds = currentEpochSeconds - issuedAt;
  if (ageInSeconds < 0 || ageInSeconds > maxAgeSeconds) {
    return false;
  }

  const sharedSecret = getAdminSharedSecret();
  const payload = `${version}.${issuedAt}.${nonce}`;
  const expectedSignature = crypto
    .createHmac("sha256", sharedSecret)
    .update(payload)
    .digest("hex");

  return timingSafeStringEqual(providedSignature, expectedSignature);
}

function getAdminCookieOptions(nodeEnv) {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: nodeEnv === "production",
  };
}

function isAdminAuthenticated({
  getCookiesStore = () => require("next/headers").cookies(),
  validateSessionToken = isAdminSessionTokenValid,
} = {}) {
  const sessionToken = getCookiesStore().get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return false;
  }

  return validateSessionToken(sessionToken);
}

function requireAdmin({
  isAuthenticated = isAdminAuthenticated,
  redirectTo = require("next/navigation").redirect,
  loginPath = "/admin/login",
} = {}) {
  const authenticated = isAuthenticated();

  if (!authenticated) {
    redirectTo(loginPath);
    return false;
  }

  return true;
}

module.exports = {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  getAdminCookieOptions,
  isAdminAuthenticated,
  isAdminSessionTokenValid,
  requireAdmin,
  verifyAdminSecret,
};
