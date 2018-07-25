import updateRouter from '../../helpers/express/create-route';
import { getProjectId } from '../../helpers/request-data';
import { ADMIN_ROLE } from '../../db/model/user';

import {
  removeUser,
  removeUsers,
} from '../../services/service-users';

// ======================================================
// remove
// ======================================================
/**
 * @see - \src\api\swagger.yaml
 */
const router = updateRouter(
  '/:username/remove',
  async (req, res) => {
    const {
      param: {
        username,
      },
    } = req;

    await removeUser(getProjectId(req), username);
    return res.json();
  },
  {
    roles: [ADMIN_ROLE],
  },
);

// ======================================================
// removeAll
// ======================================================
/**
 * @see - \src\api\swagger.yaml
 */
updateRouter(
  '/removeAll',
  async (req, res) => {
    await removeUsers(getProjectId(req));
    return res.json();
  },
  {
    router,
    roles: [ADMIN_ROLE],
  },
);

export default router;
