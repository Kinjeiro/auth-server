import express from 'express';

import { difference } from '../../utils/common';
import PermissionError from '../../models/errors/PermissionError';

import { middlewareBearerStrategy } from '../../auth/authenticate-passport';

/**
 * Чтобы можно было внутри await использовать и правильно обрабатывать ошибки от них
 * @param fn
 * @return {function(*=, *=, *=, ...[*])}
 */
export function asyncHandlerWrapper(fn) {
  return typeof fn === 'function'
    ? (req, res, next, ...args) => {
      const fnReturn = fn(req, res, next, ...args);
      return Promise
        .resolve(fnReturn)
        .catch(next);
    }
    : fn;
}

export function createPermissionHandlers(options) {
  const {
    permissions = [],
    roles = [],
  } = options;

  return (req, res, next) => {
    const {
      user,
    } = req;

    const hasCheck = permissions.length || roles.length;

    if (hasCheck) {
      if (!user) {
        throw new Error('User doesn\'t find');
      }

      const {
        roles: userRoles,
        permissions: userPermissions,
      } = user;

      const diffPermissions = difference(permissions, userPermissions);
      const diffRoles = difference(roles, userRoles);

      if (diffPermissions.length > 0 || diffRoles.length > 0) {
        throw new PermissionError(diffPermissions, diffRoles);
      }
    }

    next();
  };
}

/**
 * @param url
 * @param handler - (req, res) => {} - for req add "user" and "authInfo" properties throw BearerStrategy
 * @param options -
   - auth = true,
   - method = 'get',
   - router = express.Router(),
   - permissions = [],
   - roles = [],
 * @returns {*}
 */
function createRoute(url, handler, options = {}) {
  const {
    auth = true,
    method = 'get',
    router = express.Router(),
    // permissions = [],
    // roles = [],
  } = options;

  const handlers = [];
  if (auth) {
    // req.authInfo берет `info` из `BearerStrategy`.
    handlers.push(middlewareBearerStrategy);
  }
  if (Array.isArray(handler)) {
    handlers.push(...handler);
  } else {
    handlers.push(handler);
  }

  if (handlers.length > 0) {
    router[method.toLowerCase()](
      url,
      createPermissionHandlers(options),
      ...handlers.map((handlerItem) => asyncHandlerWrapper(handlerItem)),
    );
  }

  return router;
}

export default createRoute;
