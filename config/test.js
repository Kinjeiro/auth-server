const {
  PORT = 1348,
  TEST_MONGO_URI,
} = process.env;

module.exports = {
  server: {
    main: {
      port: PORT,
    },

    features: {
      db: {
        mongoose: {
          testUri: TEST_MONGO_URI || 'mongodb://dev.reagentum.ru:27017/auth-serverTest',
        },
      },
    },
  },
};
