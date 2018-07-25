export default class ValidationError extends Error {
  status = 422;
  errors = {};

  constructor(field, msg) {
    super(msg);
    this.errors[field] = msg;
  }
}
