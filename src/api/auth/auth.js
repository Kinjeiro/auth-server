import path from 'path';
import Handlebars from 'handlebars';

import { getHandlebarsTemplate } from '../../utils/node-utils';
import config from '../../config';
import createRoute from '../../helpers/express/create-route';
import logger from '../../helpers/logger';
import sendMail from '../../helpers/mail-helper';
import { getProjectId } from '../../helpers/request-data';
import ValidationError from '../../models/errors/ValidationError';

import { middlewareClientPasswordStrategy } from '../../auth/authenticate-passport';
import oauth2TokenMiddlewares from '../../auth/authorization-oauth2';
import {
  signUp,
  signOut,
  createResetPasswordToken,
  resetPassword,
  findUserByEmail,
} from '../../services/service-auth';

const hbsMailSignup = getHandlebarsTemplate(path.resolve(__dirname, './mail-signup.hbs'));
const hbsMailResetPassword = getHandlebarsTemplate(path.resolve(__dirname, './mail-reset-password.hbs'));
const hbsMailResetPasswordSuccess = getHandlebarsTemplate(path.resolve(__dirname, './mail-reset-password-success.hbs'));

function getEmailHtml(emailOptions, defaultHbsTemplate, contextData = {}) {
  const {
    html,
    text,
  } = emailOptions || {};
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
        body: {
          client_id,
          userData,
          emailOptions,
        },
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
          return res
            .status(422)
            .json(new ValidationError(error.errors));
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
createRoute(
  '/signin',
  oauth2TokenMiddlewares,
  {
    method: 'post',
    auth: false,
    router,
  },
);

/**
 * @see - \src\api\swagger.yaml
 */
createRoute(
  '/user',
  (req, res) => {
    // See \src\auth\authenticate-passport.js
    // Req.user and req.authInfo are set using the `info` argument supplied by `BearerStrategy`.
    const {
      user,
      authInfo,
    } = req;

    res.json({
      ...user,
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
      user: {
        userId,
      },
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
          getEmailHtml(
            emailOptions,
            hbsMailResetPassword,
            {
              ...user,
              URL: fullResetPasswordPageUrl,
            },
          ),
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
        body: {
          resetPasswordToken,
          newPassword,
          emailOptions = {},
        },
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

export default router;
