import health from './health';
import auth from './auth';

export const API_PREFIX = 'api';
const apiPrefixStr = `/${API_PREFIX}`;

export default function applyRoutes(expressApp) {
  expressApp.use(`${apiPrefixStr}/health`, health);
  expressApp.use(`${apiPrefixStr}/auth`, auth);
}
