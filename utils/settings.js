const fs = require('fs/promises');
const { getBooleanEnv, getEnv, getNumberEnv } = require('./env');
const { ensureDir, pathExists } = require('./fileSystem');
const { getDataRoot, getSettingsPath } = require('./paths');

const defaultSettings = {
  admin: {
    passwordHash: '',
    passwordSalt: ''
  },
  email: {
    enabled: getBooleanEnv('SCREEN_GUARDIAN_EMAIL_ENABLED', false),
    from: getEnv('SCREEN_GUARDIAN_EMAIL_FROM'),
    to: getEnv('SCREEN_GUARDIAN_EMAIL_TO'),
    smtp: {
      host: getEnv('SCREEN_GUARDIAN_SMTP_HOST'),
      port: getNumberEnv('SCREEN_GUARDIAN_SMTP_PORT', 587),
      secure: getBooleanEnv('SCREEN_GUARDIAN_SMTP_SECURE', false),
      auth: {
        user: getEnv('SCREEN_GUARDIAN_SMTP_USER'),
        pass: getEnv('SCREEN_GUARDIAN_SMTP_PASS')
      }
    }
  },
  screenshots: {
    minIntervalMinutes: getNumberEnv('SCREEN_GUARDIAN_MIN_INTERVAL_MINUTES', 1),
    maxIntervalMinutes: getNumberEnv('SCREEN_GUARDIAN_MAX_INTERVAL_MINUTES', 3)
  }
};

function mergeSettings(savedSettings = {}) {
  return {
    ...defaultSettings,
    ...savedSettings,
    admin: {
      ...defaultSettings.admin,
      ...savedSettings.admin
    },
    email: {
      ...defaultSettings.email,
      ...savedSettings.email,
      smtp: {
        ...defaultSettings.email.smtp,
        ...(savedSettings.email && savedSettings.email.smtp),
        auth: {
          ...defaultSettings.email.smtp.auth,
          ...(savedSettings.email && savedSettings.email.smtp && savedSettings.email.smtp.auth)
        }
      }
    },
    screenshots: {
      ...defaultSettings.screenshots,
      ...savedSettings.screenshots
    }
  };
}

async function loadSettings() {
  await ensureDir(getDataRoot());

  if (!(await pathExists(getSettingsPath()))) {
    await saveSettings(defaultSettings);
    return mergeSettings();
  }

  const raw = await fs.readFile(getSettingsPath(), 'utf8');
  return mergeSettings(JSON.parse(raw));
}

async function saveSettings(settings) {
  await ensureDir(getDataRoot());
  const merged = mergeSettings(settings);
  await fs.writeFile(getSettingsPath(), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

async function updateSettings(updater) {
  const current = await loadSettings();
  const next = typeof updater === 'function' ? updater(current) : updater;
  return saveSettings(next);
}

module.exports = {
  defaultSettings,
  loadSettings,
  saveSettings,
  updateSettings
};
