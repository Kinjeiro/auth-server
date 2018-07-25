import mongoose from 'mongoose';

import { USER_MODEL_NAME } from './user';

// AccessToken
export const AccessTokenSchema = new mongoose.Schema({
  userId: {
    // type: String,
    type: mongoose.Schema.Types.ObjectId,
    ref: USER_MODEL_NAME,
    required: true,
  },

  clientId: {
    type: String,
    required: true,
  },

  token: {
    type: String,
    unique: true,
    required: true,
  },

  created: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('AccessToken', AccessTokenSchema);
