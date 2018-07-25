import lodashDifference from 'lodash/difference';
import crypto from 'crypto';

export function generateTokenValue(bytesLength = 32) {
  return crypto.randomBytes(bytesLength).toString('hex');
}

export function wrapToArray(value = null) {
  return Array.isArray(value)
    ? value
    : value === null || value === ''
      ? []
      : [value];
}

export function includes(first, second) {
  const firstA = wrapToArray(first);
  const secondA = wrapToArray(second);

  if (secondA.length === 0) {
    return true;
  }
  if (firstA.length === 0) {
    return false;
  }

  return firstA.some((firstValue) => second.includes(firstValue));
}

export function difference(first, second) {
  return lodashDifference(wrapToArray(first), wrapToArray(second));
}
