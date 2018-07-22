import omit from 'lodash/omit';

import logger from '../helpers/logger';

import Client from '../db/model/client';
import AccessToken from '../db/model/accessToken';
import RefreshToken from '../db/model/refreshToken';
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

function findUser(byId, usernameOrId, password = null) {
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

    function findUserHandler(err, user) {
      if (err) {
        return reject(err);
      }

      if (!user || (password && !user.checkPassword(password))) {
        if (!user) {
          logger.error(`-- Can't find user "${usernameOrId}"`);
        } else {
          logger.error(`-- User "${usernameOrId}" has incorrect password`);
        }
        return resolve(null);
      }

      // logger.info(`-- token for user "${user.username}"`);
      const resultUser = user.toJSON({ virtuals: true });
      return resolve(omit(resultUser, PASSWORD_ATTRS));
    }

    if (byId) {
      User.findById(usernameOrId, omitQuery, findUserHandler);
    } else {
      User.findOne({ username: usernameOrId }, omitQuery, findUserHandler);
    }
  });
}

export function findUserByName(username, password = null) {
  return findUser(false, username, password);
}
export function findUserById(userId, password = null) {
  return findUser(true, userId, password);
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
      console.warn('ANKU , user', user);
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


