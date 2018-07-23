import crypto from 'crypto';

export function generateTokenValue(bytesLength = 32) {
  return crypto.randomBytes(bytesLength).toString('hex');
}
