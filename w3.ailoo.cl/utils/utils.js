const crypto = require('crypto');

function doHash(val) {
  const key = 'optive15';

  // Create the HMAC instance using md5 and the key
  const hmac = crypto.createHmac('md5', key);

  // Update with the input value (ASCII encoding as per your C# code)
  hmac.update(val, 'ascii');

  // Digest the hash as a hex string and convert to uppercase
  return hmac.digest('hex').toUpperCase();
}

module.exports = { doHash}