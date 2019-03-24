/* eslint-disable */
/**
 * // todo @ANKU @LOW - @BUG_OUT pm2 - в фазе pre-deploy стариет все " - невозможно их экранировать - поэтму приходится придумывать константы
 * @type {string}
 */
const NODE_ENV_HACK_CONSTANT_QUOTES = '[[[';
const NODE_ENV_HACK_CONSTANT_COMMON = ']]]';

function regExpEscape(regExpString) {
  return regExpString.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function serializeObjectToNodeEnv(object) {
  return object
    ? JSON.stringify(object)
        .replace(/"/g, NODE_ENV_HACK_CONSTANT_QUOTES)
        .replace(/,/g, NODE_ENV_HACK_CONSTANT_COMMON)
    : object;
}

function parseObjectFromNodeEnv(objectHackJsonStr) {
  return objectHackJsonStr && JSON.parse(
    objectHackJsonStr
      .replace(new RegExp(regExpEscape(NODE_ENV_HACK_CONSTANT_COMMON), 'g'), ',')
      .replace(new RegExp(regExpEscape(NODE_ENV_HACK_CONSTANT_QUOTES), 'g'), '"')
  );
}

module.exports = {
  NODE_ENV_HACK_CONSTANT: NODE_ENV_HACK_CONSTANT_QUOTES,
  serializeObjectToNodeEnv,
  parseObjectFromNodeEnv,
};
