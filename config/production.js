const {
  MONGO_URI,
  TEST_MONGO_URI,
} = process.env;

module.exports = {
  server: {
    features: {
      // db: {
      //   mongoose: {
      //     uri: MONGO_URI || 'mongodb://localhost:27017/auth-server',
      //     testUri: TEST_MONGO_URI || 'mongodb://localhost:27017/auth-serverTest',
      //   },
      // },
    },
  },
};
