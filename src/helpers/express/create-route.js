import express from 'express';

import { middlewareBearerStrategy } from '../../auth/authenticate-passport';

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

  router[method.toLowerCase()](url, ...handlers);

  return router;
}

export default createRoute;
