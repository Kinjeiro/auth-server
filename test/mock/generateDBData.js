import '../../src/db/init-models';
import { fillDataBase } from '../../src/db/db-utils';

import {
  CLIENTS,
  USERS,
} from './db-mock';

export default fillDataBase({
  Client: Object.values(CLIENTS),
  User: Object.values(USERS),
}, {
  disconnect: true,
  dropOther: true,
});
