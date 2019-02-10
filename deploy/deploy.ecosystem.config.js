/* eslint-disable comma-dangle,no-multi-str,max-len */
const path = require('path');
const packageJson = require('../package.json');
const {
  DEFAULT_USER,
  getLogPaths,
  getAppPath,
} = require('./ecosystem-utils');

const appName = packageJson.name;
const appVersion = packageJson.version;

// Target server hostname or IP address
const DEV_HOST = process.env.DEV_HOST
  ? process.env.DEV_HOST.trim()
  : 'dev.reagentum.ru';
const DEV_USER = process.env.DEV_USER
  ? process.env.DEV_USER.trim()
  : DEFAULT_USER;
// Target server application path
const DEV_APP_PATH = process.env.DEV_APP_PATH
  ? process.env.DEV_APP_PATH.trim()
  : getAppPath(DEV_USER);


// Target server hostname or IP address
const PROD_HOST = process.env.PROD_HOST
  ? process.env.PROD_HOST.trim()
  : 'front.reagentum.ru';
const PROD_USER = process.env.PROD_USER
  ? process.env.PROD_USER.trim()
  : DEFAULT_USER;
// Target server application path
const PROD_APP_PATH = process.env.PROD_APP_PATH
  ? process.env.PROD_APP_PATH.trim()
  : getAppPath(PROD_USER);

// Your repository
// const REPO = 'git@gitlab.com:<project_name>.git';
const REPO = process.env.REPO || packageJson.repository;

console.log(`
    // ======================================================
    // ${appName}@${appVersion}
    // ======================================================
  `);

console.log(`
    Используйте у себя в package.json:
    
    "----- BUILD -----": "----------",
    "build:inner": "node ./node_modules/@reagentum/front-core/build-scripts/update-babelrc.js && node ./node_modules/@reagentum/front-core/build-scripts/build.js",
    "build:inner-env": "cross-env SERVER_PORT=3001 npm run build:inner",
    "build:production": "cross-env NODE_ENV=production npm run build:inner-env",
    "build:development": "cross-env NODE_ENV=development npm run build:inner-env",
    "----- START DAEMON -----": "----------",
    "start:daemon:development": "pm2 restart ./deploy/ecosystem.config.js --env development --update-env && pm2 save",
    "start:daemon:production": "pm2 restart ./deploy/ecosystem.config.js --env production --update-env && pm2 save",
  `);

function deployOptions(isProduction = false) {
  const APP_PATH = isProduction ? PROD_APP_PATH : DEV_APP_PATH;
  /*
    @NOTE: у pm2 структура папок app: current \ source
  */
  // const APP_PATH_SOURCE = path.join(APP_PATH, 'source');

  let START_NODE_ENV_OBJECT = isProduction ? process.env.PROD_START_NODE_ENV_JSON : process.env.DEV_START_NODE_ENV_JSON;
  if (START_NODE_ENV_OBJECT) {
    START_NODE_ENV_OBJECT = JSON.parse(START_NODE_ENV_OBJECT);
  }

  const START_NODE_ENV_STR = START_NODE_ENV_OBJECT && Object.keys(START_NODE_ENV_OBJECT).length > 0
    ? Object.keys(START_NODE_ENV_OBJECT).reduce(
      (result, envKey) => {
        let value = START_NODE_ENV_OBJECT[envKey];
        if (typeof value !== 'number') {
          value = `'${value}'`;
        }
        return `${result} '${envKey}'=${value}`;
      },
      ' cross-env ',
    )
    : '';
  console.log('START_NODE_ENV_STR: ', START_NODE_ENV_STR);

  const { log } = getLogPaths();

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

    user: isProduction ? PROD_USER : DEV_USER,
    host: isProduction ? PROD_HOST : DEV_HOST,
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
      && npm run ${isProduction ? 'build:production' : 'build:development'}\
      && ${START_NODE_ENV_STR} npm run ${isProduction ? 'start:daemon:production' : 'start:daemon:development'}\
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
