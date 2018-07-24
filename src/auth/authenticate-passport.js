/* eslint-disable function-paren-newline */
import passport from 'passport';
import { BasicStrategy } from 'passport-http';
import ClientPasswordStrategy from 'passport-oauth2-client-password';
import BearerStrategy from 'passport-http-bearer';

import config from '../config';
import logger from '../helpers/logger';

import {
  AccessToken,
} from '../db/model';
import {
  findUserById,
  findUserByName,
  validateApplicationClient,
} from '../services/service-auth';

const STRATEGY__CLIENT_PASSWORD = 'oauth2-client-password';
// todo @ANKU @LOW - вообще странное решение брать из req.body я бы знанчения клал в header чтобы изолировать их от основных данных + можно оформить как авторизацию API KEY (переписать стратегию)
passport.use(new ClientPasswordStrategy(
  async (clientId, clientSecret, done) => {
    try {
      const client = await validateApplicationClient(clientId, clientSecret);
      // todo @ANKU @LOW @BUG_OUT @passport-oauth2-client-password - при ошибке не учитывается info (3-ий параметр)
      // return done(null, false, `-- Client "${client}" doesn't registered.`);
      done(null, client);
    } catch (error) {
      done(error);
    }
  }));

const STRATEGY__BASIC_USER_PASSWORD = 'basic';
passport.use(new BasicStrategy(
  async (username, password, done) => {
    try {
      logger.info(`(Authenticate Basic) Check user ${username}`);
      const user = await findUserByName(username, password);
      done(null, user);
    } catch (error) {
      done(error);
    }
  }),
);

const STRATEGY__BEARER_TOKEN = 'bearer';
passport.use(new BearerStrategy(
  (accessToken, done) => {
    logger.info(`(Authenticate Bearer) Check token ${accessToken}`);
    AccessToken.findOne({ token: accessToken }, async (err, token) => {
      if (err) {
        return done(err);
      }

      if (!token) {
        logger.warn('-- token doesn\'t exist');
        return done(null, false);
      }

      const {
        created,
        userId,
      } = token;

      const isExpire = Math.round((Date.now() - created) / 1000) > config.server.features.security.token.tokenLife;

      if (isExpire) {
        logger.info(`-- token for userId "${userId}" expired. Remove access token`);

        AccessToken.remove({ token: accessToken }, (error) => {
          if (error) {
            return done(error);
          }
          return done(null, false, { message: 'Token expired' });
        });
      } else {
        try {
          const user = await findUserById(userId);
          if (!user) {
            logger.error(`-- userId "${userId}" for token hasn't be found`);
            return done(null, false, { message: 'Unknown user' });
          }
          logger.info(`-- token for user "${user.username}"`);
          return done(null, user, { scope: '*' });
        } catch (error) {
          return done(error);
        }
      }
    });
  }),
);

// for save web session - если используются web session куки
// passport.serializeUser(function(user, done) {
//   done(null, user.id);
// });
//
// passport.deserializeUser(function(id, done) {
//   User.findById(id, function(err, user) {
//     done(err, user);
//   });
// });

export function expressPlugin() {
  return passport.initialize();
}

/**
 * проверяют в body client_id и client_secret
 */
export const middlewareClientPasswordStrategy =
  passport.authenticate(STRATEGY__CLIENT_PASSWORD, { session: false });

export const middlewareBasicAndClientPasswordStrategy =
  passport.authenticate(
    [
      STRATEGY__BASIC_USER_PASSWORD,
      STRATEGY__CLIENT_PASSWORD,
    ],
    {
      session: false,
    },
  );

export const middlewareBearerStrategy =
  passport.authenticate(STRATEGY__BEARER_TOKEN, { session: false });

export default passport;

