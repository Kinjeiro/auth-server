import ValidationError from '../models/errors/ValidationError';

import User from '../db/model/user';
import AccessToken from '../db/model/accessToken';
import RefreshToken from '../db/model/refreshToken';
import ResetPasswordToken from '../db/model/resetPasswordToken';

export async function removeUser(projectId, username) {
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
