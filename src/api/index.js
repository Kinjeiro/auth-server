import config from '../config';

import health from './health/health';
import auth from './auth/auth';
import apiDocs from './api-docs/router-api-docs';
import users from './users/users';

export const API_PREFIX = 'api';
const apiPrefixStr = `/${API_PREFIX}`;
const contextPathStr = config.common.app.contextPath
  ? `/${config.common.app.contextPath}`
  : '';

export default function applyRoutes(expressApp) {
  expressApp.use(`${contextPathStr}${apiPrefixStr}/health`, health);
  expressApp.use(`${contextPathStr}${apiPrefixStr}/auth`, auth);

  // todo @ANKU @LOW - If you want to set up routing based on the swagger document checkout swagger-express-router
  // но он не использует swagger-ui
  apiDocs(expressApp, `${contextPathStr}/api-docs`);
  // expressApp.use('/api-docs', apiDocs(expressApp));

  expressApp.use(`${contextPathStr}${apiPrefixStr}/users`, users);
}
