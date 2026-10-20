class ValidationError extends Error {
  constructor(details) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Product not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

module.exports = { ValidationError, NotFoundError, ConflictError };
