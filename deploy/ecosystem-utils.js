const path = require('path');

const packageJson = require('../package.json');

const appName = packageJson.name;

const DEFAULT_USER = 'root';

function defaultAppPath(user = DEFAULT_USER, app = appName) {
  return user === 'root'
    ? `/home/${app}`
    : `/home/${user}/${app}`;
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
  getLogPaths,
  getAppLogFolderPath: defaultAppLogFolderPath,
  getAppPath: defaultAppPath,
};
