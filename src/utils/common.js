import lodashDifference from 'lodash/difference';
import crypto from 'crypto';

// todo @ANKU @LOW - можно потом сделать jwt токен и удобно проверять expire
/*
 https://github.com/auth0/node-jsonwebtoken#tokenexpirederror
 jwt.verify(token, 'secret', function(err, decoded) {
 if (err) {

 // err = {
 // name: 'TokenExpiredError',
 // message: 'jwt expired',
 // expiredAt: 1408621000
 // }
 }
});
if(decodedToken.exp < dateNow.getTime())
 */
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

export function includes(first, second, emptyIsInclude = false, allIncludes = false) {
  const firstA = wrapToArray(first);
  const secondA = wrapToArray(second);

  if (secondA.length === 0) {
    return emptyIsInclude;
  }
  if (firstA.length === 0) {
    return false;
  }

  return firstA[allIncludes ? 'every' : 'some']((firstValue) => secondA.includes(firstValue));
}

export function difference(source, minusValues) {
  return lodashDifference(wrapToArray(source), wrapToArray(minusValues));
}

// https://www.npmjs.com/package/destroy-circular
function destroyCircular(from, seen) {
  const to = Array.isArray(from) ? [] : {};
  seen.push(from);

  for (const key of Object.keys(from)) {
    const value = from[key];
    if (typeof value === 'function') {
      continue;
    }
    if (!value || typeof value !== 'object') {
      to[key] = value;
      continue;
    }
    if (seen.indexOf(from[key]) === -1) {
      to[key] = destroyCircular(from[key], seen.slice(0));
      continue;
    }
    to[key] = '[Circular]';
  }
  if (typeof from.name === 'string') {
    to.name = from.name;
  }
  if (typeof from.message === 'string') {
    to.message = from.message;
  }
  if (typeof from.stack === 'string') {
    to.stack = from.stack;
  }
  return to;
}

// from https://github.com/sindresorhus/serialize-error/blob/master/index.js
export function errorToJson(error) {
  if (typeof error === 'object') {
    return destroyCircular(error, []);
  }

  // People sometimes throw things besides Error objects, so…
  if (typeof error === 'function') {
    // JSON.stringify discards functions. We do too, unless a function is thrown directly.
    return `[Function: ${(error.name || 'anonymous')}]`;
  }

  return error;
}
