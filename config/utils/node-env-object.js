/**
 * // todo @ANKU @LOW - @BUG_OUT pm2 - в фазе pre-deploy стариет все " - невозможно их экранировать - поэтму приходится придумывать константы
 * @type {string}
 */
const NODE_ENV_HACK_CONSTANT = '[[[';

function regExpEscape(regExpString) {
  return regExpString.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function serializeObjectToNodeEnv(object) {
  return JSON.stringify(object).replace(/"/g, NODE_ENV_HACK_CONSTANT);
}

function parseObjectFromNodeEnv(objectHackJsonStr) {
  return objectHackJsonStr && JSON.parse(
    objectHackJsonStr.replace(
      new RegExp(regExpEscape(NODE_ENV_HACK_CONSTANT), 'g'),
      '"'
    )
  );
}

module.exports = {
  NODE_ENV_HACK_CONSTANT,
  serializeObjectToNodeEnv,
  parseObjectFromNodeEnv,
};
