const { Scheduler } = require('./scheduler');
const { logEvent } = require('../utils/logger');

const scheduler = new Scheduler();

async function shutdown(signal) {
  await logEvent('Shutdown signal received', { signal });
  await scheduler.stop();
  process.exit(0);
}

process.on('SIGINT', () => {
  shutdown('SIGINT').catch(() => process.exit(1));
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  logEvent('Uncaught service exception', {
    error: error.message,
    stack: error.stack
  }).finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logEvent('Unhandled service rejection', {
    error: error.message,
    stack: error.stack
  }).finally(() => process.exit(1));
});

scheduler.start().catch((error) => {
  logEvent('Failed to start service', {
    error: error.message,
    stack: error.stack
  }).finally(() => process.exit(1));
});
