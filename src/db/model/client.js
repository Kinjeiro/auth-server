import mongoose from 'mongoose';

export const ClientSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },

  clientId: {
    type: String,
    unique: true,
    required: true,
  },

  clientSecret: {
    type: String,
    required: true,
  },

  providerCredentials: {
    type: Map,
    of: {
      google: {
        clientID: String,
        clientSecret: String,
      },
      facebook: {
        clientID: String,
        clientSecret: String,
      },
      vkontakte: {
        clientID: String,
        clientSecret: String,
      },
    },
  },
});

export default mongoose.model('Client', ClientSchema);
