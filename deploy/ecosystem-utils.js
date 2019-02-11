const path = require('path');
const config = require('config');

const packageJson = require('../package.json');

const appName = packageJson.name;

const DEFAULT_USER = 'root';

function getProcessAppName() {
  // todo @ANKU @LOW - убрать запуск внутрь доккера и не придется так далеть
  // в имени приложения будет проставлять порт, чтобы можно было бы несколько инстансов поднимать на одной машине
  return `${appName}_${config.server.main.port}`;
}

function defaultAppPath(user = DEFAULT_USER, defaultAppName = getProcessAppName()) {
  return user === 'root'
    ? `/home/${defaultAppName}`
    : `/home/${user}/${defaultAppName}`;
}
function defaultAppLogFolderPath(user = DEFAULT_USER, logsFolder = 'logs') {
  return user === 'root'
    ? `/home/${logsFolder}`
    : `/home/${user}/${logsFolder}`;
}

function getLogPaths(logPath = defaultAppLogFolderPath()) {
  return {
    output: path.join(logPath, `${appName}-out.log`),
    error: path.join(logPath, `${appName}-error.log`),
    log: path.join(logPath, `${appName}-combi.log`),
  };
}

module.exports = {
  DEFAULT_USER,
  getProcessAppName,
  getLogPaths,
  getAppLogFolderPath: defaultAppLogFolderPath,
  getAppPath: defaultAppPath,
};
