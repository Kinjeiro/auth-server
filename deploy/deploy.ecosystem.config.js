/* eslint-disable comma-dangle,no-multi-str,max-len */
// const path = require('path');

const packageJson = require('../package.json');
const {
  DEFAULT_USER,
  getLogPaths,
  getAppPath,
  getProcessAppName,
} = require('./ecosystem-utils');

const appName = packageJson.name;
const appVersion = packageJson.version;

const {
  DEV_HOST = 'dev.reagentum.ru',
  DEV_PORT,
  DEV_USER = DEFAULT_USER,
  DEV_APP_PATH,
  DEV_START_NODE_ENV_JSON,

  PROD_HOST = 'front.reagentum.ru',
  PROD_PORT,
  PROD_USER = DEFAULT_USER,
  PROD_APP_PATH,
  PROD_START_NODE_ENV_JSON,

  // const REPO = 'git@gitlab.com:<project_name>.git';
  REPO = packageJson.repository,
} = process.env;

console.log(`
  // ======================================================
  // ${appName}@${appVersion}
  // ======================================================
`);

console.log(`
  Используйте у себя в package.json:
  
  "----- BUILD -----": "----------",
  "build:inner": "node ./node_modules/@reagentum/front-core/build-scripts/update-babelrc.js && node ./node_modules/@reagentum/front-core/build-scripts/build.js",
  "build:inner-env": "npm run build:inner",
  "build:production": "cross-env NODE_ENV=production npm run build:inner-env",
  "build:development": "cross-env NODE_ENV=development npm run build:inner-env",
  "----- START DAEMON -----": "----------",
  "start:daemon:development": "pm2 restart ./deploy/ecosystem.config.js --env development --update-env && pm2 save",
  "start:daemon:production": "pm2 restart ./deploy/ecosystem.config.js --env production --update-env && pm2 save",
  "start:daemon": "npm run start:daemon:production",
`);

function deployOptions(isProduction = false) {
  const HOST = isProduction ? PROD_HOST : DEV_HOST;
  const PORT = isProduction ? PROD_PORT : DEV_PORT;
  const USER = isProduction ? PROD_USER : DEV_USER;
  const CUSTOM_APP_PATH = isProduction ? PROD_APP_PATH : DEV_APP_PATH;
  const START_NODE_ENV_OBJECT = isProduction ? PROD_START_NODE_ENV_JSON : DEV_START_NODE_ENV_JSON;

  /*
    @NOTE: у pm2 структура папок app: current \ source
  */
  // const APP_PATH_SOURCE = path.join(APP_PATH, 'source');
  const appNameFinal = getProcessAppName(PORT);
  const APP_PATH = getAppPath(USER, CUSTOM_APP_PATH || appNameFinal);
  console.log('APP_PATH: ', APP_PATH);

  const { log } = getLogPaths(appNameFinal);
  console.log('App log file: ', log);

  let startNodeEnvObject = {};
  if (START_NODE_ENV_OBJECT) {
    startNodeEnvObject = JSON.parse(START_NODE_ENV_OBJECT);
  }
  if (PORT) {
    startNodeEnvObject.PORT = PORT;
  }
  const startNodeEnvStr = startNodeEnvObject && Object.keys(startNodeEnvObject).length > 0
    ? Object.keys(startNodeEnvObject).reduce(
      (result, envKey) => {
        let value = startNodeEnvObject[envKey];
        if (typeof value === 'object') {
          // value = `${JSON.stringify(value).replace(/"/g, '\\"')}`;
          value = `'${JSON.stringify(value)}'`;
        } else if (typeof value !== 'number') {
          value = `'${value}'`;
        }
        return `${result} '${envKey}'=${value}`;
      },
      ' cross-env ',
    )
    : '';
  console.log('startNodeEnvStr: ', startNodeEnvStr);

  console.warn('ANKU test, ', `${startNodeEnvStr} npm run ${isProduction ? 'build:production' : 'build:development'}`);

  return {
    // мы кладем ключ в DEPLOY KEYS в gitlab CI
    // /*
    //  todo @ANKU @LOW - также можно сгерировать пару на сервере, добавить public key - https://gitlab.com/reagentum/yapomosh/yapomosh-front/settings/repository::deploy keys
    //  и тогда с этого сервере можно будет key коннектится к репозиторию
    //  чтобы подключить к удаленному серверу
    //  */
    // // из .gitlab-ci.yml: в docker gitlab runner сохранияется ключ к dev серверу в файл
    // !!! если репозиторий private - необходимо на удаленном сервере иметь public ключ для этого хранилища - хорошо бы этого избежать
    // хорошо бы этот ключ заранее передавать либо сделать один ключ на сервер и на gitlab и использовать ForwardAgent=yes
    // key: '~/.ssh/id_rsa',
    // но мы используем GITLAB DEPLOY KEYS

    user: USER,
    host: HOST,
    ssh_options: ['StrictHostKeyChecking=no', 'PasswordAuthentication=no'],

    // скачать на удаленном сервере репозиторий
    ref: 'origin/master',
    repo: REPO,

    // установить на удаленном сервере последнюю версию приложения
    path: APP_PATH,

    /*
      @NOTE: если нужно ротейшен - https://github.com/keymetrics/pm2-logrotate
    */
    log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',

    // todo @ANKU @LOW - @BUG_OUT @GITLAB - у нас два обращение от private server to gitlab repo - здесь используются token keys
    // но при ошибки pm2 setup (так как директория уже существует в следующий раз) второй раз при деплои токен уже был недействителен
    // и падала ошибка:
    //    remote: HTTP Basic: Access denied
    //    fatal: Authentication failed for 'https://gitlab-ci-token:8p4t-abFSKvu691gZ6UL@gitlab.com/reagentum/reafront/auth-server-oauth2.git/'
    // выход из этой ситуации чтобы setup отрападывал без ошибок, поэтому добавили чтобы перед сетапом pm2 всегда очищал папку
    // pm2 ecosystem.config.js: 'pre-setup': `rm -rf ${APP_PATH}`,
    // pm2 создает папки: current, source и shared. Вот удаляем source
    // rm -rf ${APP_PATH}/source\
    // todo @ANKU @LOW - сделать так чтобы когда идет обновление не останавливался текущий сервак
    'pre-setup': `\
      rm -rf ${APP_PATH}\
    `,
    // 'post-setup': "apt-get install git ; ls -la",
    // 'pre-deploy-local': `\
    //   echo 'This is a local executed command'\
    //   mkdir -p ${APP_PATH}\
    // `,


    /*
      todo @ANKU @LOW - @BUG_OUT @node-gyp - gyp ERR! stack Error: not found: make
      На машине нужно установить набор инструментов
      # build-essential - нужна чтобы сбилдить node-gyp - https://stackoverflow.com/questions/14772508/npm-failed-to-install-time-with-make-not-found-error
      # alpine-sdk - эквивалент для ubuntu чтобы собирать пакеты
        - apt-get install build-essential
        - apk add alpine-sdk
    */
    /*
      todo @ANKU @LOW @BUG_OUT @npm @pm2 - нужно да npm install
      1) первый - устанавливает - собирает библиотеку node-gyp но почему-то остальные не инсталит (config к примеру не устанавливался, был только в front-core)
      2) второй - устанавливает депенденси нормальные
    */
    'post-deploy': `\
      apt-get -y install build-essential\
      && npm install -g cross-env\
      && npm install\
      && npm install\
      && ${startNodeEnvStr} npm run ${isProduction ? 'build:production' : 'build:development'}\
      && ${startNodeEnvStr} npm run ${isProduction ? 'start:daemon:production' : 'start:daemon:development'}\
      && pm2 save\
      && echo 'wait 30 sec and show logs...'\
      && sleep 30\
      && tail -n 300 ${log} || true\
    `,
  };
}

module.exports = {
  /**
   * Deployment section
   * https://pm2.io/doc/en/runtime/guide/easy-deploy-with-ssh/
   */
  deploy: {
    development: deployOptions(),
    production: deployOptions(true),
  },
};
