const dns = require('dns/promises');

async function isOnline() {
  try {
    await dns.lookup('google.com');
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  isOnline
};
