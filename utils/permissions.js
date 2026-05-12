const path = require('path');
const { execFile } = require('child_process');
const { getDataRoot } = require('./paths');

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

async function protectWindowsDataDirectory(dataRoot) {
  if (process.platform !== 'win32') {
    return { protected: false, reason: 'Not Windows' };
  }

  await run('icacls.exe', [
    dataRoot,
    '/inheritance:r',
    '/grant:r',
    '*S-1-5-18:(OI)(CI)F',
    '*S-1-5-32-544:(OI)(CI)F',
    '/remove:g',
    '*S-1-5-32-545',
    '*S-1-5-11',
    '*S-1-1-0',
    '/remove:d',
    '*S-1-5-32-545',
    '*S-1-5-11',
    '*S-1-1-0',
    '/T',
    '/C'
  ]);

  return { protected: true };
}

async function grantWindowsReadOnlyAccess(targetPath) {
  if (process.platform !== 'win32') {
    return { updated: false, reason: 'Not Windows' };
  }

  await run('icacls.exe', [
    targetPath,
    '/grant:r',
    '*S-1-5-32-545:(OI)(CI)RX',
    '/T',
    '/C'
  ]);

  return { updated: true };
}

async function grantWindowsCaptureWriteAccess(targetPath) {
  if (process.platform !== 'win32') {
    return { updated: false, reason: 'Not Windows' };
  }

  await run('icacls.exe', [
    targetPath,
    '/grant',
    '*S-1-5-32-545:(OI)(CI)W',
    '/T',
    '/C'
  ]);

  return { updated: true };
}

async function grantWindowsFileReadOnlyAccess(targetPath) {
  if (process.platform !== 'win32') {
    return { updated: false, reason: 'Not Windows' };
  }

  try {
    await run('attrib.exe', ['-R', targetPath]);
  } catch {}

  await run('icacls.exe', [
    targetPath,
    '/inheritance:r',
    '/grant:r',
    '*S-1-5-18:F',
    '*S-1-5-32-544:F',
    '*S-1-5-32-545:R'
  ]);

  return { updated: true };
}

async function grantWindowsRootTraverseAccess(targetPath) {
  if (process.platform !== 'win32') {
    return { updated: false, reason: 'Not Windows' };
  }

  await run('icacls.exe', [
    targetPath,
    '/grant:r',
    '*S-1-5-32-545:RX'
  ]);

  return { updated: true };
}

async function repairWindowsProtectedSettingsPermissions(settingsPath) {
  if (process.platform !== 'win32') {
    return { updated: false, reason: 'Not Windows' };
  }

  const dataRoot = getDataRoot();
  const normalizedSettingsPath = path.resolve(settingsPath);
  const normalizedDataRoot = path.resolve(dataRoot);

  await protectWindowsDataDirectory(normalizedDataRoot);
  await grantWindowsRootTraverseAccess(normalizedDataRoot);
  await grantWindowsFileReadOnlyAccess(normalizedSettingsPath);

  return { updated: true };
}

module.exports = {
  grantWindowsCaptureWriteAccess,
  grantWindowsFileReadOnlyAccess,
  grantWindowsReadOnlyAccess,
  grantWindowsRootTraverseAccess,
  repairWindowsProtectedSettingsPermissions,
  protectWindowsDataDirectory
};
