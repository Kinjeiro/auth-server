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

      if (
        (permissions.length > 0 && diffPermissions.length === permissions.length)
        || (roles.length > 0 && diffRoles.length === roles.length)
      ) {
        throw new PermissionError(
          roles.length > 0 && diffRoles.length === roles.length ? roles : null,
          permissions.length > 0 && diffPermissions.length === permissions.length ? permissions : null,
        );
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
    // они передадуться в createPermissionHandlers
    // permissions = [],
    // roles = [],
  } = options;

  const handlers = [];
  if (auth) {
    // req.authInfo берет `info` из `BearerStrategy`.
    handlers.push(middlewareBearerStrategy);
  }
  handlers.push(createPermissionHandlers(options));

  if (Array.isArray(handler)) {
    handlers.push(...handler);
  } else {
    handlers.push(handler);
  }

  if (handlers.length > 0) {
    router[method.toLowerCase()](
      url,
      ...handlers.map((handlerItem) => asyncHandlerWrapper(handlerItem)),
    );
  }

  return router;
}

export default createRoute;
