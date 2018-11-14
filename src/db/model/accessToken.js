import mongoose from 'mongoose';

import { USER_MODEL_NAME } from './user';

// AccessToken
export const AccessTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    // type: mongoose.Schema.Types.ObjectId,
    // ref: USER_MODEL_NAME,
    required: true,
  },

  clientId: {
    type: String,
    required: true,
  },

  /**
   * если создается локально (не через социалки) то создается не jwt token а просто hash
   */
  token: {
    type: String,
    unique: true,
    required: true,
  },

  /**
   * Тот, кто выдал этот токен. Может быть local, facebook, google, vk и т.д.
   */
  provider: {
    type: String,
    default: 'local',
  },

  created: {
    type: Date,
    default: Date.now,
  },
  expiresIn: {
    type: Date,
  },
});

export default mongoose.model('AccessToken', AccessTokenSchema);
