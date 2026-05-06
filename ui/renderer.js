const fields = {
  serviceStatus: document.getElementById('serviceStatus'),
  refreshStatus: document.getElementById('refreshStatus'),
  adminLoginPanel: document.getElementById('adminLoginPanel'),
  adminLoginHelp: document.getElementById('adminLoginHelp'),
  adminLoginPassword: document.getElementById('adminLoginPassword'),
  adminLoginButton: document.getElementById('adminLoginButton'),
  adminLoginMessage: document.getElementById('adminLoginMessage'),
  adminContent: document.getElementById('adminContent'),
  emailEnabled: document.getElementById('emailEnabled'),
  smtpHost: document.getElementById('smtpHost'),
  smtpPort: document.getElementById('smtpPort'),
  smtpUser: document.getElementById('smtpUser'),
  smtpPass: document.getElementById('smtpPass'),
  smtpSecure: document.getElementById('smtpSecure'),
  emailFrom: document.getElementById('emailFrom'),
  emailTo: document.getElementById('emailTo'),
  saveSettings: document.getElementById('saveSettings'),
  adminPassword: document.getElementById('adminPassword'),
  setAdminPassword: document.getElementById('setAdminPassword'),
  passwordState: document.getElementById('passwordState'),
  openScreenshots: document.getElementById('openScreenshots'),
  openLogs: document.getElementById('openLogs'),
  viewLogs: document.getElementById('viewLogs'),
  exitApp: document.getElementById('exitApp'),
  clearLogView: document.getElementById('clearLogView'),
  logOutput: document.getElementById('logOutput'),
  exitDialog: document.getElementById('exitDialog'),
  exitPassword: document.getElementById('exitPassword'),
  confirmExit: document.getElementById('confirmExit')
};

let currentSettings;
let passwordConfigured = false;

function setStatusText(message, type = 'unknown') {
  fields.serviceStatus.textContent = message;
  fields.serviceStatus.className = `status status-${type}`;
}

function showMessage(message) {
  fields.logOutput.textContent = message;
}

function showAdminLoginMessage(message) {
  fields.adminLoginMessage.textContent = message;
}

function setAdminContentVisible(isVisible) {
  fields.adminContent.classList.toggle('hidden', !isVisible);
  fields.adminLoginPanel.classList.toggle('hidden', isVisible);
}

function configureLoginPanel(state) {
  passwordConfigured = Boolean(state.passwordConfigured);

  if (passwordConfigured) {
    fields.adminLoginHelp.textContent = 'Enter the ScreenGuardian admin password to manage settings and logs.';
    fields.adminLoginPassword.placeholder = 'Admin password';
    fields.adminLoginButton.textContent = 'Unlock Dashboard';
  } else {
    fields.adminLoginHelp.textContent = 'Create the first ScreenGuardian admin password to unlock protected controls.';
    fields.adminLoginPassword.placeholder = 'New admin password';
    fields.adminLoginButton.textContent = 'Create Admin Password';
  }

  setAdminContentVisible(Boolean(state.adminUnlocked));
}

function fillSettings(settings) {
  currentSettings = settings;
  fields.emailEnabled.checked = Boolean(settings.email.enabled);
  fields.smtpHost.value = settings.email.smtp.host;
  fields.smtpPort.value = settings.email.smtp.port;
  fields.smtpUser.value = settings.email.smtp.auth.user;
  fields.smtpPass.value = settings.email.smtp.auth.pass;
  fields.smtpSecure.checked = Boolean(settings.email.smtp.secure);
  fields.emailFrom.value = settings.email.from;
  fields.emailTo.value = settings.email.to;
}

function collectSettings() {
  return {
    ...currentSettings,
    email: {
      ...currentSettings.email,
      enabled: fields.emailEnabled.checked,
      from: fields.emailFrom.value.trim(),
      to: fields.emailTo.value.trim(),
      smtp: {
        ...currentSettings.email.smtp,
        host: fields.smtpHost.value.trim(),
        port: Number(fields.smtpPort.value || 587),
        secure: fields.smtpSecure.checked,
        auth: {
          user: fields.smtpUser.value.trim(),
          pass: fields.smtpPass.value
        }
      }
    }
  };
}

async function refreshStatus() {
  setStatusText('Checking...', 'unknown');
  const status = await window.screenGuardian.getServiceStatus();
  const normalized = status.status.toLowerCase();
  const type = normalized === 'running' ? 'running' : normalized === 'stopped' ? 'stopped' : 'unknown';
  setStatusText(status.status, type);
}

async function loadProtectedState(existingSettings) {
  const result = existingSettings
    ? { settings: existingSettings, passwordConfigured }
    : await window.screenGuardian.getSettings();

  fillSettings(result.settings);
  fields.passwordState.textContent = result.passwordConfigured
    ? 'Admin password is configured.'
    : 'No admin password is configured.';
  setAdminContentVisible(true);
}

async function handleAdminUnlock() {
  const password = fields.adminLoginPassword.value;

  try {
    if (passwordConfigured) {
      const result = await window.screenGuardian.adminLogin(password);

      if (!result.ok) {
        showAdminLoginMessage(result.message);
        return;
      }

      passwordConfigured = result.passwordConfigured;
      fields.adminLoginPassword.value = '';
      showAdminLoginMessage('');
      await loadProtectedState(result.settings);
      return;
    }

    await window.screenGuardian.setAdminPassword(password);
    fields.adminLoginPassword.value = '';
    showAdminLoginMessage('');
    passwordConfigured = true;
    await loadProtectedState();
  } catch (error) {
    showAdminLoginMessage(error.message);
  }
}

async function loadInitialState() {
  const state = await window.screenGuardian.getAdminState();
  configureLoginPanel(state);

  if (state.adminUnlocked) {
    await loadProtectedState();
  }

  await refreshStatus();
}

fields.refreshStatus.addEventListener('click', () => {
  refreshStatus().catch((error) => showMessage(error.message));
});

fields.adminLoginButton.addEventListener('click', () => {
  handleAdminUnlock().catch((error) => showAdminLoginMessage(error.message));
});

fields.adminLoginPassword.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    handleAdminUnlock().catch((error) => showAdminLoginMessage(error.message));
  }
});

fields.saveSettings.addEventListener('click', async () => {
  try {
    currentSettings = await window.screenGuardian.saveSettings(collectSettings());
    showMessage('Email settings saved.');
  } catch (error) {
    showMessage(`Failed to save settings: ${error.message}`);
  }
});

fields.setAdminPassword.addEventListener('click', async () => {
  try {
    await window.screenGuardian.setAdminPassword(fields.adminPassword.value);
    fields.adminPassword.value = '';
    fields.passwordState.textContent = 'Admin password is configured.';
    showMessage('Admin password saved.');
  } catch (error) {
    showMessage(`Failed to set password: ${error.message}`);
  }
});

fields.openScreenshots.addEventListener('click', () => {
  window.screenGuardian.openScreenshotFolder().catch((error) => showMessage(error.message));
});

fields.openLogs.addEventListener('click', () => {
  window.screenGuardian.openLogs().catch((error) => showMessage(error.message));
});

fields.viewLogs.addEventListener('click', async () => {
  try {
    const logs = await window.screenGuardian.readLogs();
    fields.logOutput.textContent = logs || 'No activity has been logged yet.';
  } catch (error) {
    showMessage(`Failed to read logs: ${error.message}`);
  }
});

fields.exitApp.addEventListener('click', () => {
  fields.exitPassword.value = '';
  fields.exitDialog.showModal();
});

fields.clearLogView.addEventListener('click', () => {
  fields.logOutput.textContent = 'Logs will appear here.';
});

fields.confirmExit.addEventListener('click', async () => {
  const result = await window.screenGuardian.confirmExit(fields.exitPassword.value);

  if (!result.ok) {
    showMessage(result.message);
    return;
  }

  fields.exitDialog.close();
});

window.screenGuardian.onRequestAdminExit(() => {
  fields.exitPassword.value = '';
  fields.exitDialog.showModal();
});

loadInitialState().catch((error) => showMessage(error.message));
