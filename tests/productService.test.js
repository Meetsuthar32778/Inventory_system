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

    test.each([
      ['name over 100 characters', { ...valid, name: 'a'.repeat(101) }],
      ['empty category', { ...valid, category: '  ' }],
      ['negative lowStockThreshold', { ...valid, lowStockThreshold: -1 }],
      ['null body', null],
    ])('rejects %s', (_label, input) => {
      expect(() => service.addProduct(input)).toThrow(ValidationError);
    });

    test('rejects duplicate SKU (case-insensitive)', () => {
      service.addProduct(valid);
      expect(() => service.addProduct({ ...valid, sku: 'NB-001' })).toThrow(ConflictError);
    });

    test('rejects duplicate SKU that differs only by surrounding spaces', () => {
      service.addProduct(valid);
      expect(() => service.addProduct({ ...valid, sku: '  nb-001  ' })).toThrow('A product with SKU NB-001 already exists');
    });

    test('does not store anything when validation or the SKU check fails', () => {
      service.addProduct(valid);
      expect(() => service.addProduct({ ...valid, price: -1, sku: 'NEW' })).toThrow();
      expect(() => service.addProduct(valid)).toThrow();
      expect(service.listProducts()).toHaveLength(1);
    });

    test('sets createdAt and updatedAt to the same ISO timestamp', () => {
      const p = service.addProduct(valid);
      expect(new Date(p.createdAt).toISOString()).toBe(p.createdAt);
      expect(p.updatedAt).toBe(p.createdAt);
    });

    test('ignores a client-supplied id and timestamps', () => {
      const p = service.addProduct({ ...valid, id: 500, createdAt: '2000-01-01T00:00:00.000Z' });
      expect(p.id).toBe(1);
      expect(p.createdAt).not.toBe('2000-01-01T00:00:00.000Z');
    });

    test('the added product can be fetched back by id', () => {
      const p = service.addProduct(valid);
      expect(service.getProduct(p.id)).toEqual(p);
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

    test('lists every field shown in the UI', () => {
      service.addProduct(valid);
      expect(service.listProducts()[0]).toEqual(expect.objectContaining({
        id: 1, name: 'Notebook', sku: 'NB-001', category: 'Stationery', price: 49.5, quantity: 20, lowStockThreshold: 5,
      }));
    });

    test('getProduct returns the matching product', () => {
      service.addProduct(valid);
      const b = service.addProduct({ ...valid, sku: 'NB-002' });
      expect(service.getProduct(b.id)).toMatchObject({ id: b.id, sku: 'NB-002' });
    });

    test('getProduct throws NotFoundError for unknown id', () => {
      expect(() => service.getProduct(99)).toThrow(NotFoundError);
    });
  });

  describe('US-5 search and filter products', () => {
    beforeEach(() => {
      service.addProduct({ name: 'Gel Pen', sku: 'PEN-01', price: 15, category: 'Stationery', quantity: 10 });
      service.addProduct({ name: 'Ballpoint Pen', sku: 'PEN-02', price: 10, category: 'Stationery', quantity: 2 });
      service.addProduct({ name: 'Office Desk', sku: 'DSK-99', price: 4500, category: 'Furniture', quantity: 5 });
    });

    test('searches products by name (case-insensitive, partial match)', () => {
      const results = service.listProducts({ search: 'gel' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Gel Pen');
    });

    test('searches products by SKU (case-insensitive, partial match)', () => {
      const results = service.listProducts({ search: 'pen-02' });
      expect(results).toHaveLength(1);
      expect(results[0].sku).toBe('PEN-02');
    });

    test('searches across both name and SKU', () => {
      const results = service.listProducts({ search: 'pen' });
      expect(results).toHaveLength(2);
      expect(results.map((p) => p.sku)).toEqual(['PEN-01', 'PEN-02']);
    });

    test('filters products by category (case-insensitive)', () => {
      const results = service.listProducts({ category: 'furniture' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Office Desk');
    });

    test('category "All" (case-insensitive) does not filter categories', () => {
      const results = service.listProducts({ category: 'All' });
      expect(results).toHaveLength(3);
    });

    test('combines search term and category filter', () => {
      const match = service.listProducts({ search: 'pen', category: 'Stationery' });
      expect(match).toHaveLength(2);
      const noMatch = service.listProducts({ search: 'pen', category: 'Furniture' });
      expect(noMatch).toEqual([]);
    });

    test('returns an empty array when no products match', () => {
      expect(service.listProducts({ search: 'Laptop' })).toEqual([]);
      expect(service.listProducts({ category: 'Electronics' })).toEqual([]);
    });

    test('ignores empty or whitespace-only search and category', () => {
      expect(service.listProducts({ search: '   ', category: '   ' })).toHaveLength(3);
    });

    test('filtering does not modify stored product data', () => {
      const results = service.listProducts({ search: 'Gel' });
      results[0].name = 'Modified In Test';
      expect(service.getProduct(results[0].id).name).toBe('Gel Pen');
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

    test('allows changing to a new, unused SKU and normalises it', () => {
      const { id } = service.addProduct(valid);
      expect(service.updateProduct(id, { sku: ' nb-999 ' }).sku).toBe('NB-999');
      expect(() => service.addProduct({ ...valid, sku: 'NB-001' })).not.toThrow();
    });

    test('updates every editable field at once', () => {
      const { id } = service.addProduct(valid);
      const changes = { name: 'Pad', sku: 'PAD-1', price: 5, category: 'Paper', quantity: 1, lowStockThreshold: 0 };
      expect(service.updateProduct(id, changes)).toMatchObject(changes);
    });

    test('persists the change in the repository', () => {
      const { id } = service.addProduct(valid);
      service.updateProduct(id, { quantity: 7 });
      expect(service.getProduct(id).quantity).toBe(7);
    });

    test('cannot change id or createdAt', () => {
      const created = service.addProduct(valid);
      const updated = service.updateProduct(created.id, { id: 99, createdAt: 'x', price: 1 });
      expect(updated.id).toBe(created.id);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(() => service.getProduct(99)).toThrow(NotFoundError);
    });

    test('an empty update keeps all fields', () => {
      const created = service.addProduct(valid);
      const { updatedAt, ...rest } = created; // eslint-disable-line no-unused-vars
      expect(service.updateProduct(created.id, {})).toMatchObject(rest);
    });

    test('does not change the product when validation fails', () => {
      const created = service.addProduct(valid);
      expect(() => service.updateProduct(created.id, { name: 'OK', price: -1 })).toThrow(ValidationError);
      expect(service.getProduct(created.id)).toEqual(created);
    });

    test('does not change the product when the SKU conflicts', () => {
      service.addProduct(valid);
      const b = service.addProduct({ ...valid, sku: 'NB-002' });
      expect(() => service.updateProduct(b.id, { sku: 'NB-001', price: 1 })).toThrow(ConflictError);
      expect(service.getProduct(b.id)).toEqual(b);
    });

    test('does not affect other products', () => {
      const a = service.addProduct(valid);
      const b = service.addProduct({ ...valid, sku: 'NB-002' });
      service.updateProduct(b.id, { price: 1 });
      expect(service.getProduct(a.id)).toEqual(a);
    });

    test('checks existence before validating (unknown id with bad data -> NotFoundError)', () => {
      expect(() => service.updateProduct(42, { price: -1 })).toThrow(NotFoundError);
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

    test('only removes the requested product', () => {
      const a = service.addProduct(valid);
      const b = service.addProduct({ ...valid, sku: 'NB-002' });
      service.deleteProduct(a.id);
      expect(service.listProducts()).toEqual([b]);
    });

    test('deleting twice throws NotFoundError the second time', () => {
      const { id } = service.addProduct(valid);
      service.deleteProduct(id);
      expect(() => service.deleteProduct(id)).toThrow(NotFoundError);
      expect(() => service.getProduct(id)).toThrow(NotFoundError);
    });

    test('frees the SKU so it can be added again with a new id', () => {
      const { id } = service.addProduct(valid);
      service.deleteProduct(id);
      expect(service.addProduct(valid).id).toBe(id + 1);
    });
  });

  describe('US-6 adjustStock', () => {
    test('increases stock and refreshes updatedAt', async () => {
      const created = service.addProduct({ ...valid, quantity: 10 });
      await new Promise((r) => setTimeout(r, 5));
      const adjusted = service.adjustStock(created.id, { action: 'increase', amount: 5 });
      expect(adjusted.quantity).toBe(15);
      expect(adjusted.updatedAt).not.toBe(created.updatedAt);
      expect(adjusted.createdAt).toBe(created.createdAt);
    });

    test('reduces stock when sufficient stock exists', () => {
      const created = service.addProduct({ ...valid, quantity: 10 });
      const adjusted = service.adjustStock(created.id, { action: 'decrease', amount: 4 });
      expect(adjusted.quantity).toBe(6);
    });

    test('allows reducing stock exactly to zero', () => {
      const created = service.addProduct({ ...valid, quantity: 5 });
      const adjusted = service.adjustStock(created.id, { action: 'decrease', amount: 5 });
      expect(adjusted.quantity).toBe(0);
    });

    test('prevents negative inventory when decrease exceeds current quantity', () => {
      const created = service.addProduct({ ...valid, quantity: 3 });
      expect(() => service.adjustStock(created.id, { action: 'decrease', amount: 4 })).toThrow(ValidationError);
      try {
        service.adjustStock(created.id, { action: 'decrease', amount: 4 });
      } catch (e) {
        expect(e.details[0]).toMatch(/Stock cannot be negative/);
      }
      expect(service.getProduct(created.id).quantity).toBe(3);
    });

    test('throws NotFoundError for unknown product id', () => {
      expect(() => service.adjustStock(999, { action: 'increase', amount: 5 })).toThrow(NotFoundError);
    });

    test('throws ValidationError for invalid adjustment data', () => {
      const created = service.addProduct(valid);
      expect(() => service.adjustStock(created.id, { action: 'multiply', amount: 5 })).toThrow(ValidationError);
      expect(() => service.adjustStock(created.id, { action: 'increase', amount: -2 })).toThrow(ValidationError);
      expect(() => service.adjustStock(created.id, { action: 'increase', amount: 0 })).toThrow(ValidationError);
      expect(() => service.adjustStock(created.id, { action: 'increase', amount: 1.5 })).toThrow(ValidationError);
    });
  });

  describe('US-7 identify low-stock products', () => {
    test('returns products whose quantity is less than or equal to their threshold', () => {
      service.addProduct({ name: 'Critical Item', sku: 'CRIT-1', price: 10, quantity: 2, lowStockThreshold: 5 });
      service.addProduct({ name: 'Boundary Item', sku: 'BND-1', price: 20, quantity: 5, lowStockThreshold: 5 });
      service.addProduct({ name: 'Healthy Item', sku: 'HLTH-1', price: 30, quantity: 10, lowStockThreshold: 5 });

      const lowStock = service.getLowStockProducts();
      expect(lowStock).toHaveLength(2);
      expect(lowStock.map((p) => p.sku)).toEqual(['CRIT-1', 'BND-1']);
    });

    test('returns an empty array when all products have sufficient stock', () => {
      service.addProduct({ name: 'Plenty', sku: 'PLN-1', price: 10, quantity: 20, lowStockThreshold: 5 });
      expect(service.getLowStockProducts()).toEqual([]);
    });

    test('listProducts supports lowStock boolean and string filters', () => {
      service.addProduct({ name: 'Item Low', sku: 'LOW-1', price: 5, quantity: 1, lowStockThreshold: 3 });
      service.addProduct({ name: 'Item OK', sku: 'OK-1', price: 5, quantity: 10, lowStockThreshold: 3 });

      expect(service.listProducts({ lowStock: true })).toHaveLength(1);
      expect(service.listProducts({ lowStock: 'true' })).toHaveLength(1);
      expect(service.listProducts({ lowStock: false })).toHaveLength(2);
    });
  });

  describe('US-8 inventory report and CSV export', () => {
    test('calculates accurate aggregates and product-wise valuation', () => {
      service.addProduct({ name: 'Item A', sku: 'A-1', category: 'Cat 1', price: 100, quantity: 5, lowStockThreshold: 2 });
      service.addProduct({ name: 'Item B', sku: 'B-1', category: 'Cat 2', price: 50.5, quantity: 2, lowStockThreshold: 5 });

      const report = service.getInventoryReport();
      expect(report.totalProducts).toBe(2);
      expect(report.totalUnits).toBe(7);
      expect(report.lowStockCount).toBe(1);
      expect(report.totalValuation).toBe(601.0); // 100*5 + 50.5*2 = 500 + 101 = 601
      expect(report.items).toHaveLength(2);
      expect(report.items[0]).toMatchObject({ sku: 'A-1', stockValue: 500, isLowStock: false });
      expect(report.items[1]).toMatchObject({ sku: 'B-1', stockValue: 101, isLowStock: true });
    });

    test('handles an empty inventory gracefully', () => {
      const report = service.getInventoryReport();
      expect(report).toEqual({
        totalProducts: 0,
        totalUnits: 0,
        lowStockCount: 0,
        totalValuation: 0,
        items: [],
      });
    });

    test('generates CSV string with proper escaping of quotes and commas', () => {
      service.addProduct({ name: 'Item, with "quotes"', sku: 'SP-1', category: 'Special, Cat', price: 10, quantity: 2, lowStockThreshold: 5 });
      service.addProduct({ name: 'Standard Item', sku: 'STD-1', category: 'General', price: 20, quantity: 15, lowStockThreshold: 5 });
      const csv = service.generateInventoryCsv();
      expect(csv).toContain('ID,Name,SKU,Category,Price,Quantity,LowStockThreshold,StockValue,LowStockStatus');
      expect(csv).toContain('"Item, with ""quotes"""');
      expect(csv).toContain('"Special, Cat"');
      expect(csv).toContain('LOW_STOCK');
      expect(csv).toContain('OK');
    });
  });

  describe('dependency inversion', () => {
    test('works with any repository that implements the contract', () => {
      const repo = {
        findBySku: jest.fn(() => null),
        create: jest.fn((p) => ({ ...p, id: 'abc' })),
      };
      const p = new ProductService(repo).addProduct(valid);
      expect(p.id).toBe('abc');
      expect(repo.findBySku).toHaveBeenCalledWith('NB-001');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ sku: 'NB-001', createdAt: expect.any(String) }));
    });
  });
});
