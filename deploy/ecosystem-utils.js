const path = require('path');

const packageJson = require('../package.json');

const {
  PORT,
  SERVER_PORT,
} = process.env;
const appName = packageJson.name;

const DEFAULT_USER = 'root';

function getProcessAppName(port = PORT || SERVER_PORT) {
  // todo @ANKU @LOW - убрать запуск внутрь доккера и не придется так далеть
  // в имени приложения будет проставлять порт, чтобы можно было бы несколько инстансов поднимать на одной машине
  return `${appName}_${port || 8080}`;
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

function getLogPaths(appNameInner = getProcessAppName(), logPath = defaultAppLogFolderPath()) {
  console.warn('ANKU , appNameInner', appNameInner);
  return {
    output: path.join(logPath, `${appNameInner}-out.log`),
    error: path.join(logPath, `${appNameInner}-error.log`),
    log: path.join(logPath, `${appNameInner}-combi.log`),
  };
}

module.exports = {
  DEFAULT_USER,
  getProcessAppName,
  getLogPaths,
  getAppLogFolderPath: defaultAppLogFolderPath,
  getAppPath: defaultAppPath,
};
