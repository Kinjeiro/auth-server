/* eslint-disable camelcase */
export function getProjectIdFromScope(scope) {
  let scopeArray = scope;
  if (typeof scopeArray === 'string') {
    scopeArray = scopeArray.split(' ');
  }
  return scopeArray && scopeArray[0];
}

export function getProjectId(req) {
  const {
    headers: {
      project_id,
    },
    body: {
      client_id,
      // к сожалению во время авторизации через паспорт в handler передаются только "scope"
      scope,
    } = {},
    query: {
      /*
        todo @ANKU @LOW @BUG_OUT @swagger-ui - при request body у них открытая бага - не кладутся client_id и client_secret в боди
         https://github.com/swagger-api/swagger-ui/pull/4213
         https://github.com/swagger-api/swagger-ui/blob/master/src/core/plugins/auth/actions.js#L87

        Пришлось добавить возможность через req.query сделать - обновить плагин - стратегию
        \src\auth\passport-oauth2-client-password-strategy.js
      */
      client_id: urlClientId,
    },
  } = req;
  return project_id || client_id || urlClientId || getProjectIdFromScope(scope);
}
