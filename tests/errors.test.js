const { ValidationError, NotFoundError, ConflictError } = require('../src/errors');

describe('custom errors (unit)', () => {
  test('ValidationError carries status 400 and the details', () => {
    const e = new ValidationError(['name is required']);
    expect(e).toBeInstanceOf(Error);
    expect(e).toMatchObject({ name: 'ValidationError', status: 400, message: 'Validation failed', details: ['name is required'] });
  });

  test('NotFoundError defaults to status 404 and "Product not found"', () => {
    const e = new NotFoundError();
    expect(e).toBeInstanceOf(Error);
    expect(e).toMatchObject({ name: 'NotFoundError', status: 404, message: 'Product not found' });
  });

  test('NotFoundError accepts a custom message', () => {
    expect(new NotFoundError('Supplier not found').message).toBe('Supplier not found');
  });

  test('ConflictError carries status 409 and the message', () => {
    const e = new ConflictError('duplicate');
    expect(e).toBeInstanceOf(Error);
    expect(e).toMatchObject({ name: 'ConflictError', status: 409, message: 'duplicate' });
    expect(e.details).toBeUndefined();
  });
});
