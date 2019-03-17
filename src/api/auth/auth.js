import path from 'path';
import Handlebars from 'handlebars';
import omit from 'lodash/omit';

import { getHandlebarsTemplate } from '../../utils/node-utils';
import { imageURLToBase64, getRefererHostFullUrl } from '../../utils/common';
import config from '../../config';
import createRoute from '../../helpers/express/create-route';
import logger from '../../helpers/logger';
import sendMail from '../../helpers/mail-helper';
import { getProjectId } from '../../helpers/request-data';
import ValidationError from '../../models/errors/ValidationError';
import { OMIT_USER_ATTRS } from '../../db/model/user';

import {
  middlewareClientPasswordStrategy,
  initAuthMiddleware,
  middlewareGoogleCallbackStrategy,
  middlewareVkontakteCallbackStrategy,
  middlewareFacebookCallbackStrategy,
  middlewareGoogleStrategy,
  middlewareFacebookStrategy,
  middlewareVkontakteStrategy,
} from '../../auth/authenticate-passport';
import oauth2TokenMiddlewares, {
  generateTokens,
} from '../../auth/authorization-oauth2';
import {
  signUp,
  signOut,
  createResetPasswordToken,
  resetPassword,
  findUserByEmail,
  findUserByName,
} from '../../services/service-auth';
import { getClientProviderCredentials } from '../../services/service-clients';

const hbsMailSignup = getHandlebarsTemplate(path.resolve(__dirname, './mail-signup.hbs'));
const hbsMailResetPassword = getHandlebarsTemplate(path.resolve(__dirname, './mail-reset-password.hbs'));
const hbsMailResetPasswordSuccess = getHandlebarsTemplate(path.resolve(__dirname, './mail-reset-password-success.hbs'));


const PROVIDERS = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  VKONTAKTE: 'vkontakte',
};


function getEmailHtml(emailOptions, defaultHbsTemplate, contextData = {}) {
  const { html, text } = emailOptions || {};
  return text
    ? null
    : html
      ? Handlebars.compile(html)(contextData)
      : defaultHbsTemplate(contextData);
}

/**
 * @see - \src\api\swagger.yaml
 */
const router = createRoute(
  '/signup',
  [
    // проверяем подлиность клиента
    middlewareClientPasswordStrategy,
    // создаем пользователя
    async (req, res) => {
      const {
        body: { client_id, userData, emailOptions },
      } = req;
      try {
        const user = await signUp(userData, client_id, getProjectId(req));

        if (!config.common.isTest && emailOptions) {
          try {
            // асинхронно пускай выполняется
            sendMail(
              user.email,
              emailOptions.subject || 'Регистрация нового пользователя',
              getEmailHtml(emailOptions, hbsMailSignup, user),
              emailOptions,
            );
          } catch (error) {
            // проглатываем ошибку об отправке письма, так как это не особо важно, пароль уже сменен
            logger.error(error);
          }
        }

        return res.json(user);
      } catch (error) {
        logger.error(error);
        if (error.errors) {
          return res.status(422).json(new ValidationError(error.errors));
        }
        throw error;
      }
    },
  ],
  {
    method: 'post',
    auth: false,
  },
);

/**
 * @see - \src\api\swagger.yaml
 */
createRoute('/signin', oauth2TokenMiddlewares, {
  method: 'post',
  auth: false,
  router,
});

/**
 * @see - \src\api\swagger.yaml
 */
createRoute(
  '/user',
  (req, res) => {
    // See \src\auth\authenticate-passport.js
    // Req.user and req.authInfo are set using the `info` argument supplied by `BearerStrategy`.
    const { user, authInfo } = req;

    res.json({
      ...omit(user, OMIT_USER_ATTRS),
      scope: authInfo.scope,
    });
  },
  {
    router,
  },
);

/**
 * @see - \src\api\swagger.yaml
 */
createRoute(
  '/signout',
  async (req, res) => {
    const {
      user: { userId },
    } = req;

    return res.json(await signOut(userId));
  },
  {
    router,
  },
);

export const PARAM__RESET_PASSWORD_TOKEN = 'resetToken';
/**
 * @see - \src\api\swagger.yaml
 */
createRoute(
  '/forgot',
  [
    // проверяем подлиность клиента
    middlewareClientPasswordStrategy,
    async (req, res) => {
      const {
        body: {
          email,
          emailOptions = {},

          resetPasswordPageUrl,
          client_id,
        },
      } = req;

      const user = await findUserByEmail(getProjectId(req), email);
      if (user === null) {
        throw new Error(`User with "${email}" email doesn't found`);
      }

      const token = await createResetPasswordToken(user, client_id);
      // todo @ANKU @LOW - кейс когда есть еще query параметры и токен нужно энкодить
      const fullResetPasswordPageUrl = `${resetPasswordPageUrl}?${PARAM__RESET_PASSWORD_TOKEN}=${token}`;

      if (!config.common.isTest) {
        await sendMail(
          email,
          emailOptions.subject || 'Сброс пароля',
          getEmailHtml(emailOptions, hbsMailResetPassword, {
            ...user,
            URL: fullResetPasswordPageUrl,
          }),
          emailOptions,
        );
      }

      return res.json();
    },
  ],
  {
    method: 'post',
    router,
    auth: false,
  },
);

/**
 * @see - \src\api\swagger.yaml
 */
createRoute(
  '/reset',
  [
    // проверяем подлиность клиента
    middlewareClientPasswordStrategy,
    async (req, res) => {
      const {
        body: { resetPasswordToken, newPassword, emailOptions = {} },
      } = req;

      const user = await resetPassword(resetPasswordToken, newPassword);
      const { email } = user;

      if (!config.common.isTest) {
        try {
          // асинхронно пускай выполняется
          sendMail(
            email,
            emailOptions.subject || 'Смена пароля',
            getEmailHtml(emailOptions, hbsMailResetPasswordSuccess, user),
            emailOptions,
          );
        } catch (error) {
          // проглатываем ошибку об отправке письма, так как это не особо важно, пароль уже сменен
          logger.error(error);
        }
      }
      return res.json(user);
    },
  ],
  {
    method: 'post',
    router,
    auth: false,
  },
);

// todo @ANKU @CRIT @MAIN - нужно этот парсер вынести в отдельный блок, унифицировать и написать парсеры от гугла \ вк \ фейсбук на юзера
/**
 * парсинг profile от соц авторизации в норм юзера
 * @param user
 * @return {Promise<{username: string, userId: *, profileImageURI: undefined, displayName: *, provider: *, providerData: {accessToken: *, refreshToken: *}, firstName: *, lastName: *, email: undefined}>}
 */
const serializeUser = async user => {
  const {
    provider,
    id,
    displayName,
    accessToken,
    refreshToken,
    photos,
    name,
    emails,
  } = user;

  return {
    username: `${provider.charAt(0).toUpperCase() +
      provider.slice(1)}_User_${id}`,
    userId: id,
    profileImageURI: photos[0]
      ? await imageURLToBase64(photos[0].value)
      : undefined,
    displayName,
    // todo @ANKU @CRIT @MAIN - добавить пол \ фамилию \ имя \ ник \ ссылку на профайл \ id - вообще сохранить все providerData
    provider,
    providerData: {
      accessToken,
      refreshToken,
    },
    firstName: name.givenName,
    lastName: name.familyName,
    email: emails ? emails[0].value : undefined,
  };
};

// todo @ANKU @LOW - переделать проверять если есть в настройках а не так явно защивать
function checkProvider(provider) {
  if (provider !== PROVIDERS.GOOGLE && provider !== PROVIDERS.FACEBOOK && provider !== PROVIDERS.VKONTAKTE) {
    throw new Error(`Provider must be ${PROVIDERS.VKONTAKTE} || ${PROVIDERS.GOOGLE} || ${PROVIDERS.FACEBOOK}`);
  }
}

const socialAuthHandler = async (req, res, next) => {
  const {
    client_id: clientId,
    provider,
  } = req.query;

  if (!clientId || !provider) {
    throw new Error('Provider and clientId must be in query');
  }

  checkProvider(provider);
  req.session.pageToRedirect = getRefererHostFullUrl(req);
  req.session.clientId = clientId;
  const providerCredentials = (await getClientProviderCredentials(clientId, provider))
    || config.server.features.defaultProviderCredentials[provider];
  // todo @ANKU @LOW - вопрос не оверхед ли это на каждый запрос использовать? ведь use сингл операция
  initAuthMiddleware(providerCredentials, provider);
  next();
};

const socialAuthCallbackHandler = async (req, res) => {
  const {
    pageToRedirect,
    clientId,
  } = req.session;
  delete req.session.pageToRedirect;
  delete req.session.clientId;

  const serializedUser = await serializeUser(req.user);
  // todo @ANKU @CRIT @MAIN - переделать на уникальность и поиск по почте
  let user = await findUserByName(
    clientId,
    serializedUser.username,
    null,
    true,
  );
  if (!user) {
    // todo @ANKU @CRIT @MAIN - нужно регистририовать максимально данных (имя, фамилия, пол и так далее)
    user = await signUp(serializedUser, req.user.provider, clientId);
  }

  const tokens = await generateTokens({
    clientId,
    userId: user.id,
  });

  res.cookie('accessToken', tokens.accessTokenValue);
  res.cookie('refreshToken', tokens.refreshTokenValue);
  res.cookie('authType', 'Bearer');
  res.redirect(302, pageToRedirect);
};


// ======================================================
// GOOGLE
// ======================================================
createRoute(
  '/google',
  [socialAuthHandler, middlewareGoogleStrategy],
  {
    router,
    auth: false,
  },
);
createRoute(
  '/google/callback',
  [middlewareGoogleCallbackStrategy, socialAuthCallbackHandler],
  {
    router,
    auth: false,
  },
);

// ======================================================
// vkontakte
// ======================================================
createRoute(
  '/vkontakte',
  [socialAuthHandler, middlewareVkontakteStrategy],
  {
    router,
    auth: false,
  },
);
createRoute(
  '/vkontakte/callback',
  [middlewareVkontakteCallbackStrategy, socialAuthCallbackHandler],
  {
    router,
    auth: false,
  },
);

// ======================================================
// FACEBOOK
// ======================================================
createRoute(
  '/facebook',
  [socialAuthHandler, middlewareFacebookStrategy],
  {
    router,
    auth: false,
  },
);
createRoute(
  '/facebook/callback',
  [middlewareFacebookCallbackStrategy, socialAuthCallbackHandler],
  {
    router,
    auth: false,
  },
);

export default router;
