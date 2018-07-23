import {
  CLIENTS,
  USERS,
} from '../mock/db-mock';

import { fillDataBase } from '../../src/db/db-utils';

import { GRANT_TYPE_PARAM_VALUES } from '../../src/auth/authorization-oauth2';

export const testClient = CLIENTS.dashboard;
export const testUser = USERS.ivanovI;

export async function getTestToken(user = testUser, client = testClient, dropBase = true) {
  if (dropBase) {
    await fillDataBase({
      Client: [client],
      User: [user],
    }, {
      dropOther: true,
    });
  }

  const {
    body: {
      access_token: accessToken,
    },
  } = await chai.request(server)
    .post('/api/auth/signin')
    .send({
      grant_type: GRANT_TYPE_PARAM_VALUES.password,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      username: user.username,
      password: user.password,
    });

  return accessToken;
}

export default getTestToken;
