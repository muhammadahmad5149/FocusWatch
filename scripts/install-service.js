const { installWindowsService } = require('../utils/serviceInstaller');

if (process.platform !== 'win32') {
  console.error('ScreenGuardianService can only be installed on Windows.');
  process.exit(1);
}

installWindowsService()
  .then((result) => {
    console.log('ScreenGuardianService install result:', result);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
