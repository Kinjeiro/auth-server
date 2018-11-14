export default class NotFoundError extends Error {
  status = 404;
  errorClass = 'NotFoundError';
  notFoundField = null;

  constructor(field, msg = null) {
    super(msg || `Not found ${field}.`);
    this.notFoundField = field;
  }
}
