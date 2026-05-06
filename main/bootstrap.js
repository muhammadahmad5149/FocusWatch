if (process.argv.includes('--service')) {
  require('../service/index');
} else {
  require('./main');
}
