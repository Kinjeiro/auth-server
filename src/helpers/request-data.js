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
  } = req;
  return project_id || client_id || getProjectIdFromScope(scope);
}
