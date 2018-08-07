const path = require('path');

const defaultLogsPath = process.cwd() + '/logs/all.log';

const packageJson = require(path.join(process.cwd(), 'package.json'));
const APP_ID = packageJson.name;
const APP_VERSION = packageJson.version;

const {
  PORT = 1337,
  NODE_ENV = 'development',
  MONGO_URI,
  TEST_MONGO_URI,
  MONGO_USER,
  MONGO_PASSWORD,
  LOGS_PATH = defaultLogsPath,
  DROP_ON_START = false,
} = process.env;

const env = NODE_ENV;

module.exports = {
  common: {
    env,
    isProduction: env === 'production',
    isTest: env === 'test',
    appId: APP_ID,
    appVersion: APP_VERSION,
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
          uri: MONGO_URI || 'mongodb://localhost:27017/auth-server',
          testUri: TEST_MONGO_URI || 'mongodb://localhost:27017/auth-serverTest',
          auth: {
            user: MONGO_USER || 'authServerUser',
            password: MONGO_PASSWORD || 'authAuth',
          },
        },
        dropOnStart: DROP_ON_START,
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

          // connectionTimeout: 60000,
          // greetingTimeout: 30000,
          // // maxConnections: 10,
          // debug: true,

          auth: {
            user: 'apikey',
            // Andrey (kinjeiro@gmail.com) account key
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
