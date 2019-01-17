import omit from 'lodash/omit';
import pick from 'lodash/pick';

import { generateTokenValue } from '../utils/common';
import config from '../config';
import logger from '../helpers/logger';
import ValidationError from '../models/errors/ValidationError';

import Client from '../db/model/client';
import AccessToken from '../db/model/accessToken';
import RefreshToken from '../db/model/refreshToken';
import ResetPasswordToken from '../db/model/resetPasswordToken';
import {
  User,
  PASSWORD_ATTRS,
  EDITABLE_ATTRS,
  UNIQUE_ATTRS,
  isUserIdValid,
} from '../db/model/user';

import NotUniqueError from '../models/errors/NotUniqueError';


async function clearTokens(userId) {
  await AccessToken.remove({ userId });
  await RefreshToken.remove({ userId });
  await ResetPasswordToken.remove({ userId });
}

export function validateApplicationClient(clientId, clientSecret, throwError = false) {
  return new Promise((resolve, reject) => {
    logger.info(`(Authenticate) client "${clientId}".`);

    Client.findOne({ clientId }, (err, client) => {
      if (err) {
        return reject(err);
      }
      if (!client || client.clientSecret !== clientSecret) {
        if (!client) {
          logger.error(`-- Client "${clientId}" doesn't registered.`);
        } else {
          logger.error(`-- Client "${clientId}" hasn wrong secret.`);
        }
        if (throwError) {
          return reject(new Error(`Client "${clientId}" incorrect`));
        }
        return resolve(null);
      }

      return resolve(client);
    });
  });
}

function findUser(byId, projectId, idOrQueryMap, password = null, returnRecord = false) {
  return new Promise((resolve, reject) => {
    const omitAttrs = [
      'providerData',
    ];
    if (!password) {
      omitAttrs.push(...PASSWORD_ATTRS);
    }

    const omitQuery = omitAttrs
      .map((attr) => `-${attr}`)
      .join(' ');

    const name = typeof idOrQueryMap === 'object'
      ? JSON.stringify({
        ...idOrQueryMap,
        projectId,
      })
      : idOrQueryMap;

    function findUserHandler(err, user) {
      if (err) {
        return reject(err);
      }

      if (!user || (password && !user.checkPassword(password))) {
        if (!user) {
          logger.warn(`-- Can't find user "${name}"`);
        } else {
          logger.warn(`-- User "${name}" has incorrect password`);
        }
        return resolve(null);
      }

      // logger.info(`-- token for user "${user.username}"`);
      if (returnRecord) {
        return resolve(user);
      }
      return resolve(user.getSafeUser());
    }

    if (byId) {
      User.findById(idOrQueryMap, omitQuery, findUserHandler);
    } else {
      if (!projectId) {
        return reject(new Error('"projectId" doesn\'t set'));
      }
      User.findOne(
        {
          ...idOrQueryMap,
          projectId,
        },
        omitQuery,
        findUserHandler,
      );
    }
  });
}

export function findUserByName(projectId, username, password = null, returnRecord = false) {
  return findUser(false, projectId, { username }, password, returnRecord);
}
export function findUserById(userId, password = null, returnRecord = false) {
  return findUser(true, null, userId, password, returnRecord);
}
export async function findUserByEmail(projectId, email, password = null, returnRecord = false) {
  return email
    ? findUser(false, projectId, { email: email.toLowerCase() }, password, returnRecord)
    : null;
}
export async function findUserByAliasId(projectId, aliasId, password = null, returnRecord = false) {
  return aliasId
    ? findUser(false, projectId, { aliasId: aliasId.toLowerCase() }, password, returnRecord)
    : null;
}

export async function findUserByIdOrAliasId(projectId, userIdOrAliasId, password = null, returnRecord = false) {
  let user = isUserIdValid(userIdOrAliasId)
    ? await findUserById(userIdOrAliasId, password, returnRecord)
    : null;
  if (!user) {
    user = await findUserByAliasId(projectId, userIdOrAliasId, password, returnRecord);
  }
  return user;
}



/**
 *
 * @param projectId
 * @param identifier - это может быть userId, username, email
 * @param password
 */
export async function findUserByIdentify(projectId, identifier, password = null, returnRecord = false) {
  let user = await findUserByIdOrAliasId(projectId, identifier, password, returnRecord);
  if (!user) {
    user = await findUserByName(projectId, identifier, password, returnRecord);
  }
  if (!user) {
    user = await findUserByEmail(projectId, identifier, password, returnRecord);
  }
  return user;
}


/**
 *
 * @param projectId
 * @param data
 * @return [...{ errorId, errorMessage, errorData }]
 */
export async function checkUnique(projectId, data) {
  const uniqueData = data ? pick(data, UNIQUE_ATTRS) : {};
  const keys = Object.keys(uniqueData);
  if (keys.length > 0) {
    const errors = await Promise.all(keys.map(async (key) => {
      const value = uniqueData[key];
      let user;
      switch (key) {
        case 'username': user = await findUserByName(projectId, value, null, true); break;
        case 'email': user = await findUserByEmail(projectId, value, null, true); break;
        case 'aliasId': user = await findUserByAliasId(projectId, value, null, true); break;
        default:
          throw new Error(`Не найден провайдер для проверки уникальности поля "${key}".`);
      }
      if (user) {
        return {
          errorId: 'error.notUnique',
          errorMessage: `Пользователь с "${key}" равным "${value}" уже существует`,
          errorData: {
            key,
            value,
          },
        };
      }
      return null;
    }));

    // убираем пустые
    return errors.filter((item) => !!item);
  }
  return [];
}

export async function checkUniqueWithError(projectId, data) {
  const errors = await checkUnique(projectId, data);
  if (errors.length > 0) {
    throw new NotUniqueError(errors.reduce((result, { errorMessage, errorData: { key } }) => {
      // eslint-disable-next-line no-param-reassign
      result[key] = errorMessage;
      return result;
    }, {}));
  }
}


// ======================================================
// SIGNUP
// ======================================================
export async function signUp(userData, provider, projectId) {
  const { providerData } = userData;
  const userDataFinal =  {
    ...pick(userData, EDITABLE_ATTRS),
    username: userData.username,
    password: userData.password,
    providerData,
    provider,
    projectId,

  };
  const {
    username,
  } = userDataFinal;

  logger.info(`[signUp] new user "${username}" [${projectId}]`);

  await checkUniqueWithError(projectId, userDataFinal);

  const newUser = new User(userDataFinal);
  await newUser.save();

  // error.errors
  /*
   {
   "salt": {
   "message": "Path `salt` is required.",
   "name": "ValidatorError",
   "properties": {
   "type": "required",
   "message": "Path `{PATH}` is required.",
   "path": "salt"
   },
   "kind": "required",
   "path": "salt",
   "$isValidatorError": true
   },
   "hashedPassword": {
   "message": "Path `hashedPassword` is required.",
   "name": "ValidatorError",
   "properties": {
   "type": "required",
   "message": "Path `{PATH}` is required.",
   "path": "hashedPassword"
   },
   "kind": "required",
   "path": "hashedPassword",
   "$isValidatorError": true
   }
   }
   */

  return newUser.getSafeUser();
}

// // ======================================================
// // SIGNIN
// // ======================================================
// export function signIn(projectId, username, password) {
//   logger.info(`[signIn] user "${username}" [${projectId}]`);
//   return findUserByName(projectId, username, password);
// }

// ======================================================
// SIGNOUT
// ======================================================
export function signOut(userId) {
  logger.info(`[signOut] userId "${userId}"`);
  return Promise.all([
    AccessToken.remove({ userId }),
    RefreshToken.remove({ userId }),
  ])
    .then(() => {
      logger.info('-- remove all tokens');
    });
  //
  // return new Promise((resolve, reject) => {
  //   AccessToken.remove({ token: accessToken }, (error) => {
  //     if (error) {
  //       return reject(error);
  //     }
  //
  //     RefreshToken.remove({ token: refreshToken }, (error) => {
  //       if (error) {
  //         return reject(error);
  //       }
  //       return resolve();
  //     });
  //   });
  // });
}

// ======================================================
// FORGOT
// ======================================================
export async function createResetPasswordToken(user, clientId) {
  const {
    userId,
    email,
    projectId,
    username,
  } = user;
  logger.info(`[createResetPasswordToken] for email "${username}"(${email}) [${projectId}]`);

  // нужно очистить все токены доступа, если идет сброс пароля
  await clearTokens(userId);

  const resetPasswordToken = generateTokenValue();
  const token = new ResetPasswordToken({
    userId,
    clientId,
    token: resetPasswordToken,
    created: Date.now(),
  });
  await token.save();
  logger.info(`-- reset password token has been created for user "${username}"`);
  return resetPasswordToken;
}

// ======================================================
// RESET PASSWORD
// ======================================================
export async function resetPassword(resetPasswordToken, newPassword) {
  logger.info('[resetPassword] for reset password token');
  const tokenObj = await ResetPasswordToken
    .findOne({ token: resetPasswordToken })
    .exec();

  logger.debug(`-- tokenObj "${tokenObj}"`);

  if (tokenObj === null) {
    logger.error(`Reset password token "${resetPasswordToken}" doesn't exist`);
    throw new ValidationError(
      'resetPassword',
      `Reset password token ("${resetPasswordToken.substring(0, 5)}...") has been expired.`,
    );
  }

  const {
    userId,
    // token,
    created,
  } = tokenObj;
  const isExpire = Math.round((Date.now() - created) / 1000) > config.server.features.resetPassword.tokenLife;

  logger.info(`-- isExpire "${isExpire}"`);

  if (isExpire) {
    await ResetPasswordToken.remove({ token: resetPasswordToken });
    throw new Error(`Reset password token "${resetPasswordToken}" has expire`);
  }

  const user = await findUserById(userId, null, true);
  user.password = newPassword;
  await user.save();

  await clearTokens(userId);

  logger.info(`-- new password set for user "${user.username}" [${user.projectId}]`);

  return user.getSafeUser();
}
