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
    /*
    ЕСТЬ refreshToken

    const profile = {
      id: '114336819963004264943',
      displayName: 'Андрей Кузьмин',
      name: {
        familyName: 'Кузьмин',
        givenName: 'Андрей',
      },
      emails: [
        {
          value: 'kinjeiro@gmail.com',
          type: 'account',
        },
      ],
      photos: [
        { value: 'https://lh5.googleusercontent.com/-vQDJPd5A1hA/AAAAAAAAAAI/AAAAAAAACAc/pvsVx6xInj4/s50/photo.jpg' }
      ],
      gender: undefined,
      provider: 'google',
      _raw: '...',
      _json:
        {
          kind: 'plus#person',
          etag: '"k-5ZH5-QJvSewqvyYHTE9ETORZg/vYagjCKajjRBxpEGT5fDAclb1W0"',
          emails: [[Object]],
          id: '114336819963004264943',
          displayName: 'Андрей Кузьмин',
          name: {
            familyName: 'Кузьмин',
            givenName: 'Андрей',
          },
          image:
            {
              url: 'https://lh5.googleusercontent.com/-vQDJPd5A1hA/AAAAAAAAAAI/AAAAAAAACAc/pvsVx6xInj4/s50/photo.jpg',
              isDefault: false,
            },
          language: 'ru',
        },
    };
    const params = {
      access_token: 'ya29.GlvPBpRAMyEf3T-EBT8YhUokczx8k7h0pXSJsMNVtwhx16-WP8tHZyazhRMLJ3yaslAP_18i6bv7xHisguFjnCaULFydHXZNNbePRzHI0g-5BHNV6Z4-6vdII2ls',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      token_type: 'Bearer',
      id_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjVmZTJkNTQxYTQyODJiN2FlMzYyOGZhMDc0ZGQ4YmVhNmRhNWIxOWIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI3NTY4ODg2NzQyNTAtaGxsOHU4MWZjcGV1NHQ1NmVsc2NoczAxZzBkZWcxajMuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI3NTY4ODg2NzQyNTAtaGxsOHU4MWZjcGV1NHQ1NmVsc2NoczAxZzBkZWcxajMuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTQzMzY4MTk5NjMwMDQyNjQ5NDMiLCJlbWFpbCI6ImtpbmplaXJvQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJhdF9oYXNoIjoiXzNXOE50UHA1TVlvcm5kckpaV2ZOdyIsIm5hbWUiOiLQkNC90LTRgNC10Lkg0JrRg9C30YzQvNC40L0iLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDUuZ29vZ2xldXNlcmNvbnRlbnQuY29tLy12UURKUGQ1QTFoQS9BQUFBQUFBQUFBSS9BQUFBQUFBQUNBYy9wdnNWeDZ4SW5qNC9zOTYtYy9waG90by5qcGciLCJnaXZlbl9uYW1lIjoi0JDQvdC00YDQtdC5IiwiZmFtaWx5X25hbWUiOiLQmtGD0LfRjNC80LjQvSIsImxvY2FsZSI6InJ1IiwiaWF0IjoxNTUyODQ0NTY4LCJleHAiOjE1NTI4NDgxNjh9.eBvOV1-a5a3k9D65GeyShAQmwj7l9GmMLT4pVkL2mfoUej7u49S7bBqihrtpjEIu8kgPLsFD6Jt-RUaW-iGg3BzwcYVuQP18uKoh6fM3E9qbwKC_JtcI2Dt0rG4H1_EUWG1POfkjo8ys0ZP9SVjzFEp8q65EnXLqkrEo5Ms18mZr1MGMB0LBWMILVFK-SZTmrOeIZrphrcbcFRP-lAM6X8GmwvmCe2pkGQh9NZPA2OxLHNcU3e8yBiHOScdD0aeluzacP24VD7pncIKOPAUN_7fN-ffN3fvAhFg9RF4iv4NSBe6HnTWg-3p4J6ubADDegb16r_kRPqHRwYxROp_tJQ',
    }; */

    const newProfile = bindTokens(profile, accessToken, refreshToken);
    return done(null, newProfile);
  },
);

const createFacebookAuthMiddleware = (credentials, provider) => new FacebookStrategy(
  {
    ...credentials,
    callbackURL: `/api/auth/${provider}/callback`,
    /*
    https://developers.facebook.com/docs/graph-api/reference/user

    'id':          'id',
    'username':    'username',
    'displayName': 'name',
    'name':       ['last_name', 'first_name', 'middle_name'],
    'gender':      'gender',
    'birthday':    'birthday',
    'profileUrl':  'link',
    'emails':      'email',
    'photos':      'picture'
    */
    profileFields: [
      'id',

      // (#12) username field is deprecated for versions v2.0 and higher
      // 'username',
      'email',

      'displayName',
      // 'name',
      'first_name',
      'middle_name',
      'last_name',
      'short_name',

      'picture',

      // нужно специально одобрения приложения в facebook для них - https://developers.facebook.com/docs/facebook-login/review/
      // 'gender', // scope: user_gender
      // 'birthday', // scope: user_birthday
      // 'link', // scope user_link
      // hometown // scope user_hometown
      // address | location // scope user_location
    ],
  },
  (accessToken, refreshToken, profile, done) => {
    /*
    НЕТУ refreshToken

    const profile = {
      id: '2252706994794621',
      username: undefined,
      displayName: 'Andrey Kuzmin',
      name: {
        familyName: 'Kuzmin',
        givenName: 'Andrey',
        middleName: undefined,
      },
      gender: undefined,
      profileUrl: undefined,
      emails: [{ value: 'kinjeiro@gmail.com' }],
      photos: [{ value: 'https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=2252706994794621&height=50&width=50&ext=1555425609&hash=AeTqAVHtcRPmOtjL' }],
      provider: 'facebook',
      _raw: '...',
      _json: {
        id: '2252706994794621',
        email: 'kinjeiro@gmail.com',
        name: 'Andrey Kuzmin',
        first_name: 'Andrey',
        last_name: 'Kuzmin',
        picture: { data: [Object] },
      },
    }; */
    const newProfile = bindTokens(profile, accessToken, refreshToken);
    newProfile.username = newProfile.username
      || (newProfile.emails && newProfile.emails[0] && newProfile.emails[0].value)
      || newProfile.id;
    return done(null, newProfile);
  },
);

const createVkontakteAuthMiddleware = (credentials, provider) => new VKontakteStrategy(
  {
    ...credentials,
    callbackURL: `/api/auth/${provider}/callback`,
  },
  (accessToken, refreshToken, params, userProfile, done) => {
    /*
      НЕТУ refreshToken

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
    // todo @ANKU @CRIT @MAIN - получать code и его использовать как refresh_token
    // todo @ANKU @CRIT @MAIN - получать фио, пол и все возможное
    const userProfileFinal = bindTokens(userProfile, accessToken, refreshToken);
    userProfileFinal.emails = [{ value: params.email }];
    return done(null, userProfileFinal);
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
  {
    /*
      https://developers.facebook.com/docs/facebook-login/permissions/

      Обратите внимание: даже если вы запросили разрешение email, нет гарантий, что вы получите доступ к эл. адресу человека. Например, если человек зарегистрировался на Facebook с использованием телефонного номера, а не эл. адреса, то поле эл. адреса может быть пустым.

      телефон и адресс больше нельзя запросить - https://developers.facebook.com/blog/post/2011/01/14/platform-updates--new-user-object-fields--edge-remove-event-and-more/
    */
    scope: ['email'],
  },
);
export const middlewareFacebookCallbackStrategy = passport.authenticate(
  STRATEGY__FACEBOOK,
  {
    failureRedirect: '/',
  },
);


export default passport;
