const { execFile } = require('child_process');

const SERVICE_NAME = 'ScreenGuardianService';

function runCommand(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout,
        stderr,
        error
      });
    });
  });
}

async function getServiceStatus() {
  if (process.platform !== 'win32') {
    return {
      serviceName: SERVICE_NAME,
      status: 'Unsupported',
      details: 'Windows service status is available only on Windows.'
    };
  }

  const result = await runCommand('sc.exe', ['query', SERVICE_NAME]);

  if (!result.ok) {
    return {
      serviceName: SERVICE_NAME,
      status: 'Stopped',
      details: result.stderr || result.stdout || 'Service is not installed.'
    };
  }

  const output = result.stdout;
  const running = /STATE\s*:\s*\d+\s+RUNNING/i.test(output);

  return {
    serviceName: SERVICE_NAME,
    status: running ? 'Running' : 'Stopped',
    details: output.trim()
  };
}

module.exports = {
  SERVICE_NAME,
  getServiceStatus
};
