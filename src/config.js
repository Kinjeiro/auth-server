import merge from 'lodash/merge';

import fullConfig from '../config/utils/get-full-config';

const config = fullConfig;

export function updateConfig(newConfig, clearPrevious = false) {
  if (clearPrevious) {
    for (const prop of Object.getOwnPropertyNames(config)) {
      delete config[prop];
    }
  }
  merge(config, newConfig);
}

export default config;
