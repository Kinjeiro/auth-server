const {
  MONGO_URI,
  TEST_MONGO_URI,
} = process.env;

module.exports = {
  common: {
    // contextPath: '',
  },
  server: {
    features: {
      // db: {
      //   mongoose: {
      //     uri: MONGO_URI || 'mongodb://dev.reagentum.ru:27017/auth-server',
      //     testUri: TEST_MONGO_URI || 'mongodb://dev.reagentum.ru:27017/auth-serverTest',
      //   },
      // },
    },
  },
};
