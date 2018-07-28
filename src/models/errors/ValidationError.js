/*
 The 412 (Precondition Failed) status code indicates that one or more
 conditions given in the request header fields evaluated to false when
 tested on the server. This response code allows the client to place
 preconditions on the current resource state (its current
 representations and metadata) and, thus, prevent the request method
 from being applied if the target resource is in an unexpected state.
 (http://tools.ietf.org/html/rfc7232#section-4.2)

 The 422 (Unprocessable Entity) status code means the server
 understands the content type of the request entity (hence a
 415(Unsupported Media Type) status code is inappropriate), and the
 syntax of the request entity is correct (thus a 400 (Bad Request)
 status code is inappropriate) but was unable to process the contained
 instructions. For example, this error condition may occur if an XML
 request body contains well-formed (i.e., syntactically correct), but
 semantically erroneous, XML instructions.
 (http://tools.ietf.org/html/rfc4918#section-11.2)
 */

export default class ValidationError extends Error {
  status = 422;
  validationErrors = {};

  constructor(field, msg = null) {
    if (typeof field === 'object') {
      super(`Invalid parameters: ${Object.keys(field).join(', ')}`);
      this.validationErrors = field;
    } else {
      super(msg || `Invalid parameter "${field}"`);
      this.validationErrors[field] = msg;
    }
  }
}
