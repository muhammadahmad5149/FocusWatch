const { execFile } = require('child_process');

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

module.exports = {
  protectWindowsDataDirectory
};
