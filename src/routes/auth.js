import createRoute from '../helpers/express/create-route';
import logger from '../helpers/logger';

import { middlewareClientPasswordStrategy } from '../auth/authenticate-passport';
import oauth2TokenMiddlewares from '../auth/authorization-oauth2';
import {
  signUp,
  signOut,
} from '../services/service-auth';


/**
 [SIGNUP] Регитсрация нового пользователя

 @param client_id - для проверки подлинности клиента
 @param client_secret - для проверки подлинности клиента
 @param userData {user} - пользовательские данные (@see ./src/model/user.js)

 @return {userInfo}
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
        if (error.errors) {
          // validation errors;
          // todo @ANKU @CRIT @MAIN - формат ошибок валидации
          return res.status().json({
            validationErrors: error.errors,
          });
        }
      }
    },
  ],
  {
    method: 'post',
    auth: false,
  },
);

/**
 [SIGNIN] Авторизация - получение токенов доступа

 Дальше их используют для получение информации о пользователе (/user)

 @param grant_type - одно из @see \src\auth\authorization-oauth2.js::GRANT_TYPE_PARAM_VALUES
 @param client_id - индификатор приложения из которого приходит запрос (мобильное приложение, сервер и так далее)
 @param client_secret - секретное слово для app client
 @param username - для получения токенов доступа
 @param password - для получения токенов доступа
 @param refresh_token - для обновления access_token

 @header authorization - если крендешиался поступают через basic \ либо в теле через "username \ password"

 Стек проверки:
 1) Стратегия 'oauth2-client-password' определения подлинности клиента (приложения) по client_id и client_secret

 2) [signin] - генерация токенов доступа
   Request:
   {
      grant_type: 'password',
      client_id: 'myApplication',
      client_secret: 'myApplicationSecretWord',
   }

 Credentials пользователя можно получить двумя способами:
 2.1) Стетегия grant_type: 'password' - из значение в теле username: 'testUserName' \ password: 'testUserNamePassword',
   Request:
   {
    grant_type: 'password',
    client_id: 'myApplication',
    client_secret: 'myApplicationSecretWord',
    username: 'testUserName',
    password: 'testUserNamePassword',
   }
 или
 2.2) Стратегия 'basic' (если headers.authorization: `Basic <base64-encoded credentials>`) - по кренедшелам из заголовка

 3) [refresh] Стетегия grant_type: 'refresh_token' - обновления access_token по refresh_token
   Request:
   {
    grant_type: 'refresh_token',
    client_id: 'myApplication',
    client_secret: 'myApplicationSecretWord',
    refresh_token: 'user_refresh_token',
   }


 @return объект токенов для складирования в http-only куки
 {
   "access_token": "395549ac90cd6f37cbc28c6cb5b31aa8ffe2a22826831dba11d6baae9dafb07a",
   "refresh_token": "857896e0aab5b35456f6432ef2f812a344e2a3bab12d38b152ee3dd968442613",
   "expires_in": 299, (seconds)
   "token_type": "Bearer"
 }
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
 [validate] Проверка по access_token информации о валидности прав доступа пользователя.
 Если все актуально возвращается информация о пользователе

 @header authorization: `Bearer <OAuth 2.0 token>` - access_token

 Благодаря STRATEGY__BEARER_TOKEN - Стартегия 'bearer' (если headers.authorization: `Bearer <OAuth 2.0 token>`) - по токену возвращает пользователя
 (подключенаются в методе createRoute (если auth!==false) - handlers.push(middlewareBearerStrategy))
 ищется в базе токен и по нему ищется пользователь

 @return {userInfo} - информация о пользователе
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
 [SIGNOUT] - выход, удаление всех токенов доступа

 @header - authorization: `Bearer <OAuth 2.0 token>` - access_token
 */
createRoute(
  '/signout',
  async (req, res) => {
    const {
      user: {
        userId,
      },
    } = req;

    try {
      const result = await signOut(userId);
      return res.json(result);
    } catch (error) {
      return res.json(error);
    }
  },
  {
    method: 'get',
    router,
  },
);


createRoute(
  '/signout',
  async (req, res) => {
    const {
      user: {
        userId,
      },
    } = req;

    try {
      const result = await signOut(userId);
      return res.json(result);
    } catch (error) {
      return res.json(error);
    }
  },
  {
    method: 'get',
    router,
  },
);


export default router;
