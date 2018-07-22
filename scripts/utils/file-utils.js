const fs = require('fs');
const path = require('path');
const rmdir = require('rimraf');

function ensureDirectoryExistence(filePath) {
  const dirName = path.dirname(filePath);
  if (fs.existsSync(dirName)) {
    return true;
  }
  ensureDirectoryExistence(dirName);
  fs.mkdirSync(dirName);
  return true;
}

function writeToFile(filePath, content) {
  ensureDirectoryExistence(filePath);
  fs.writeFileSync(
    filePath,
    typeof content === 'object'
      ? JSON.stringify(content, null, 2)
      : content,
    'utf8'
  );
}

function removeDir(dirPath) {
  rmdir.sync(dirPath);
}

module.exports = {
  writeToFile,
  removeDir
};
