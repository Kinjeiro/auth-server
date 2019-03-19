const path = require('path');

const defaultLogsPath = `${process.cwd()}/logs/all.log`;

const packageJson = require(path.join(process.cwd(), 'package.json'));
const APP_ID = packageJson.name;
const APP_VERSION = packageJson.version;

const {
  PORT = 1338,
  NODE_ENV = 'development',
  MONGO_URI,
  TEST_MONGO_URI,
  MONGO_USER,
  MONGO_PASSWORD,
  LOGS_PATH = defaultLogsPath,
  DROP_ON_START = false,
  CONTEXT_PATH,
} = process.env;

const env = NODE_ENV;

module.exports = {
  common: {
    env,
    isProduction: env === 'production',
    isTest: env === 'test',
    appId: APP_ID,
    appVersion: APP_VERSION,

    app: {
      contextPath: CONTEXT_PATH,
    },
  },

  server: {
    /*
      @NOTE: ВАЖНО! тут прописываются пути до родительских конфигов, к примеру parentConfigs: [''],
    */
    parentConfigs: null,

    main: {
      port: PORT,
      // актуально для размера аватарки пользователя
      maxContentSize: '3mb',

      expressServerOptions: {},
    },

    features: {
      sslCertificates: {
        /*
          если на сервере используется SSL сертификат через nginx - отключите это, просто проставив null
        */
        privateKey: path.resolve('./demo-cert/demo.local.key'),
        certificate: path.resolve('./demo-cert/demo.local.crt'),
      },

      security: {
        callbackAccessTokenParam: 'accessToken',
        callbackAccessTokenLifeParam: 'accessTokenLife',
        callbackRefreshTokenParam: 'refreshToken',
        callbackRefreshTokenLifeParam: 'refreshTokenLife',

        token: {
          // секунд
          tokenLife: 3600, // час
          refreshTokenLife: 604800, // неделя
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

      // Andrey (kinjeiro@gmail.com) account key
      defaultProviderCredentials: {
        google: {
          // https://codd-wd.ru/shpargalka-poluchenie-tokenov-dlya-raboty-s-api-servisov-google/
          // https://console.developers.google.com/apis/credentials/oauthclient/756888674250-hll8u81fcpeu4t56elschs01g0deg1j3.apps.googleusercontent.com?project=reagentum-231315&hl=ru
          // зачем затребовал включить Google Plus Api
          clientID: '756888674250-hll8u81fcpeu4t56elschs01g0deg1j3.apps.googleusercontent.com',
          clientSecret: '2aEr4CLOg37KoF0Nok8l3Hyh',
        },
        facebook: {
          /*
            https://developers.facebook.com/apps/2226184230986091/fb-login/settings/
            - обязательно https
            - Действительные URI перенаправления для OAuth
              Нужен точный до апи метод указывать в редиректе:
              https://127.0.0.1:1338/api/auth/facebook/callback

            https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing
              - долгосрочный маркер с помощью code
          */
          clientID: 2226184230986091,
          clientSecret: '6b95d53ebaa413b851c21411cdfb3f6f',
        },
        vkontakte: {
          // https://codd-wd.ru/primery-realizacii-avtorizacii-oauth-2-0-vkontakte-na-php-i-javascript-vk-api/
          // https://vk.com/editapp?id=6855085&section=options
          /*
            если тестируем не забудь добавить в базовый домен 127.0.0.1 а "доверенный урл" должен быть пустым
          */
          clientID: '6855085',
          clientSecret: 'k3x4cn9PWb3dwGuBKefz',
        },
        // todo @ANKU @LOW - social auth - yandex
        // https://codd-wd.ru/primery-avtorizaciya-poluchenie-access-token-oauth-2-0-yandeks-i-rabota-s-api-na-php/
      },

      resetPassword: {
        tokenLife: 3600, // час
      },
    },
  },
};
