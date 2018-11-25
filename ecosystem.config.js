/* eslint-disable comma-dangle,no-multi-str */
const packageJson = require('./package.json');

const appName = packageJson.name;

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

const appsOptions = {
  PORT: 3001,
  SERVER_PORT: 3001,
};

function deployOptions(isProduction = false) {
  return {
    // мы кладем ключ в DEPLOY KEYS в gitlab CI
    // /*
    //  todo @ANKU @LOW - также можно сгерировать пару на сервере, добавить public key - https://gitlab.com/reagentum/yapomosh/yapomosh-front/settings/repository::deploy keys
    //  и тогда с этого сервере можно будет key коннектится к репозиторию
    //  чтобы подключить к удаленному серверу
    //  */
    // // из .gitlab-ci.yml: в docker gitlab runner сохранияется ключ к dev серверу в файл
    // key: '~/.ssh/id_rsa',
    user: isProduction ? PROD_USER : DEV_USER,
    host: isProduction ? PROD_HOST : DEV_HOST,
    ssh_options: ['StrictHostKeyChecking=no', 'PasswordAuthentication=no'],

    // скачать на удаленном сервере репозиторий
    ref: 'origin/master',
    repo: REPO,
    // todo @ANKU @LOW - !!! если репозиторий private - необходимо на удаленном сервере иметь public ключ для этого хранилища - хорошо бы этого избежать
    // todo @ANKU @LOW - хорошо бы этот ключ заранее передавать либо сделать один ключ на сервер и на gitlab и использовать ForwardAgent=yes

    // установить на удаленном сервере последнюю версию приложения
    path: isProduction ? PROD_APP_PATH : DEV_APP_PATH,
    'post-deploy': `\
      npm install\
      && npm run ${isProduction ? 'build' : 'build-development'}\
      && pm2 startOrRestart ecosystem.config.js ${isProduction ? '--env production' : '--env development'}\
      && pm2 save\
      && sleep 60\
      && tail --lines 200 $HOME/.pm2/logs/yapomosh-error.log\
    `,
  };
}

module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: appName,
      script: './.build/server.js',
      env: {
        ...appsOptions,
        NODE_ENV: 'development',
        APP_MOCKS: 1,
        USE_MOCKS: 1,
        CONTEXT_PATH: appName,
      },
      env_production: {
        ...appsOptions,
        NODE_ENV: 'production',
      },
    }
  ],

  /**
   * Deployment section
   * https://pm2.io/doc/en/runtime/guide/easy-deploy-with-ssh/
   */
  deploy: {
    development: deployOptions(),
    production: deployOptions(true),
  }
};
