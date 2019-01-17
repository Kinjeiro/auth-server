/* eslint-disable function-paren-newline */
import passport from 'passport';
import { BasicStrategy } from 'passport-http';
// import ClientPasswordStrategy from 'passport-oauth2-client-password';
import BearerStrategy from 'passport-http-bearer';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import ClientPasswordStrategy from './passport-oauth2-client-password-strategy';

import config from '../config';
import logger from '../helpers/logger';
import { getProjectId } from '../helpers/request-data';

import { AccessToken } from '../db/model';
import {
  findUserById,
  // findUserByName,
  findUserByIdentify,
  validateApplicationClient,
} from '../services/service-auth';

const STRATEGY__CLIENT_PASSWORD = 'oauth2-client-password';
// todo @ANKU @LOW - вообще странное решение брать из req.body я бы знанчения клал в header чтобы изолировать их от основных данных + можно оформить как авторизацию API KEY (переписать стратегию)
passport.use(
  new ClientPasswordStrategy(async (clientId, clientSecret, done) => {
    try {
      logger.debug(`(Client\\Password strategy) Check clientId ${clientId}`);
      const client = await validateApplicationClient(clientId, clientSecret);
      if (client) {
        logger.debug(`-- found client ${client.clientId}`);
      }
      // todo @ANKU @LOW @BUG_OUT @passport-oauth2-client-password - при ошибке не учитывается info (3-ий параметр)
      // return done(null, false, `-- Client "${client}" doesn't registered.`);
      done(null, client);
    } catch (error) {
      done(error);
    }
  }),
);

const STRATEGY__BASIC_USER_PASSWORD = 'basic';
passport.use(
  new BasicStrategy(
    {
      passReqToCallback: true,
    },
    async (req, username, password, done) => {
      try {
        const projectId = getProjectId(req);
        logger.info(
          `(Authenticate Basic) Check user ${username} [${projectId}]`,
        );
        const user = await findUserByIdentify(projectId, username, password);
        if (user) {
          logger.info(`-- found user ${user.username}`);
        }
        done(null, user);
      } catch (error) {
        done(error);
      }
    },
  ),
);

const STRATEGY__BEARER_TOKEN = 'bearer';
passport.use(
  new BearerStrategy((accessToken, done) => {
    logger.info(`(Authenticate Bearer) Check token ${accessToken}`);
    AccessToken.findOne({ token: accessToken }, async (err, token) => {
      if (err) {
        return done(err);
      }

      if (!token) {
        logger.warn("-- token doesn't exist");
        return done(null, false);
      }

      const { expiresInDate, userId } = token;

      if (Date.now() > expiresInDate.getTime()) {
        logger.info(
          `-- token for userId "${userId}" expired. Removing access token`,
        );

        AccessToken.remove({ token: accessToken }, error => {
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

// const params = {
//   access_token: 'Long_string',
//   token_type: 'Bearer',
//   expires_in: 3599, // seconds
//   id_token: 'Longer_string',
// }

const STRATEGY__GOOGLE = 'google';
passport.use(
  new GoogleStrategy(
    {
      clientID:
        '394823556664-aoitfhc89u3iqjf3al7t43hgec8a5ect.apps.googleusercontent.com',
      clientSecret: 'ZjFviEL7W0y0IMgG6-tB_aBV',
      callbackURL: 'http://localhost:1337/api/auth/google/callback',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, params, profile, done) => {
      const newProfile = { ...profile };
      newProfile.projectId = getProjectId(req);
      newProfile.accessToken = accessToken;
      newProfile.refreshToken = refreshToken;
      return done(null, newProfile);
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

export function expressPlugin() {
  return passport.initialize();
}

/**
 * проверяют в body client_id и client_secret
 */
export const middlewareClientPasswordStrategy = passport.authenticate(
  STRATEGY__CLIENT_PASSWORD,
  { session: false },
);

export const middlewareBasicAndClientPasswordStrategy = passport.authenticate(
  [STRATEGY__CLIENT_PASSWORD, STRATEGY__BASIC_USER_PASSWORD],
  {
    session: false,
  },
);

export const middlewareBearerStrategy = passport.authenticate(
  STRATEGY__BEARER_TOKEN,
  { session: true },
);


// опции prompt и accessType нужны для получения refreshToken, без них приходит undefined
export const middlewareGoogleStrategy = passport.authenticate(
  STRATEGY__GOOGLE,
  {
    prompt: 'consent',
    accessType: 'offline',
    session: false,
    scope: ['email', 'profile'],
  },
);

export const middlewareGoogleCallbackStrategy = passport.authenticate(
  STRATEGY__GOOGLE,
  { failureRedirect: '/' },
);

export default passport;
