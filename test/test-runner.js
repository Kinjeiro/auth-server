import glob from 'glob';

import { inSrc } from '../src/utils/path-utils';

import './init-test-environment';


/*
  Для запуска моки в IDE нужно в default mocha в NODE_OPTS дописать:
  --require babel-register --require ./test/init-test-environment.js
*/

// ======================================================
// Tests Importer
// ======================================================
glob.sync('/**/*.test.js', {
  root: inSrc(),
})
  .forEach((testFile) => require(testFile));
// or mocha --require test/test-runner.js

// shutdown server
// server.close();
