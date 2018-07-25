import merge from 'lodash/merge';

import winstonLoggerFactory from './winston/winston-logger';
import config from '../config';

/**
 * Которые определены в конфигах
 */
export const DEFAULT_LOGGER_IDS = {
  FILE: 'fileLogger',
  CONSOLE: 'consoleLogger',
};

export function loggerFactory(transportConfigs = null) {
  const transports = transportConfigs
    ? merge({}, config.server.features.logger.transports, transportConfigs)
    : config.server.features.logger.transports;

  if (Object.keys(transports).length) {
    return winstonLoggerFactory(transports, config.server.features.logger.winston);
  }

  return console;
}

function getFilePath(module) {
  // using filename in log statements
  return module.filename.split('/')
    .slice(-2)
    .join('/');
}

export function getLoggersWithFileLable(fileModule) {
  return loggerFactory({
    [DEFAULT_LOGGER_IDS.CONSOLE]: {
      label: getFilePath(fileModule),
    },
  });
}

export const defaultLogger = loggerFactory();

/*
 https://tools.ietf.org/html/rfc5424
 {
 error: 0,
 warn: 1,
 info: 2,
 verbose: 3,
 debug: 4,
 silly: 5
 }
 */
export default defaultLogger;
