import initModels from '../../src/db/init-models';
import { fillDataBase } from '../../src/db/db-utils';
import config from '../../src/config';

import {
  CLIENTS,
  USERS,
  useMock,
  projectId,
} from './db-mock';

console.log('=== SERVER CONFIG ===\n', JSON.stringify(config, null, 2), '\n\n');

initModels();

async function fillDb() {
  const result = await fillDataBase({
    Client: Object.values(CLIENTS),
    User: Object.values(USERS),
  }, {
    disconnect: true,
    // dropCollection: true,
    // dropOther: true,
    ignoreError: true,
  });

  if (useMock) {
    console.warn('!!! set for your front-core config mock section:');

    result.User
      .filter(({ username }) => username !== 'protector')
      .forEach(({ id, username }) => {
        console.warn(`config.common.features.auth.mockUsers.${username}UserId = '${id}';`);
      });
  }
}

export default fillDb();
