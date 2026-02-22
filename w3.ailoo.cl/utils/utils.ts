import crypto from "crypto";
import jwt from "jsonwebtoken";


export function doHash(val) {
  const key = 'optive15';

  // Create the HMAC instance using md5 and the key
  const hmac = crypto.createHmac('md5', key);

  // Update with the input value (ASCII encoding as per your C# code)
  hmac.update(val, 'ascii');

  // Digest the hash as a hex string and convert to uppercase
  return hmac.digest('hex').toUpperCase();
}

export function createToken(pl) {
  const secretKey = process.env.JWT_SECRET;
  const iat = Math.floor(Date.now() / 1000)
  const exp = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30)
  // Create the token
  const token = jwt.sign({...pl, iat, exp}, secretKey);

  return token;
}