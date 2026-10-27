const ProductService = require('../src/services/productService');
const InMemoryProductRepository = require('../src/repositories/inMemoryProductRepository');
const { ValidationError, NotFoundError, ConflictError } = require('../src/errors');

const valid = { name: 'Notebook', sku: 'nb-001', price: 49.5, quantity: 20, category: 'Stationery' };

describe('ProductService (unit, TDD module 1)', () => {
  let service;
  beforeEach(() => { service = new ProductService(new InMemoryProductRepository()); });

  describe('US-1 addProduct', () => {
    test('adds a product and assigns an id and timestamps', () => {
      const p = service.addProduct(valid);
      expect(p.id).toBe(1);
      expect(p.name).toBe('Notebook');
      expect(p.createdAt).toBeDefined();
    });

    test('normalises SKU to upper case and trims name', () => {
      const p = service.addProduct({ ...valid, name: '  Notebook  ' });
      expect(p.sku).toBe('NB-001');
      expect(p.name).toBe('Notebook');
    });

    test('applies defaults for category, quantity and lowStockThreshold', () => {
      const p = service.addProduct({ name: 'Pen', sku: 'PEN-1', price: 10 });
      expect(p).toMatchObject({ category: 'General', quantity: 0, lowStockThreshold: 5 });
    });

    test.each([
      ['missing name', { ...valid, name: '' }],
      ['missing sku', { ...valid, sku: undefined }],
      ['negative price', { ...valid, price: -1 }],
      ['string price', { ...valid, price: '10' }],
      ['negative quantity', { ...valid, quantity: -5 }],
      ['fractional quantity', { ...valid, quantity: 1.5 }],
    ])('rejects %s', (_label, input) => {
      expect(() => service.addProduct(input)).toThrow(ValidationError);
    });

    test('rejects duplicate SKU (case-insensitive)', () => {
      service.addProduct(valid);
      expect(() => service.addProduct({ ...valid, sku: 'NB-001' })).toThrow(ConflictError);
    });
  });

  describe('US-2 listProducts / getProduct', () => {
    test('returns an empty list when there are no products', () => {
      expect(service.listProducts()).toEqual([]);
    });

    test('returns all added products', () => {
      service.addProduct(valid);
      service.addProduct({ ...valid, sku: 'NB-002' });
      expect(service.listProducts()).toHaveLength(2);
    });

    test('getProduct throws NotFoundError for unknown id', () => {
      expect(() => service.getProduct(99)).toThrow(NotFoundError);
    });
  });

  describe('US-3 updateProduct', () => {
    test('updates only the supplied fields', () => {
      const { id } = service.addProduct(valid);
      const updated = service.updateProduct(id, { price: 55 });
      expect(updated.price).toBe(55);
      expect(updated.name).toBe('Notebook');
    });

    test('changes updatedAt but keeps createdAt', async () => {
      const created = service.addProduct(valid);
      await new Promise((r) => setTimeout(r, 5));
      const updated = service.updateProduct(created.id, { name: 'Notebook A5' });
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });

    test('throws NotFoundError for unknown id', () => {
      expect(() => service.updateProduct(42, { price: 1 })).toThrow(NotFoundError);
    });

    test('rejects invalid values', () => {
      const { id } = service.addProduct(valid);
      expect(() => service.updateProduct(id, { price: -3 })).toThrow(ValidationError);
    });

    test('rejects changing SKU to one used by another product', () => {
      service.addProduct(valid);
      const b = service.addProduct({ ...valid, sku: 'NB-002' });
      expect(() => service.updateProduct(b.id, { sku: 'nb-001' })).toThrow(ConflictError);
    });

    test('allows re-sending the same SKU for the same product', () => {
      const { id } = service.addProduct(valid);
      expect(() => service.updateProduct(id, { sku: 'nb-001', price: 60 })).not.toThrow();
    });
  });

  describe('US-4 deleteProduct', () => {
    test('deletes and returns an existing product', () => {
      const created = service.addProduct(valid);
      expect(service.deleteProduct(created.id)).toMatchObject({ id: created.id, sku: 'NB-001' });
      expect(service.listProducts()).toEqual([]);
    });

    test('throws NotFoundError for unknown id', () => {
      expect(() => service.deleteProduct(42)).toThrow(NotFoundError);
    });
  });
});
