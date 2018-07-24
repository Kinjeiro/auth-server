import path from 'path';
import fs from 'fs';

import config from '../config';
import createRoute from '../helpers/express/create-route';
import logger from '../helpers/logger';
import sendMail from '../helpers/mail-helper';

import { middlewareClientPasswordStrategy } from '../auth/authenticate-passport';
import oauth2TokenMiddlewares from '../auth/authorization-oauth2';
import {
  signUp,
  signOut,
  createResetPasswordToken,
  resetPassword,
} from '../services/service-auth';

const htmlResetPassword = fs.readFileSync(path.resolve(__dirname, './auth-reset-password.html')).toString();
const htmlResetPasswordSuccess = fs.readFileSync(path.resolve(__dirname, './auth-reset-password-success.html')).toString();

/**
 * @see - \src\routes\api-docs\swagger.yaml
 */
const router = createRoute(
  '/signup',
  [
    // проверяем подлиность клиента
    middlewareClientPasswordStrategy,
    // создаем пользователя
    async (req, res) => {
      const {
        client_id,
        userData,
      } = req.body;
      try {
        const user = await signUp({
          provider: client_id,
          ...userData,
        });
        return res.json(user);
      } catch (error) {
        logger.error(error);
        if (error.errors) {
          // validation errors;
          // todo @ANKU @CRIT @MAIN - формат ошибок валидации
          /*
           The 412 (Precondition Failed) status code indicates that one or more
           conditions given in the request header fields evaluated to false when
           tested on the server. This response code allows the client to place
           preconditions on the current resource state (its current
           representations and metadata) and, thus, prevent the request method
           from being applied if the target resource is in an unexpected state.
           (http://tools.ietf.org/html/rfc7232#section-4.2)

           The 422 (Unprocessable Entity) status code means the server
           understands the content type of the request entity (hence a
           415(Unsupported Media Type) status code is inappropriate), and the
           syntax of the request entity is correct (thus a 400 (Bad Request)
           status code is inappropriate) but was unable to process the contained
           instructions. For example, this error condition may occur if an XML
           request body contains well-formed (i.e., syntactically correct), but
           semantically erroneous, XML instructions.
           (http://tools.ietf.org/html/rfc4918#section-11.2)
          */
          return res.status(422).json({
            validationErrors: error.errors,
          });
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
 * @see - \src\routes\api-docs\swagger.yaml
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
 * @see - \src\routes\api-docs\swagger.yaml
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
 * @see - \src\routes\api-docs\swagger.yaml
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


/**
 * @see - \src\routes\api-docs\swagger.yaml
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
          emailSubject,
          emailHtmlTpl, // необходимо добавить fullForgotPageUrl
          emailOptions,

          resetPasswordPageUrl,
          client_id,
        },
      } = req;

      const token = await createResetPasswordToken(email, client_id);
      // todo @ANKU @LOW - кейс когда есть еще query параметры и токен нужно энкодить
      const fullResetPasswordPageUrl = `${resetPasswordPageUrl}?token=${token}`;

      if (!config.common.isTest) {
        await sendMail(
          email,
          emailSubject || 'Сброс пароля',
          emailHtmlTpl
          || (emailHtmlTpl !== false ? htmlResetPassword.replace(/{{URL}}/, fullResetPasswordPageUrl) : null),
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
 * @see - \src\routes\api-docs\swagger.yaml
 */
createRoute(
  '/reset',
  [
    // проверяем подлиность клиента
    middlewareClientPasswordStrategy,
    async (req, res) => {
      const {
        body: {
          successEmailSubject,
          successEmailHtml, // необходимо добавить fullForgotPageUrl
          successEmailOptions,

          resetPasswordToken,
          newPassword,
        },
      } = req;

      const email = await resetPassword(resetPasswordToken, newPassword);

      if (!config.common.isTest) {
        await sendMail(
          email,
          successEmailSubject || 'Смена пароля',
          successEmailHtml
          || (successEmailHtml !== false ? htmlResetPasswordSuccess : null),
          successEmailOptions,
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

export default router;
