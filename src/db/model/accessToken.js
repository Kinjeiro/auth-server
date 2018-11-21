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
  /**
   * Длительность в секундах - по стандарту передаем именно время жизни в секундах, а не когда кончится
   * https://www.oauth.com/oauth2-servers/access-tokens/access-token-response/
   */
  expiresIn: {
    type: Number,
  },
  /**
   * Когда истекает
   */
  expiresInDate: {
    type: Date,
  },
});

export default mongoose.model('AccessToken', AccessTokenSchema);
