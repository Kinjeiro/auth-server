const {
  TEST_MONGO_URI,
} = process.env;

module.exports = {
  server: {
    features: {
      db: {
        mongoose: {
          testUri: TEST_MONGO_URI || 'mongodb://dev.reagentum.ru:27017/auth-serverTest',
        },
      },
    },
  },
};
