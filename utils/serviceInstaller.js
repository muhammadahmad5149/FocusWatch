const { execFile } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const { ensureDir } = require('./fileSystem');
const { logEvent } = require('./logger');
const { protectWindowsDataDirectory } = require('./permissions');
const { getDataRoot, getLogsRoot, getProjectRoot } = require('./paths');
const { SERVICE_NAME } = require('./serviceManager');

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

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function serviceExists() {
  try {
    await run('sc.exe', ['query', SERVICE_NAME]);
    return true;
  } catch {
    return false;
  }
}

async function removeExistingService() {
  if (!(await serviceExists())) {
    return;
  }

  try {
    await run('sc.exe', ['stop', SERVICE_NAME]);
  } catch {}

  await run('sc.exe', ['delete', SERVICE_NAME]);
}

async function installWindowsService() {
  if (process.platform !== 'win32') {
    return { installed: false, reason: 'Not Windows' };
  }

  const serviceRoot = path.join(getDataRoot(), 'config', 'service');
  const serviceExe = path.join(serviceRoot, `${SERVICE_NAME}.exe`);
  const serviceXml = path.join(serviceRoot, `${SERVICE_NAME}.xml`);
  const winswSource = path.join(getProjectRoot(), 'node_modules', 'node-windows', 'bin', 'winsw', 'winsw.exe');

  await ensureDir(serviceRoot);
  await ensureDir(getLogsRoot());
  await protectWindowsDataDirectory(getDataRoot());
  await fs.copyFile(winswSource, serviceExe);

  const serviceArguments = process.versions.electron
    ? '--service'
    : `"${path.join(getProjectRoot(), 'main', 'bootstrap.js')}" --service`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<service>
  <id>${escapeXml(SERVICE_NAME)}</id>
  <name>${escapeXml(SERVICE_NAME)}</name>
  <description>ScreenGuardian background screenshot capture service.</description>
  <executable>${escapeXml(process.execPath)}</executable>
  <arguments>${escapeXml(serviceArguments)}</arguments>
  <workingdirectory>${escapeXml(getProjectRoot())}</workingdirectory>
  <startmode>Automatic</startmode>
  <logpath>${escapeXml(getLogsRoot())}</logpath>
  <log mode="roll-by-size">
    <sizeThreshold>10485760</sizeThreshold>
    <keepFiles>8</keepFiles>
  </log>
  <env name="SCREEN_GUARDIAN_DATA_DIR" value="${escapeXml(getDataRoot())}" />
  <onfailure action="restart" delay="10 sec" />
</service>
`;

  await fs.writeFile(serviceXml, xml, 'utf8');
  await removeExistingService();
  await run(serviceExe, ['install']);
  await run('sc.exe', ['config', SERVICE_NAME, 'start=', 'auto']);
  await run('sc.exe', [
    'failure',
    SERVICE_NAME,
    'reset=',
    '86400',
    'actions=',
    'restart/10000/restart/30000/restart/60000'
  ]);
  await run('sc.exe', ['failureflag', SERVICE_NAME, '1']);
  await run(serviceExe, ['start']);
  await logEvent('Windows service installed with WinSW wrapper');

  return { installed: true };
}

module.exports = {
  installWindowsService
};
