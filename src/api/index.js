import health from './health/health';
import auth from './auth/auth';
import apiDocs from './api-docs/router-api-docs';

export const API_PREFIX = 'api';
const apiPrefixStr = `/${API_PREFIX}`;

export default function applyRoutes(expressApp) {
  expressApp.use(`${apiPrefixStr}/health`, health);
  expressApp.use(`${apiPrefixStr}/auth`, auth);

  // todo @ANKU @LOW - If you want to set up routing based on the swagger document checkout swagger-express-router
  // но он не использует swagger-ui
  apiDocs(expressApp, '/api-docs');
  // expressApp.use('/api-docs', apiDocs(expressApp));
}
