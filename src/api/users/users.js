import updateRouter from '../../helpers/express/create-route';
import { getProjectId } from '../../helpers/request-data';

import {
  ADMIN_ROLE,
  GET_PROTECTED_INFO_ROLE,
} from '../../db/model/user';

import {
  getUser,
  getPublicUserInfo,
  getProtectedUserInfo,
  // getUserAvatar,
  changeUser,
  removeUser,
  removeUsers,
} from '../../services/service-users';


// ======================================================
// get avatar
// ======================================================
/**
 * @see - \src\api\swagger.yaml
 */
const router = updateRouter(
  '/avatar/:username',
  async (req, res) => {
    const {
      params: {
        username,
      },
      user: {
        projectId,
      },
    } = req;

    const user = await getUser(projectId, username);
    res.set({
      'Cache-Control': 'public, max-age=86400', // 24 * 60 * 60 - one day
      ETag: user.updated.toISOString(), // etag - это дата обновления пользователя
    });
    return res.send(user.profileImageURI);
  },
);

// ======================================================
// get public info
// ======================================================
/**
 * @see - \src\api\swagger.yaml
 */
updateRouter(
  '/public/:username',
  async (req, res) => {
    const {
      params: {
        username,
      },
      user: {
        projectId,
      },
    } = req;

    const userInfo = await getPublicUserInfo(projectId, username);
    return res.json(userInfo);
  },
  {
    router,
  },
);

// ======================================================
// get protected info by admin \ protected
// ======================================================
/**
 * @see - \src\api\swagger.yaml
 */
updateRouter(
  '/protected/:username',
  async (req, res) => {
    const {
      params: {
        username,
      },
      user: {
        projectId,
      },
    } = req;

    const userInfo = await getProtectedUserInfo(projectId, username);
    return res.json(userInfo);
  },
  {
    router,
    roles: [ADMIN_ROLE, GET_PROTECTED_INFO_ROLE],
  },
);


// ======================================================
// change user
// ======================================================
/**
 * @see - \src\api\swagger.yaml
 */
updateRouter(
  '/',
  async (req, res) => {
    const {
      user: {
        username,
        projectId,
      },
      body,
    } = req;

    await changeUser(projectId, username, body);
    return res.json();
  },
  {
    router,
    method: 'PUT',
  },
);

// ======================================================
// remove by current user
// ======================================================
/**
 * @see - \src\api\swagger.yaml
 */
updateRouter(
  '/',
  async (req, res) => {
    const {
      user: {
        username,
        projectId,
      },
    } = req;

    await removeUser(projectId, username);
    return res.json();
  },
  {
    router,
    method: 'DELETE',
  },
);


// ======================================================
// change user by admin
// ======================================================
/**
 * @see - \src\api\swagger.yaml
 */
updateRouter(
  '/:username',
  async (req, res) => {
    const {
      params: {
        username,
      },
      body,
      user: {
        projectId,
      },
    } = req;

    await changeUser(projectId, username, body);
    return res.json();
  },
  {
    router,
    method: 'PUT',
    roles: [ADMIN_ROLE],
  },
);

// ======================================================
// remove by admin
// ======================================================
/**
 * @see - \src\api\swagger.yaml
 */
updateRouter(
  '/:username',
  async (req, res) => {
    const {
      params: {
        username,
      },
      user: {
        projectId,
      },
    } = req;

    await removeUser(getProjectId(req) || projectId, username);
    return res.json();
  },
  {
    router,
    method: 'DELETE',
    roles: [ADMIN_ROLE],
  },
);

// ======================================================
// removeAll by admin
// ======================================================
/**
 * @see - \src\api\swagger.yaml
 */
updateRouter(
  '/all',
  async (req, res) => {
    const {
      user: {
        projectId,
      },
    } = req;
    await removeUsers(getProjectId(req) || projectId);
    return res.json();
  },
  {
    router,
    method: 'DELETE',
    roles: [ADMIN_ROLE],
  },
);

export default router;
