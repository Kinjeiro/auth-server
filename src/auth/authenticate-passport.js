/* eslint-disable function-paren-newline */
import passport from 'passport';
import { BasicStrategy } from 'passport-http';
// import ClientPasswordStrategy from 'passport-oauth2-client-password';
import BearerStrategy from 'passport-http-bearer';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as VKontakteStrategy } from 'passport-vkontakte';
import { Strategy as FacebookStrategy } from 'passport-facebook';

import ClientPasswordStrategy from './passport-oauth2-client-password-strategy';

import logger from '../helpers/logger';
import { getProjectId } from '../helpers/request-data';

import { AccessToken } from '../db/model';
// import Client from '../db/model/client';

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

const bindTokens = (profile, accessToken, refreshToken) => {
  const newProfile = { ...profile };
  newProfile.accessToken = accessToken;
  newProfile.refreshToken = refreshToken;
  return newProfile;
};

const STRATEGY__GOOGLE = 'google';
const STRATEGY__VKONTAKTE = 'vkontakte';
const STRATEGY__FACEBOOK = 'facebook';
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

export function expressPlugin() {
  return passport.initialize();
}

const createGoogleAuthMiddleware = (credentials, provider) => new GoogleStrategy(
  {
    ...credentials,
    callbackURL: `/api/auth/${provider}/callback`,
  },
  async (accessToken, refreshToken, params, profile, done) => {
    console.warn('ANKU GOOGLE, accessToken, refreshToken, profile', accessToken, refreshToken, profile, params);
    const newProfile = bindTokens(profile, accessToken, refreshToken);
    return done(null, newProfile);
  },
);

const createFacebookAuthMiddleware = (credentials, provider) => new FacebookStrategy(
  {
    ...credentials,
    callbackURL: `/api/auth/${provider}/callback`,
    profileFields: [
      'id',
      'displayName',
      'email',
      'first_name',
      'last_name',
      'picture',
    ],
  },
  (accessToken, refreshToken, profile, done) => {
    console.warn('ANKU FACEBOOK, accessToken, refreshToken, profile', accessToken, refreshToken, profile);
    const newProfile = bindTokens(profile, accessToken, refreshToken);
    return done(null, newProfile);
  },
);

const createVkontakteAuthMiddleware = (credentials, provider) => new VKontakteStrategy(
  {
    ...credentials,
    callbackURL: `/api/auth/${provider}/callback`,
  },
  (accessToken, refreshToken, params, profile, done) => {
    /*
      const profile = {
        id: 225097,
        username: 'kinjeiro',
        displayName: 'Андрей Кузьмин',
        name: {
          familyName: 'Кузьмин',
          givenName: 'Андрей',
        },
        gender: 'male',
        profileUrl: 'http://vk.com/kinjeiro',
        photos: [
          {
            value: 'https://pp.userapi.com/c837529/v837529682/4f278/RfNEvThBaA0.jpg?ava=1',
            type: 'photo'
          }
        ],
        provider: 'vkontakte',
        _raw: '...',
        _json:
          {
            id: 225097,
            first_name: 'Андрей',
            last_name: 'Кузьмин',
            sex: 2,
            screen_name: 'kinjeiro',
            photo: 'https://pp.userapi.com/c837529/v837529682/4f278/RfNEvThBaA0.jpg?ava=1'
          }
      };

      const params = {
        access_token: 'c5c469f068dce477e4808a656a48d3beae08a1d46c94d48a89e54b9649be931bfaefdf8a0a9a0031a117f',
        expires_in: 86400,
        user_id: 225097,
        email: 'kinjeiro@gmail.com'
      };
    */
    console.warn('ANKU VK, accessToken, refreshToken, profile', accessToken, refreshToken, profile, params);
    // todo @ANKU @CRIT @MAIN - получать code и его использовать как refresh_token
    // todo @ANKU @CRIT @MAIN - получать фио, пол и все возможное
    const newProfile = bindTokens(profile, accessToken, refreshToken);
    newProfile.emails = [{ value: params.email }];
    return done(null, newProfile);
  },
);

const AuthMiddlewaresFacade = {
  google: (credentials, provider) => createGoogleAuthMiddleware(credentials, provider),
  facebook: (credentials, provider) => createFacebookAuthMiddleware(credentials, provider),
  vkontakte: (credentials, provider) => createVkontakteAuthMiddleware(credentials, provider),
};

export const initAuthMiddleware = (credentials, provider) => {
  const middlewareCreator = AuthMiddlewaresFacade[provider];
  passport.use(provider, middlewareCreator(credentials, provider));
};

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
  {
    failureRedirect: '/',
  },
);


export const middlewareVkontakteStrategy = passport.authenticate(
  STRATEGY__VKONTAKTE,
  {
    /*
      Права доступа приложения https://vk.com/dev/permissions
    */
    /*
      Если указать "offline", полученный access_token будет "вечным" (токен умрёт, если пользователь сменит свой пароль или удалит приложение).
      Если не указать "offline", то полученный токен будет жить 12 часов.
        'scope' => 'photos,offline',
      (Не применяется в Open API)
    */
    scope: ['email', 'offline'],
  },
);
export const middlewareVkontakteCallbackStrategy = passport.authenticate(
  STRATEGY__VKONTAKTE,
  {
    failureRedirect: '/',
  },
);


export const middlewareFacebookStrategy = passport.authenticate(
  STRATEGY__FACEBOOK,
);
export const middlewareFacebookCallbackStrategy = passport.authenticate(
  STRATEGY__FACEBOOK,
  {
    failureRedirect: '/',
  },
);


export default passport;
