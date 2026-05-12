const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs/promises');
const { getDataRoot } = require('./paths');
const { isDevelopmentMode } = require('./env');
const { repairWindowsProtectedSettingsPermissions } = require('./permissions');

function run(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function isPermissionError(error) {
  return Boolean(error && ['EACCES', 'EPERM'].includes(error.code));
}

let cachedElevationResult;

function isProtectedSettingsWrite(targetPath) {
  if (process.platform !== 'win32' || isDevelopmentMode()) {
    return false;
  }

  const dataRoot = path.resolve(getDataRoot());
  const candidate = path.resolve(targetPath);

  return candidate === dataRoot || candidate.startsWith(`${dataRoot}${path.sep}`);
}

async function isWindowsProcessElevated() {
  if (process.platform !== 'win32') {
    return false;
  }

  if (cachedElevationResult !== undefined) {
    return cachedElevationResult;
  }

  const command = [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    "$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent()); if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { 'true' } else { 'false' }"
  ];

  try {
    const { stdout } = await run('powershell.exe', command);
    cachedElevationResult = stdout.trim().toLowerCase() === 'true';
  } catch {
    cachedElevationResult = false;
  }

  return cachedElevationResult;
}

async function writeFileWithElevation(targetPath, contents, encoding = 'utf8') {
  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, contents, encoding);
  } catch (error) {
    if (!(process.platform === 'win32' && isPermissionError(error))) {
      throw error;
    }

    if (!isProtectedSettingsWrite(targetPath)) {
      throw error;
    }

    if (await isWindowsProcessElevated()) {
      try {
        await repairWindowsProtectedSettingsPermissions(targetPath);
        await fs.writeFile(targetPath, contents, encoding);
        return;
      } catch (repairError) {
        throw new Error(
          `Protected ScreenGuardian settings could not be saved even though the app is already running as Administrator. Original error: ${error.message}. Repair attempt failed: ${repairError.message}`
        );
      }
    }

    throw new Error(
      'ScreenGuardian must be running with Windows administrator privileges to save protected settings. Close the tray app and relaunch it as Administrator.'
    );
  }
}

module.exports = {
  isPermissionError,
  isProtectedSettingsWrite,
  isWindowsProcessElevated,
  writeFileWithElevation
};
