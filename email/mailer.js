const path = require('path');
const nodemailer = require('nodemailer');
const { logEvent } = require('../utils/logger');

const MAX_ATTACHMENTS_PER_EMAIL = 10;

function hasEmailConfig(settings) {
  const email = settings.email || {};
  const smtp = email.smtp || {};
  const auth = smtp.auth || {};

  return Boolean(
    email.enabled &&
      email.from &&
      email.to &&
      smtp.host &&
      smtp.port &&
      auth.user &&
      auth.pass
  );
}

function createTransport(settings) {
  const smtp = settings.email.smtp;

  return nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port),
    secure: Boolean(smtp.secure),
    auth: {
      user: smtp.auth.user,
      pass: smtp.auth.pass
    }
  });
}

function chunkFiles(files, chunkSize) {
  const chunks = [];

  for (let index = 0; index < files.length; index += chunkSize) {
    chunks.push(files.slice(index, index + chunkSize));
  }

  return chunks;
}

async function sendScreenshotBatch(settings, screenshotFiles) {
  if (!hasEmailConfig(settings) || screenshotFiles.length === 0) {
    return [];
  }

  const transport = createTransport(settings);
  const sentFiles = [];

  for (const batch of chunkFiles(screenshotFiles, MAX_ATTACHMENTS_PER_EMAIL)) {
    const attachments = batch.map((filePath) => ({
      filename: path.basename(filePath),
      path: filePath
    }));

    await transport.sendMail({
      from: settings.email.from,
      to: settings.email.to,
      subject: `ScreenGuardian screenshots (${batch.length})`,
      text: 'Attached are locally captured ScreenGuardian screenshots.',
      attachments
    });

    sentFiles.push(...batch);
    await logEvent('Email batch sent', {
      count: batch.length,
      files: batch
    });
  }

  return sentFiles;
}

module.exports = {
  hasEmailConfig,
  sendScreenshotBatch
};
