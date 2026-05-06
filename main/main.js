const fs = require('fs/promises');
const path = require('path');
const { app, BrowserWindow, Menu, Tray, ipcMain, shell, dialog, nativeImage } = require('electron');
const { Scheduler } = require('../service/scheduler');
const { hasAdminPassword, setAdminPassword, verifyAdminPassword } = require('../utils/auth');
const { installWindowsService } = require('../utils/serviceInstaller');
const { logEvent } = require('../utils/logger');
const { getActivityLogPath, getProjectRoot, getScreenshotRoot } = require('../utils/paths');
const { getServiceStatus } = require('../utils/serviceManager');
const { loadSettings, saveSettings } = require('../utils/settings');

let mainWindow;
let tray;
let isQuitting = false;
const userSessionScheduler = new Scheduler();

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 760,
    minHeight: 560,
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

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVR42mNkYGD4z0AEYBxVSFUBCjAqBqMGjIqhGoxwGgYGhv+QpIYpCpgYtBoAAGDfBBEfXq7fAAAAAElFTkSuQmCC'
  );
  tray = new Tray(icon);
  tray.setToolTip('ScreenGuardian');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open Dashboard',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: 'Exit',
        click: () => {
          mainWindow.show();
          mainWindow.webContents.send('request-admin-exit');
        }
      }
    ])
  );
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

ipcMain.handle('settings:get', async () => {
  const settings = await loadSettings();
  const passwordConfigured = await hasAdminPassword();

  return {
    settings,
    passwordConfigured
  };
});

ipcMain.handle('settings:save', async (_event, nextSettings) => {
  return saveSettings(nextSettings);
});

ipcMain.handle('admin:set-password', async (_event, password) => {
  await setAdminPassword(password);
  return { ok: true };
});

ipcMain.handle('admin:confirm-exit', async (_event, password) => {
  return confirmAndExit(password);
});

ipcMain.handle('service:status', async () => {
  return getServiceStatus();
});

ipcMain.handle('folders:open-screenshots', async () => {
  await fs.mkdir(getScreenshotRoot(), { recursive: true });
  await shell.openPath(getScreenshotRoot());
});

ipcMain.handle('logs:read', async () => {
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
  await fs.mkdir(path.dirname(getActivityLogPath()), { recursive: true });
  await fs.appendFile(getActivityLogPath(), '', 'utf8');
  await shell.openPath(getActivityLogPath());
});

app.whenReady().then(() => {
  createMainWindow();

  try {
    createTray();
  } catch {
    dialog.showWarningBox('ScreenGuardian', 'Tray icon could not be loaded.');
  }

  installWindowsService().catch((error) => {
    dialog.showWarningBox(
      'ScreenGuardian Service',
      `Could not install ScreenGuardianService automatically. Run as Administrator and try again.\n\n${error.message}`
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
