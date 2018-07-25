/* eslint-disable no-param-reassign */
import { wrapToArray } from '../../utils/common';

export default class PermissionError extends Error {
  status = 403;
  permissions = null;
  roles = null;

  constructor(permissions = null, roles = null) {
    permissions = wrapToArray(permissions);
    roles = wrapToArray(roles);

    const message = permissions.length || roles.length
      ? `
        Doesn't have 
        ${permissions.length ? ` permissions [${permissions.join(' ')}]` : ''}
        ${roles.length ? ` ${permissions.length ? ' and' : ''} roles [${permissions.join(' ')}]` : ''}
      `
      : 'Doesn\'t have permissions';

    super(message);

    this.permissions = permissions;
    this.roles = roles;
  }
}
