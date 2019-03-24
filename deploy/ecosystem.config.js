/* eslint-disable comma-dangle,no-multi-str,max-len */
const {
  getLogPaths,
  getProcessAppName
} = require('./ecosystem-utils');

const {
  START_SCRIPT = './dist/server.js',
} = process.env;

const logs = getLogPaths();

module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: getProcessAppName(),
      script: START_SCRIPT,

      ...logs,

      env_development: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    }
  ]
};
