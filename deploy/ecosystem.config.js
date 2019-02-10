/* eslint-disable comma-dangle,no-multi-str,max-len */
const config = require('config');

const packageJson = require('../package.json');
const { getLogPaths } = require('./ecosystem-utils');

const appName = packageJson.name;
// const appVersion = packageJson.version;
console.warn('ANKU , config', config);
const appPort = config.server.main.port;

const START_SCRIPT = process.env.START_SCRIPT || './dist/server.js';

module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      // todo @ANKU @LOW - убрать запуск внутрь доккера и не придется так далеть
      // в имени приложения будет проставлять порт, чтобы можно было бы несколько инстансов поднимать на одной машине
      name: `${appName}_${appPort}`,
      script: START_SCRIPT,

      ...getLogPaths(),

      env_development: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    }
  ]
};
