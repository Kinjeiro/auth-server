/* eslint-disable no-param-reassign */
import oauth2orize from 'oauth2orize';

import { generateTokenValue } from '../utils/common';
import config from '../config';
import logger from '../helpers/logger';

import {
  User,
  AccessToken,
  RefreshToken,
} from '../db/model';
import {
  findUserById,
  findUserByName,
} from '../services/service-auth';

import { middlewareBasicAndClientPasswordStrategy } from './authenticate-passport';

// create OAuth 2.0 server
const authServer = oauth2orize.createServer();

// Destroys any old tokens and generates a new access and refresh tokenMiddlewares
async function generateTokens(data, done) {
  // curries in `done` callback so we don't need to pass it
  await RefreshToken.remove(data);
  await AccessToken.remove(data);

  const accessTokenValue = generateTokenValue();
  const token = new AccessToken({
    ...data,
    token: accessTokenValue,
  });
  await token.save();

  const refreshTokenValue = generateTokenValue();
  const refreshToken = new RefreshToken({
    ...data,
    token: refreshTokenValue,
  });
  await refreshToken.save();

  return {
    accessTokenValue,
    refreshTokenValue,
    expiresIn: config.server.features.security.token.tokenLife,
  };
}

// ======================================================
// grant_type=password
// ======================================================
export const GRANT_TYPE__PASSWORD = 'password';
// Exchange username & password for access tokenMiddlewares.
authServer.exchange(
  // \node_modules\oauth2orize\lib\exchange\password.js
  oauth2orize.exchange.password(
    async (client, username, password, scope, done) => {
      logger.info(`(Authorization)[Client "${client.clientId}"] generate access_token for user "${username}"`);
      try {
        const user = await findUserByName(username, password);
        if (!user) {
          return done(null, false);
        }
        const tokenData = {
          userId: user.userId,
          clientId: client.clientId,
        };

        const {
          accessTokenValue,
          refreshTokenValue,
          expiresIn,
        } = await generateTokens(tokenData);

        return done(null, accessTokenValue, refreshTokenValue, { expires_in: expiresIn });
      } catch (error) {
        return done(error);
      }
    },
  ),
);


// ======================================================
// grant_type=refreshToken
// ======================================================
export const GRANT_TYPE__REFRESH_TOKEN = 'refresh_token';
// (Exchange refreshToken for access tokenMiddlewares)
authServer.exchange(
  // \node_modules\oauth2orize\lib\exchange\refreshToken.js
  oauth2orize.exchange.refreshToken(
    (client, refreshToken, scope, done) => {
      logger.info(`(Authorization)[Client "${client.clientId}"] Refresh token`);
      RefreshToken.findOne(
        {
          token: refreshToken,
          clientId: client.clientId,
        },
        async (err, token) => {
          if (err) {
            return done(err);
          }

          if (!token) {
            return done(null, false);
          }

          try {
            const user = await findUserById(token.userId);
            logger.info(`--refresh token for user "${user.username}"`);
            const tokenData = {
              userId: user.userId,
              clientId: client.clientId,
            };

            const {
              accessTokenValue,
              refreshTokenValue,
              expiresIn,
            } = await generateTokens(tokenData);

            return done(null, accessTokenValue, refreshTokenValue, { expires_in: expiresIn });
          } catch (error) {
            return done(error);
          }
        },
      );
    },
  ),
);

export const GRANT_TYPE_PARAM_VALUES = {
  password: GRANT_TYPE__PASSWORD,
  refresh_token: GRANT_TYPE__REFRESH_TOKEN,
};

// tokenMiddlewares endpoint
//
// `tokenMiddlewares` middleware handles client requests to exchange authorization grants
// for access tokens.  Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request.  Clients must
// authenticate when making requests to this endpoint.
export const tokenMiddlewares = [
  middlewareBasicAndClientPasswordStrategy,
  authServer.token(), // grant_type=password AND grant_type=refresh_token
  authServer.errorHandler(),
];

export default tokenMiddlewares;

