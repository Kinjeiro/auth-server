/* eslint-disable no-param-reassign */
import oauth2orize from 'oauth2orize';

import { generateTokenValue } from '../utils/common';
import config from '../config';
import logger from '../helpers/logger';
import { getProjectIdFromScope } from '../helpers/request-data';

import {
  AccessToken,
  RefreshToken,
} from '../db/model';
import {
  findUserById,
  findUserByIdentify,
} from '../services/service-auth';

import { middlewareBasicAndClientPasswordStrategy } from './authenticate-passport';

// create OAuth 2.0 server
const authServer = oauth2orize.createServer();

// Destroys any old tokens and generates a new access and refresh tokenMiddlewares
export async function generateTokens(data, done) {
  // curries in `done` callback so we don't need to pass it
  await RefreshToken.remove(data);
  await AccessToken.remove(data);

  const accessTokenValue = generateTokenValue();
  const token = new AccessToken({
    token: accessTokenValue,
    expiresIn: config.server.features.security.token.tokenLife, // в конфигах секунды
    expiresInDate: new Date(Date.now() + (config.server.features.security.token.tokenLife * 1000)), // в конфигах секунды
    ...data,
  });
  await token.save();

  const refreshTokenValue = generateTokenValue();
  const refreshToken = new RefreshToken({
    token: refreshTokenValue,
    expiresIn: config.server.features.security.token.refreshTokenLife, // в конфигах секунды
    expiresInDate: new Date(Date.now() + (config.server.features.security.token.refreshTokenLife * 1000)), // в конфигах секунды
    ...data,
  });
  await refreshToken.save();

  return {
    accessTokenValue,
    refreshTokenValue,
    expiresIn: token.expiresIn,
    expiresInDate: token.expiresInDate,
  };
}

// ======================================================
// grant_type=password
// ======================================================
export const GRANT_TYPE__PASSWORD = 'password';
// Exchange username & password for access tokenMiddlewares.
authServer.exchange(
  // \node_modules\oauth2orize\lib\exchange\password.js
  oauth2orize.exchange.password(async (client, identifier, password, scope, done) => {
    try {
      const projectId = client.clientId || getProjectIdFromScope(scope);
      logger.info(`(Authorization)[Client "${client.clientId}"] generate access_token for user "${identifier}" [${projectId}]`);

      /**
         * авторизоваться может с помощью userId \ username \ email
         */
      const user = await findUserByIdentify(projectId, identifier, password);
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
        expiresInDate,
      } = await generateTokens(tokenData);

      return done(null, accessTokenValue, refreshTokenValue, {
        expires_in: expiresIn,
        expires_in_date: expiresInDate,
      });
    } catch (error) {
      return done(error);
    }
  }));


// ======================================================
// grant_type=refreshToken
// ======================================================
export const GRANT_TYPE__REFRESH_TOKEN = 'refresh_token';
// (Exchange refreshToken for access tokenMiddlewares)
authServer.exchange(
  // \node_modules\oauth2orize\lib\exchange\refreshToken.js
  oauth2orize.exchange.refreshToken((client, refreshToken, scope, done) => {
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

        const {
          userId,
          expiresInDate,
        } = token;

        if (Date.now() > expiresInDate.getTime()) {
          logger.info(`-- refresh token for userId "${userId}" expired. Remove refresh token`);

          RefreshToken.remove({ token: refreshToken }, (error) => {
            if (error) {
              return done(error);
            }
            return done(null, false, { message: 'Refresh token expired' });
          });
        } else {
          try {
            const user = await findUserById(userId);
            logger.info(`--refresh token for user "${user.username}"`);
            const tokenData = {
              userId,
              clientId: client.clientId,
            };

            const {
              accessTokenValue,
              refreshTokenValue,
              expiresIn: expiresInNew,
              expiresInDate: expiresInDateNew,
            } = await generateTokens(tokenData);

            return done(null, accessTokenValue, refreshTokenValue, {
              expires_in: expiresInNew,
              expires_in_date: expiresInDateNew,
            });
          } catch (error) {
            return done(error);
          }
        }
      },
    );
  }));

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

