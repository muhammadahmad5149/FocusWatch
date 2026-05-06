const { execFile } = require('child_process');
const { SERVICE_NAME } = require('../utils/serviceManager');

if (process.platform !== 'win32') {
  console.error('ScreenGuardianService can only be uninstalled on Windows.');
  process.exit(1);
}

function run(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function uninstall() {
  await run('sc.exe', ['stop', SERVICE_NAME]);
  const result = await run('sc.exe', ['delete', SERVICE_NAME]);

  if (result.error) {
    console.error(result.stderr || result.stdout || result.error.message);
    process.exit(1);
  }

  console.log(`${SERVICE_NAME} uninstalled.`);
}

uninstall().catch((error) => {
  console.error(error);
  process.exit(1);
});
