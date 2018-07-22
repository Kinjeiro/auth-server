const path = require('path');

const ROOT_DIR = process.cwd();

function pathJoin(...args) {
  // return path.posix.join(...args);
  return path.join(...args);
}

function inRoot(...args) {
  return args.length === 0
    ? ROOT_DIR
    : pathJoin(ROOT_DIR, ...args);
}

function inSrc(...args) {
  return inRoot('src', ...args);
}

function inNodeModules(...args) {
  return inRoot('node_modules', ...args);
}

function requireSafe(modulePath) {
  let result;

  try {
    result = require(modulePath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
    console.log(`Doesn't find module ${modulePath}`);
  }

  // // @NOTE: важно помнить, что если не подать разрешение, то existsSync не найдет
  // if (fs.existsSync(modulePath)) {
  //   result = require(modulePath);
  // } else {
  //   console.log(`Doesn't find module ${modulePath}`);
  // }

  return result;
}

module.exports = {
  ROOT_DIR,
  pathJoin,
  inRoot,
  inSrc,
  inNodeModules,
  requireSafe
};
