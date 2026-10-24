// A small error type that controllers can throw.
// config/errorHandler.js turns it into a JSON response with the right status code.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.statusCode = status;
    if (details !== undefined) this.details = details;
  }
}

module.exports = HttpError;
