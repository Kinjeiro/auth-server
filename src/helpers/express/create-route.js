import express from 'express';

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

/**
 * @param url
 * @param handler - (req, res) => {} - for req add "user" and "authInfo" properties throw BearerStrategy
 * @param opts
 * @returns {*}
 */
function createRoute(url, handler, opts = {}) {
  const {
    auth = true,
    method = 'get',
    router = express.Router(),
  } = opts;

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

  router[method.toLowerCase()](
    url,
    ...handlers.map((handlerItem) => asyncHandlerWrapper(handlerItem)),
  );

  return router;
}

export default createRoute;
