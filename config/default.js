const defaultLogsPath = process.cwd() + '/logs/all.log';

const {
  PORT = 1337,
  NODE_ENV = 'development',
  MONGO_URI = 'mongodb://localhost:27017/frontCoreAuth',
  TEST_MONGO_URI = 'mongodb://localhost:27017/frontCoreAuthTest',
  LOGS_PATH = defaultLogsPath,
} = process.env;

const env = NODE_ENV;

module.exports = {
  common: {
    env,
    isProduction: env === 'production',
    isTest: env === 'test',
  },

  server: {
    /*
      @NOTE: ВАЖНО! тут прописываются пути до родительских конфигов, к примеру parentConfigs: [''],
    */
    parentConfigs: null,

    serverConfig: {
      port: PORT,

      expressServerOptions: {
      },
    },

    features: {
      security: {
        token: {
          tokenLife: 3600,
        },
      },

      logger: {
        winston: {
          exitOnError: false,
        },

        transports: {
          fileLogger: {
            id: 'fileLogger',
            type: 'file',
            level: 'info',
            filename: LOGS_PATH,
            handleException: true,
            json: true,
            maxSize: 5242880, // 5mb
            maxFiles: 2,
            colorize: false,
          },
          consoleLogger: {
            id: 'consoleLogger',
            type: 'console',
            level: 'debug',
            // label: getFilePath(module),
            handleException: true,
            json: false,
            colorize: true,
          },
        },
      },

      db: {
        mongoose: {
          uri: MONGO_URI,
          testUri: TEST_MONGO_URI,
        },
      },

      mail: {
        transportOptions: {
          // service: 'SendGrid',
          // FREE: 100 mails in month
          host: 'smtp.sendgrid.net',
          /*
           Ports
           25, 587  - (for unencrypted/TLS connections)
           465      - (for SSL connections)
           */
          port: 587,

          // security: false,

          /*
           Если не проставлять падает ошибка:
           code=ESOCKET, command=CONN
           Error: self signed certificate in certificate chain
           at TLSSocket.onConnectSecure (_tls_wrap.js:1036:3
           */
          tls: {
            rejectUnauthorized: false,
          },

          auth: {
            user: 'apikey',
            pass: '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',
          },
        },
        messageOptions: {
          from: 'kinjeiro@gmail.com',
        },
      },

      resetPassword: {
        tokenLife: 3600, // час
      },
    },
  },
};
