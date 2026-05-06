const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenGuardian', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  setAdminPassword: (password) => ipcRenderer.invoke('admin:set-password', password),
  confirmExit: (password) => ipcRenderer.invoke('admin:confirm-exit', password),
  getServiceStatus: () => ipcRenderer.invoke('service:status'),
  openScreenshotFolder: () => ipcRenderer.invoke('folders:open-screenshots'),
  readLogs: () => ipcRenderer.invoke('logs:read'),
  openLogs: () => ipcRenderer.invoke('logs:open'),
  onRequestAdminExit: (callback) => {
    ipcRenderer.on('request-admin-exit', callback);
  }
});
