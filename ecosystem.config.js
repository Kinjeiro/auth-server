/* eslint-disable comma-dangle,no-multi-str */
const packageJson = require('./package.json');

const appName = packageJson.name;
const appVersion = packageJson.version;

const DEFAULT_USER = 'root';
function defaultAppPath(user) {
  return user === 'root'
    ? `/home/${appName}`
    : `/home/${user}/${appName}`;
}

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
  : defaultAppPath(DEV_USER);


// Target server hostname or IP address
const PROD_HOST = process.env.PROD_HOST
  ? process.env.PROD_HOST.trim()
  : 'dev.reagentum.ru';
const PROD_USER = process.env.PROD_USER
  ? process.env.PROD_USER.trim()
  : DEFAULT_USER;
// Target server application path
const PROD_APP_PATH = process.env.PROD_APP_PATH
  ? process.env.PROD_APP_PATH.trim()
  : defaultAppPath(PROD_USER);

// Your repository
// const REPO = 'git@gitlab.com:<project_name>.git';
const REPO = process.env.REPO || packageJson.repository;
// const REPO = 'git@gitlab.com:reagentum/reafront/auth-server-oauth2.git';
// let REPO = process.env.REPO || packageJson.repository;
// console.warn('ANKU , REPO', REPO);
// REPO = `git${REPO.substr(REPO.indexOf('@'))}`;
// console.warn('ANKU , REPO 2', REPO);

// const DEV_CONTEXT_PATH = process.env.DEV_CONTEXT_PATH;
// const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;

const START_SCRIPT = process.env.START_SCRIPT || './.build/server.js';

function deployOptions(isProduction = false) {
  console.log(`
    // ======================================================\
    // ${appName}@${appVersion}\
    // ======================================================\
  `);

  const APP_PATH = isProduction ? PROD_APP_PATH : DEV_APP_PATH;
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

  console.log('START_NODE_ENV_STR', START_NODE_ENV_STR);

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

    // todo @ANKU @LOW - @BUG_OUT @GITLAB - у нас два обращение от private server to gitlab repo - здесь используются token keys
    // но при ошибки pm2 setup (так как директория уже существует в следующий раз) второй раз при деплои токен уже был недействителен
    // и падала ошибка:
    //    remote: HTTP Basic: Access denied
    //    fatal: Authentication failed for 'https://gitlab-ci-token:8p4t-abFSKvu691gZ6UL@gitlab.com/reagentum/reafront/auth-server-oauth2.git/'
    // выход из этой ситуации чтобы setup отрападывал без ошибок, поэтому добавили чтобы перед сетапом pm2 всегда очищал папку
    // pm2 ecosystem.config.js: 'pre-setup': `rm -rf ${APP_PATH}`,
    // pm2 создает папки: current, source и shared. Вот удаляем source
    'pre-setup': `rm -rf ${APP_PATH}/source`,
    // 'post-setup': "apt-get install git ; ls -la",
    // 'pre-deploy-local': `\
    //   echo 'This is a local executed command'\
    //   mkdir -p ${APP_PATH}\
    // `,
    'post-deploy': `\
      npm install -g cross-env\
      && npm install --no-save\
      && npm run ${isProduction ? 'build:production' : 'build:development'}\
      && ${START_NODE_ENV_STR} npm run start:daemon:${isProduction ? 'production' : 'development'}\
      && pm2 save\
      && echo 'wait 40 sec and show logs...'\
      && sleep 40\
      && tail --lines 500 $HOME/.pm2/logs/${appName.replace(/[@/\\.]/gi, '-')}-error.log\
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

  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: appName,
      script: START_SCRIPT,
      env_development: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    }
  ]
};
