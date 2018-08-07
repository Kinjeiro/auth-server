import initModels from '../../src/db/init-models';
import { fillDataBase } from '../../src/db/db-utils';
import config from '../../src/config';

import {
  CLIENTS,
  USERS,
} from './db-mock';

console.log('=== SERVER CONFIG ===\n', JSON.stringify(config, null, 2), '\n\n');

initModels();

export default fillDataBase({
  Client: Object.values(CLIENTS),
  User: Object.values(USERS),
}, {
  disconnect: true,
  // dropCollection: true,
  // dropOther: true,
});
