const { sendScreenshotBatch } = require('../email/mailer');
const { isOnline } = require('../utils/internet');
const { logEvent } = require('../utils/logger');
const { loadSettings } = require('../utils/settings');
const { captureScreenshot, listUnsentScreenshots } = require('./screenshotEngine');
const { loadSentFiles, markFilesSent } = require('./sentStore');

const ONE_MINUTE_MS = 60 * 1000;

function getRandomDelayMs(settings) {
  const min = Math.max(1, Number(settings.screenshots.minIntervalMinutes || 1));
  const max = Math.max(min, Number(settings.screenshots.maxIntervalMinutes || 3));
  const minutes = min + Math.random() * (max - min);

  return Math.round(minutes * ONE_MINUTE_MS);
}

class Scheduler {
  constructor(options = {}) {
    this.timer = null;
    this.stopped = true;
    this.captureScreenshots = options.captureScreenshots !== false;
    this.uploadEmails = options.uploadEmails !== false;
    this.startupMessage = options.startupMessage === undefined ? 'ScreenGuardian service started' : options.startupMessage;
    this.stopMessage = options.stopMessage === undefined ? 'ScreenGuardian service stopped' : options.stopMessage;
    this.errorMessage = options.errorMessage || 'Scheduler cycle failed';
  }

  async start() {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    if (this.startupMessage) {
      await logEvent(this.startupMessage);
    }

    this.scheduleNext(0);
  }

  async stop() {
    this.stopped = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.stopMessage) {
      await logEvent(this.stopMessage);
    }
  }

  scheduleNext(delayMs) {
    if (this.stopped) {
      return;
    }

    this.timer = setTimeout(() => {
      this.runCycle().catch((error) => {
        logEvent(this.errorMessage, {
          error: error.message,
          stack: error.stack
        }).catch(() => {});
      });
    }, delayMs);
  }

  async runCycle() {
    const settings = await loadSettings();

    if (this.captureScreenshots) {
      await captureScreenshot();
    }

    if (this.uploadEmails) {
      await this.tryEmailUpload(settings);
    }

    this.scheduleNext(getRandomDelayMs(settings));
  }

  async tryEmailUpload(settings) {
    if (!settings.email.enabled) {
      return;
    }

    if (!(await isOnline())) {
      await logEvent('Email upload skipped because internet is offline');
      return;
    }

    const sentFiles = await loadSentFiles();
    const pendingFiles = await listUnsentScreenshots(sentFiles);
    const uploadedFiles = await sendScreenshotBatch(settings, pendingFiles);

    if (uploadedFiles.length > 0) {
      await markFilesSent(uploadedFiles);
    }
  }
}

module.exports = {
  Scheduler
};
