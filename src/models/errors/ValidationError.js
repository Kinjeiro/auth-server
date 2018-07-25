export default class ValidationError extends Error {
  status = 422;
  errors = {};

  constructor(field, msg = null) {
    super(msg || `Invalid parameter "${field}"`);
    this.errors[field] = msg;
  }
}
