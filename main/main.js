const fs = require('fs/promises');
const path = require('path');
const { app, BrowserWindow, Menu, Tray, ipcMain, shell, dialog, nativeImage } = require('electron');
const { Scheduler } = require('../service/scheduler');
const { hasAdminPassword, setAdminPassword, verifyAdminPassword } = require('../utils/auth');
const { isWindowsProcessElevated } = require('../utils/elevatedWrite');
const { pathExists } = require('../utils/fileSystem');
const { installWindowsService, repairWindowsDataPermissions } = require('../utils/serviceInstaller');
const { logEvent } = require('../utils/logger');
const { getActivityLogPath, getProjectRoot, getScreenshotRoot } = require('../utils/paths');
const { getServiceStatus } = require('../utils/serviceManager');
const { loadSettings, saveSettings } = require('../utils/settings');

let mainWindow;
let tray;
let isQuitting = false;
const userSessionScheduler = new Scheduler({
  captureScreenshots: true,
  uploadEmails: !(process.platform === 'win32' && app.isPackaged),
  startupMessage: process.platform === 'win32' && app.isPackaged ? null : 'ScreenGuardian user-session scheduler started',
  stopMessage: process.platform === 'win32' && app.isPackaged ? null : 'ScreenGuardian user-session scheduler stopped',
  errorMessage: 'User-session scheduler cycle failed'
});
let adminUnlocked = false;

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function assertAdminUnlocked() {
  if (!adminUnlocked) {
    throw new Error('Admin authentication is required.');
  }
}

function createMainWindow() {
  const startInBackground = process.argv.includes('--background');

  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 760,
    minHeight: 560,
    show: !startInBackground,
    title: 'ScreenGuardian',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(getProjectRoot(), 'ui', 'index.html'));

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function configureLoginStartup() {
  if (process.platform !== 'win32') {
    return;
  }

  const loginSettings = app.isPackaged
    ? {
        openAtLogin: true,
        path: process.execPath,
        args: ['--background']
      }
    : {
        openAtLogin: true,
        path: process.execPath,
        args: [getProjectRoot(), '--background']
      };

  app.setLoginItemSettings(loginSettings);
}

function shouldUseWindowsServiceMode() {
  return process.platform === 'win32' && app.isPackaged;
}

async function ensureWindowsServiceReady() {
  if (!shouldUseWindowsServiceMode()) {
    return;
  }

  if (!(await isWindowsProcessElevated())) {
    return;
  }

  await repairWindowsDataPermissions();

  const status = await getServiceStatus();

  if (status.status === 'Running') {
    return;
  }

  await installWindowsService();
}

function updateTrayMenu() {
  if (!tray || !mainWindow) {
    return;
  }

  const template = [
    {
      label: adminUnlocked ? 'Open Admin Dashboard' : 'Open ScreenGuardian Status',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  ];

  if (adminUnlocked) {
    template.push({
      label: 'Exit ScreenGuardian',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('request-admin-exit');
      }
    });
  }

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVR42mNkYGD4z0AEYBxVSFUBCjAqBqMGjIqhGoxwGgYGhv+QpIYpCpgYtBoAAGDfBBEfXq7fAAAAAElFTkSuQmCC'
  );
  tray = new Tray(icon);
  tray.setToolTip('ScreenGuardian');
  updateTrayMenu();
}

async function confirmAndExit(password) {
  const isAllowed = await verifyAdminPassword(password);

  if (!isAllowed) {
    return {
      ok: false,
      message: 'Admin confirmation failed.'
    };
  }

  isQuitting = true;
  app.quit();

  return {
    ok: true
  };
}

ipcMain.handle('admin:login', async (_event, password) => {
  const ok = await verifyAdminPassword(password);

  if (!ok) {
    return {
      ok: false,
      message: 'Admin authentication failed.'
    };
  }

  adminUnlocked = true;
  updateTrayMenu();

  return {
    ok: true,
    settings: await loadSettings(),
    passwordConfigured: await hasAdminPassword()
  };
});

ipcMain.handle('admin:state', async () => {
  return {
    adminUnlocked,
    passwordConfigured: await hasAdminPassword()
  };
});

ipcMain.handle('settings:get', async () => {
  assertAdminUnlocked();
  const settings = await loadSettings();
  const passwordConfigured = await hasAdminPassword();

  return {
    settings,
    passwordConfigured
  };
});

ipcMain.handle('settings:save', async (_event, nextSettings) => {
  assertAdminUnlocked();
  return saveSettings(nextSettings);
});

ipcMain.handle('admin:set-password', async (_event, password) => {
  if (!adminUnlocked && (await hasAdminPassword())) {
    throw new Error('Admin authentication is required.');
  }

  await setAdminPassword(password);
  adminUnlocked = true;
  updateTrayMenu();

  return { ok: true };
});

ipcMain.handle('admin:confirm-exit', async (_event, password) => {
  return confirmAndExit(password);
});

ipcMain.handle('service:status', async () => {
  return getServiceStatus();
});

ipcMain.handle('folders:open-screenshots', async () => {
  assertAdminUnlocked();
  const screenshotRoot = getScreenshotRoot();

  if (!(await pathExists(screenshotRoot))) {
    throw new Error('No screenshots have been captured yet.');
  }

  const openError = await shell.openPath(screenshotRoot);

  if (openError) {
    throw new Error(openError);
  }
});

ipcMain.handle('logs:read', async () => {
  assertAdminUnlocked();
  try {
    return await fs.readFile(getActivityLogPath(), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return '';
    }

    throw error;
  }
});

ipcMain.handle('logs:open', async () => {
  assertAdminUnlocked();
  const activityLogPath = getActivityLogPath();

  if (!(await pathExists(activityLogPath))) {
    throw new Error('No activity logs have been recorded yet.');
  }

  const openError = await shell.openPath(activityLogPath);

  if (openError) {
    throw new Error(openError);
  }
});

app.whenReady().then(() => {
  configureLoginStartup();

  createMainWindow();

  try {
    createTray();
  } catch {
    dialog.showWarningBox('ScreenGuardian', 'Tray icon could not be loaded.');
  }

  ensureWindowsServiceReady().catch((error) => {
    dialog.showWarningBox(
      'ScreenGuardian Service',
      `Could not install or start ScreenGuardianService automatically.\n\n${error.message}`
    );
  });

  userSessionScheduler.start().catch((error) => {
    logEvent('User-session scheduler failed to start', {
      error: error.message,
      stack: error.stack
    }).catch(() => {});
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {});
