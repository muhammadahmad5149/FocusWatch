const crypto = require('crypto');
const { loadSettings, saveSettings } = require('./settings');

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');

  return {
    passwordHash,
    passwordSalt: salt
  };
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function hasAdminPassword() {
  const settings = await loadSettings();
  return Boolean(settings.admin.passwordHash && settings.admin.passwordSalt);
}

async function setAdminPassword(password) {
  if (!password || password.length < 8) {
    throw new Error('Admin password must be at least 8 characters.');
  }

  const settings = await loadSettings();
  settings.admin = hashPassword(password);
  await saveSettings(settings);
}

async function verifyAdminPassword(password) {
  const settings = await loadSettings();

  if (!settings.admin.passwordHash || !settings.admin.passwordSalt) {
    return false;
  }

  const candidate = hashPassword(password, settings.admin.passwordSalt);
  return constantTimeEqual(candidate.passwordHash, settings.admin.passwordHash);
}

module.exports = {
  hasAdminPassword,
  setAdminPassword,
  verifyAdminPassword
};
