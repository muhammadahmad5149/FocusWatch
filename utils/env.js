const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

function getEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function getBooleanEnv(name, fallback = false) {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function getNumberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function isDevelopmentMode() {
  return Boolean(process.defaultApp) || getBooleanEnv('SCREEN_GUARDIAN_DEV_MODE', false);
}

module.exports = {
  getBooleanEnv,
  getEnv,
  getNumberEnv,
  isDevelopmentMode
};
