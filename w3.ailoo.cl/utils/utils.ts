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

export const getSymmetricDifference = (arr1, arr2) => {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);

  // Numbers in list 1 but not in list 2
  const diff1 = arr1.filter(x => !set2.has(x));

  // Numbers in list 2 but not in list 1
  const diff2 = arr2.filter(x => !set1.has(x));

  return [...diff1, ...diff2];
};