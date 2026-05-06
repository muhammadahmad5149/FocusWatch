const fs = require('fs/promises');
const path = require('path');
const { ensureDir, pathExists } = require('../utils/fileSystem');
const { getDataRoot } = require('../utils/paths');

const SENT_STORE_FILE = path.join(getDataRoot(), 'sent-screenshots.json');

async function loadSentFiles() {
  await ensureDir(getDataRoot());

  if (!(await pathExists(SENT_STORE_FILE))) {
    return [];
  }

  const raw = await fs.readFile(SENT_STORE_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.sentFiles) ? parsed.sentFiles : [];
}

async function markFilesSent(filePaths) {
  const current = await loadSentFiles();
  const merged = Array.from(new Set([...current, ...filePaths])).sort();
  await fs.writeFile(SENT_STORE_FILE, JSON.stringify({ sentFiles: merged }, null, 2), 'utf8');
  return merged;
}

module.exports = {
  loadSentFiles,
  markFilesSent
};
