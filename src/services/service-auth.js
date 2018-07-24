import omit from 'lodash/omit';

import { generateTokenValue } from '../utils/common';
import config from '../config';
import logger from '../helpers/logger';

import Client from '../db/model/client';
import AccessToken from '../db/model/accessToken';
import RefreshToken from '../db/model/refreshToken';
import ResetPasswordToken from '../db/model/resetPasswordToken';
import User, { PASSWORD_ATTRS } from '../db/model/user';

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
          logger.error(`-- Client "${clientId}" hasn't wrong secret.`);
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

function findUser(byId, idOrQueryMap, password = null, returnRecord = false) {
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
      ? JSON.stringify(idOrQueryMap)
      : idOrQueryMap;

    function findUserHandler(err, user) {
      if (err) {
        return reject(err);
      }

      if (!user || (password && !user.checkPassword(password))) {
        if (!user) {
          logger.error(`-- Can't find user "${name}"`);
        } else {
          logger.error(`-- User "${name}" has incorrect password`);
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
      User.findOne(idOrQueryMap, omitQuery, findUserHandler);
    }
  });
}

export function findUserByName(username, password = null, returnRecord = false) {
  return findUser(false, { username }, password, returnRecord);
}
export function findUserById(userId, password = null, returnRecord = false) {
  return findUser(true, userId, password, returnRecord);
}
export function findUserByEmail(email, returnRecord = false) {
  return findUser(false, { email: email.toLowerCase() }, null, returnRecord);
}


// ======================================================
// SIGNUP
// ======================================================
export function signUp(userData) {
  logger.info(`[signUp] new user "${userData.username}"`);
  return new Promise((resolve, reject) => {
    // user.validate(function(error) {
    // });

    // use schema.create to insert data into the db
    User.create(userData, (error, user) => {
      // todo @ANKU @CRIT @MAIN -
      if (error) {
        logger.error(error);

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
        // todo @ANKU @LOW - формат для json
        return reject(error);
      }
      return resolve(user);
    });
  });
}

// ======================================================
// SIGNIN
// ======================================================
export function signIn(username, password) {
  logger.info(`[signIn] user "${username}"`);
  return findUserByName(username, password);
}

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
export async function createResetPasswordToken(email, clientId) {
  logger.info(`[createResetPasswordToken] for email "${email}"`);
  const user = await findUserByEmail(email);
  if (user === null) {
    throw new Error(`User with "${email}" email doesn't found`);
  }

  const resetPasswordToken = generateTokenValue();
  const token = new ResetPasswordToken({
    userId: user.userId,
    clientId,
    token: resetPasswordToken,
    created: Date.now(),
  });
  await token.save();
  logger.info(`-- reset password token has been created for user "${user.username}"`);
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

  logger.info(`-- tokenObj "${tokenObj}"`);

  if (tokenObj === null) {
    throw new Error(`Reset password token "${resetPasswordToken}" doesn't exist`);
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

  await AccessToken.remove({ userId });
  await RefreshToken.remove({ userId });
  await ResetPasswordToken.remove({ userId });

  logger.info(`-- new password set for user "${user.username}"`);

  return user.email;
}
