import pick from 'lodash/pick';

import { difference } from '../utils/common';
import logger from '../helpers/logger';
import ValidationError from '../models/errors/ValidationError';
import NotFoundError from '../models/errors/NotFoundError';

import {
  User,
  PROTECTED_ATTRS,
  PUBLIC_TO_ALL_ATTRS,
  PUBLIC_EDITABLE_ATTRS,
} from '../db/model/user';
import AccessToken from '../db/model/accessToken';
import RefreshToken from '../db/model/refreshToken';
import ResetPasswordToken from '../db/model/resetPasswordToken';

import {
  findUserByName,
} from './service-auth';

export async function getUser(projectId, username) {
  const user = await findUserByName(projectId, username);
  if (!user) {
    throw new NotFoundError(`user "${username}"`);
  }
  return user;
}
export async function getProtectedUserInfo(projectId, username) {
  const user = await getUser(projectId, username);
  return pick(user, PROTECTED_ATTRS);
}
export async function getPublicUserInfo(projectId, username) {
  const user = await getUser(projectId, username);
  return pick(user, PUBLIC_TO_ALL_ATTRS);
}
export async function getUserAvatar(projectId, username) {
  const user = await getUser(projectId, username);
  return user.profileImageURI;
}

export async function changeUser(projectId, username, newData) {
  const userRecord = await findUserByName(projectId, username, null, true);
  const attrDiffs = difference(Object.keys(newData), PUBLIC_EDITABLE_ATTRS);
  if (attrDiffs.length > 0) {
    logger.error(`При обновлении пользователя "${username}"[${projectId}] была попытка изменить недопустимые полям: `, attrDiffs.join(', '));
  }
  userRecord.set(pick(newData, PUBLIC_EDITABLE_ATTRS));
  userRecord.updated = new Date();
  return userRecord.save();
}

export async function removeUser(projectId, username) {
  if (!projectId) {
    throw new ValidationError('projectId');
  }
  return User.remove({ username, projectId });
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
