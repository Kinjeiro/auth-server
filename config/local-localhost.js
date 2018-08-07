
module.exports = {
  common: {
  },

  server: {
    features: {
      db: {
        mongoose: {
          // uri: 'mongodb://localhost:27017/auth-server',
          uri: 'mongodb://dev.reagentum.ru:27017/auth-server',
          auth: {
            // user: 'superAdmin',
            // password: '',
          },
        },
      },
    },
  },
};
