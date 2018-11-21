import pick from 'lodash/pick';

import { difference } from '../utils/common';
import logger from '../helpers/logger';
import ValidationError from '../models/errors/ValidationError';
import NotFoundError from '../models/errors/NotFoundError';
import NotUniqueError from '../models/errors/NotUniqueError';

import {
  User,
  PROTECTED_ATTRS,
  PUBLIC_TO_ALL_ATTRS,
  EDITABLE_ATTRS,
} from '../db/model/user';
import AccessToken from '../db/model/accessToken';
import RefreshToken from '../db/model/refreshToken';
import ResetPasswordToken from '../db/model/resetPasswordToken';

import {
  findUserById,
  findUserByIdOrAliasId,
  checkUniqueWithError,
} from './service-auth';

export async function getUser(projectId, userIdOrAliasId) {
  const user = await findUserByIdOrAliasId(projectId, userIdOrAliasId);
  if (!user) {
    throw new NotFoundError(`user "${userIdOrAliasId}"`);
  }
  return user;
}
export async function getProtectedUserInfo(projectId, userIdOrAliasId) {
  const user = await getUser(projectId, userIdOrAliasId);
  return pick(user, PROTECTED_ATTRS);
}
export async function getPublicUserInfo(projectId, userIdOrAliasId) {
  const user = await getUser(projectId, userIdOrAliasId);
  return pick(user, PUBLIC_TO_ALL_ATTRS);
}
export async function getUserAvatar(projectId, userIdOrAliasId) {
  const userRecord = await findUserByIdOrAliasId(projectId, userIdOrAliasId, null, true);
  if (!userRecord) {
    throw new NotFoundError(`user "${userIdOrAliasId}"`);
  }
  return pick(userRecord.toJSON(), 'profileImageURI', 'updated');
}


export async function changeUser(projectId, userId, newData) {
  const userRecord = await findUserById(userId, null, true);
  const attrDiffs = difference(Object.keys(newData), EDITABLE_ATTRS);
  if (attrDiffs.length > 0) {
    logger.error(`При обновлении пользователя "${userId}:${userRecord.get('email')}"[${projectId}] была попытка изменить недопустимые полям: `, attrDiffs.join(', '));
  }
  const changedData = pick(newData, EDITABLE_ATTRS);

  await checkUniqueWithError(projectId, changedData);

  logger.log(`Для пользователя "${userId}:${userRecord.get('email')}" изменены поля: `, Object.keys(changedData));
  userRecord.set(changedData);
  userRecord.updated = new Date();
  await userRecord.save();

  return userRecord.getSafeUser();
}

export async function changePassword(userId, newPassword, oldPassword) {
  const userRecord = await findUserById(userId, null, true);
  if (!userRecord.checkPassword(oldPassword)) {
    throw new ValidationError('password', 'Old password is incorrect');
  }
  userRecord.set('password', newPassword);
  userRecord.updated = new Date();
  await userRecord.save();
}

export async function removeUser(projectId, userId) {
  if (!projectId) {
    throw new ValidationError('projectId');
  }
  return User.remove({ userId, projectId });
}

export async function removeUsers(projectId) {
  if (!projectId) {
    throw new ValidationError('projectId');
  }

  const users = await User.find({ projectId }).exec();

  await Promise.all(users.map(async (user) => {
    await AccessToken.remove({ userId: user.id });
    await RefreshToken.remove({ userId: user.id });
    await ResetPasswordToken.remove({ userId: user.id });
  }));

  await User.remove({ projectId });
}
