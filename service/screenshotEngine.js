const fs = require('fs/promises');
const path = require('path');
const screenshot = require('screenshot-desktop');
const { ensureDir } = require('../utils/fileSystem');
const { logEvent } = require('../utils/logger');
const { getScreenshotRoot } = require('../utils/paths');

function getDateFolderName(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getTimestampFileName(date = new Date()) {
  return `${date.toISOString().replace(/[:.]/g, '-')}.png`;
}

async function captureScreenshot() {
  const now = new Date();
  const dayDir = path.join(getScreenshotRoot(), getDateFolderName(now));
  await ensureDir(dayDir);

  const filePath = path.join(dayDir, getTimestampFileName(now));
  const imageBuffer = await screenshot({ format: 'png' });
  await fs.writeFile(filePath, imageBuffer);

  await logEvent('Screenshot captured', { filePath });
  return filePath;
}

async function listUnsentScreenshots(sentFiles = []) {
  const sent = new Set(sentFiles);
  const root = getScreenshotRoot();
  const files = [];

  try {
    const dayEntries = await fs.readdir(root, { withFileTypes: true });

    for (const dayEntry of dayEntries) {
      if (!dayEntry.isDirectory()) {
        continue;
      }

      const dayDir = path.join(root, dayEntry.name);
      const imageEntries = await fs.readdir(dayDir, { withFileTypes: true });

      for (const imageEntry of imageEntries) {
        if (!imageEntry.isFile() || path.extname(imageEntry.name).toLowerCase() !== '.png') {
          continue;
        }

        const filePath = path.join(dayDir, imageEntry.name);
        if (!sent.has(filePath)) {
          files.push(filePath);
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return files.sort();
}

module.exports = {
  captureScreenshot,
  listUnsentScreenshots
};
