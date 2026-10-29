const { validateProduct } = require('../src/models/product');
const { ValidationError } = require('../src/errors');

const valid = { name: 'Notebook', sku: 'nb-001', price: 49.5, quantity: 20, category: 'Stationery', lowStockThreshold: 3 };

// Returns the details array of the ValidationError thrown by fn
const detailsOf = (fn) => {
  try { fn(); } catch (e) {
    expect(e).toBeInstanceOf(ValidationError);
    return e.details;
  }
  throw new Error('expected a ValidationError');
};

describe('validateProduct (unit)', () => {
  describe('body shape', () => {
    test.each([
      ['undefined', undefined],
      ['null', null],
      ['a string', 'Notebook'],
      ['a number', 42],
    ])('rejects %s as the body', (_label, input) => {
      expect(detailsOf(() => validateProduct(input))).toEqual(['Request body must be a JSON object']);
      expect(detailsOf(() => validateProduct(input, { partial: true }))).toEqual(['Request body must be a JSON object']);
    });
  });

  describe('full mode (add)', () => {
    test('returns normalised values for a valid product', () => {
      expect(validateProduct(valid)).toEqual({
        name: 'Notebook', sku: 'NB-001', price: 49.5, quantity: 20, category: 'Stationery', lowStockThreshold: 3,
      });
    });

    test('applies defaults for optional fields', () => {
      expect(validateProduct({ name: 'Pen', sku: 'pen-1', price: 10 })).toEqual({
        name: 'Pen', sku: 'PEN-1', price: 10, category: 'General', quantity: 0, lowStockThreshold: 5,
      });
    });

    test('trims name, sku and category', () => {
      const out = validateProduct({ ...valid, name: '  Pen  ', sku: '  pen-1 ', category: '  Office  ' });
      expect(out).toMatchObject({ name: 'Pen', sku: 'PEN-1', category: 'Office' });
    });

    test('ignores unknown fields such as id or timestamps', () => {
      const out = validateProduct({ ...valid, id: 99, createdAt: 'x', hacker: true });
      expect(out).not.toHaveProperty('id');
      expect(out).not.toHaveProperty('createdAt');
      expect(out).not.toHaveProperty('hacker');
    });

    test('accepts zero for price, quantity and lowStockThreshold', () => {
      expect(validateProduct({ ...valid, price: 0, quantity: 0, lowStockThreshold: 0 }))
        .toMatchObject({ price: 0, quantity: 0, lowStockThreshold: 0 });
    });

    test('accepts a name of exactly 100 characters', () => {
      expect(validateProduct({ ...valid, name: 'a'.repeat(100) }).name).toHaveLength(100);
    });

    test('requires name, sku and price', () => {
      expect(detailsOf(() => validateProduct({}))).toEqual([
        'name is required', 'sku is required', 'price must be a number >= 0',
      ]);
    });

    test('collects every error at once', () => {
      const details = detailsOf(() => validateProduct({
        name: '', sku: '', price: -1, category: '', quantity: -1, lowStockThreshold: 1.5,
      }));
      expect(details).toEqual([
        'name is required',
        'sku is required',
        'price must be a number >= 0',
        'category must be a non-empty string',
        'quantity must be an integer >= 0',
        'lowStockThreshold must be an integer >= 0',
      ]);
    });

    test.each([
      ['empty name', { name: '' }, 'name is required'],
      ['whitespace name', { name: '   ' }, 'name is required'],
      ['numeric name', { name: 123 }, 'name is required'],
      ['null name', { name: null }, 'name is required'],
      ['name over 100 chars', { name: 'a'.repeat(101) }, 'name must be at most 100 characters'],
      ['empty sku', { sku: '' }, 'sku is required'],
      ['whitespace sku', { sku: '  ' }, 'sku is required'],
      ['numeric sku', { sku: 100 }, 'sku is required'],
      ['negative price', { price: -0.01 }, 'price must be a number >= 0'],
      ['string price', { price: '10' }, 'price must be a number >= 0'],
      ['NaN price', { price: NaN }, 'price must be a number >= 0'],
      ['Infinity price', { price: Infinity }, 'price must be a number >= 0'],
      ['null price', { price: null }, 'price must be a number >= 0'],
      ['empty category', { category: '' }, 'category must be a non-empty string'],
      ['whitespace category', { category: '   ' }, 'category must be a non-empty string'],
      ['numeric category', { category: 5 }, 'category must be a non-empty string'],
      ['null category', { category: null }, 'category must be a non-empty string'],
      ['negative quantity', { quantity: -1 }, 'quantity must be an integer >= 0'],
      ['fractional quantity', { quantity: 2.5 }, 'quantity must be an integer >= 0'],
      ['string quantity', { quantity: '3' }, 'quantity must be an integer >= 0'],
      ['null quantity', { quantity: null }, 'quantity must be an integer >= 0'],
      ['negative lowStockThreshold', { lowStockThreshold: -1 }, 'lowStockThreshold must be an integer >= 0'],
      ['fractional lowStockThreshold', { lowStockThreshold: 0.5 }, 'lowStockThreshold must be an integer >= 0'],
      ['string lowStockThreshold', { lowStockThreshold: '5' }, 'lowStockThreshold must be an integer >= 0'],
    ])('rejects %s', (_label, override, message) => {
      expect(detailsOf(() => validateProduct({ ...valid, ...override }))).toEqual([message]);
    });
  });

  describe('partial mode (update)', () => {
    test('accepts an empty object and returns nothing to change', () => {
      expect(validateProduct({}, { partial: true })).toEqual({});
    });

    test('does not apply defaults', () => {
      expect(validateProduct({ price: 5 }, { partial: true })).toEqual({ price: 5 });
    });

    test('validates and normalises only the supplied fields', () => {
      expect(validateProduct({ sku: ' ab-1 ', name: ' New ' }, { partial: true })).toEqual({ sku: 'AB-1', name: 'New' });
    });

    test.each([
      ['name', { name: '' }, 'name is required'],
      ['sku', { sku: '' }, 'sku is required'],
      ['price', { price: -1 }, 'price must be a number >= 0'],
      ['category', { category: '' }, 'category must be a non-empty string'],
      ['quantity', { quantity: 1.1 }, 'quantity must be an integer >= 0'],
      ['lowStockThreshold', { lowStockThreshold: -2 }, 'lowStockThreshold must be an integer >= 0'],
    ])('still rejects an invalid %s', (_label, input, message) => {
      expect(detailsOf(() => validateProduct(input, { partial: true }))).toEqual([message]);
    });

    test('treats an explicit undefined field as absent', () => {
      expect(validateProduct({ name: undefined, price: 1 }, { partial: true })).toEqual({ price: 1 });
    });
  });
});
