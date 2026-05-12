const fs = require('fs/promises');
const { ensureDir } = require('./fileSystem');
const { getActivityLogPath, getLogsRoot } = require('./paths');

async function logEvent(message, metadata = {}) {
  try {
    await ensureDir(getLogsRoot());

    const entry = {
      timestamp: new Date().toISOString(),
      message,
      ...metadata
    };

    await fs.appendFile(getActivityLogPath(), `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    if (!['EACCES', 'EPERM'].includes(error.code)) {
      throw error;
    }
  }
}

module.exports = {
  logEvent
};
