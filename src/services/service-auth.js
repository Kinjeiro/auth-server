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
  PUBLIC_EDITABLE_ATTRS,
  UNIQUE_ATTRS,
} from '../db/model/user';


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
      const resultUser = user.toJSON({ virtuals: true });
      return resolve(omit(resultUser, PASSWORD_ATTRS));
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
export function findUserByEmail(projectId, email, returnRecord = false) {
  return email
    ? findUser(false, projectId, { email: email.toLowerCase() }, null, returnRecord)
    : Promise.resolve(null);
}


// ======================================================
// SIGNUP
// ======================================================
export async function signUp(userData, provider, projectId) {
  const userDataFinal = {
    ...pick(userData, PUBLIC_EDITABLE_ATTRS),
    password: userData.password,
    provider,
    projectId,
  };
  const {
    username,
    email,
  } = userDataFinal;

  logger.info(`[signUp] new user "${username}" [${projectId}]`);

  if (await findUserByName(projectId, username)) {
    throw new ValidationError('username', `Пользователь с логином "${username}" уже существует`);
  }
  if (email && await findUserByEmail(projectId, email)) {
    throw new ValidationError('email', `Пользователь с email "${email}" уже существует`);
  }
  // todo @ANKU @LOW - остальные UNIQUE_ATTRS
  // const existUser = await User.findOne({
  //   ...UNIQUE_ATTRS,
  //   projectId,
  // }).exec();

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

  const resultUser = newUser.toJSON();
  return omit(resultUser, PASSWORD_ATTRS);
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
