const os = require('os');
const path = require('path');
require('./env');
const { isDevelopmentMode } = require('./env');

const APP_NAME = 'ScreenGuardian';

function getProjectRoot() {
  return path.resolve(__dirname, '..');
}

function getDataRoot() {
  if (process.env.SCREEN_GUARDIAN_DATA_DIR) {
    return path.resolve(process.env.SCREEN_GUARDIAN_DATA_DIR);
  }

  if (process.platform === 'win32') {
    if (isDevelopmentMode()) {
      return path.join(getProjectRoot(), '.data');
    }

    return path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', APP_NAME);
  }

  return path.join(getProjectRoot(), '.data');
}

function getScreenshotRoot() {
  return path.join(getDataRoot(), 'screenshots');
}

function getLogsRoot() {
  return path.join(getDataRoot(), 'logs');
}

function getActivityLogPath() {
  return path.join(getLogsRoot(), 'activity.log');
}

function getSettingsPath() {
  return path.join(getDataRoot(), 'settings.json');
}

function getServiceScriptPath() {
  return path.join(getProjectRoot(), 'service', 'index.js');
}

function getNodeExecutablePath() {
  return process.execPath;
}

function getCurrentUsername() {
  try {
    return os.userInfo().username;
  } catch {
    return 'unknown';
  }
}

module.exports = {
  APP_NAME,
  getActivityLogPath,
  getCurrentUsername,
  getDataRoot,
  getLogsRoot,
  getNodeExecutablePath,
  getProjectRoot,
  getScreenshotRoot,
  getServiceScriptPath,
  getSettingsPath
};
