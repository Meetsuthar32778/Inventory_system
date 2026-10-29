const InMemoryProductRepository = require('../src/repositories/inMemoryProductRepository');

describe('InMemoryProductRepository (unit)', () => {
  let repo;
  beforeEach(() => { repo = new InMemoryProductRepository(); });

  test('starts empty', () => {
    expect(repo.findAll()).toEqual([]);
  });

  test('create assigns sequential ids starting at 1', () => {
    expect(repo.create({ sku: 'A' }).id).toBe(1);
    expect(repo.create({ sku: 'B' }).id).toBe(2);
  });

  test('create ignores an id passed in by the caller', () => {
    expect(repo.create({ sku: 'A', id: 50 }).id).toBe(1);
  });

  test('ids are never reused after a delete', () => {
    repo.create({ sku: 'A' });
    const b = repo.create({ sku: 'B' });
    repo.delete(b.id);
    expect(repo.create({ sku: 'C' }).id).toBe(3);
  });

  test('findAll returns products in insertion order', () => {
    repo.create({ sku: 'A' });
    repo.create({ sku: 'B' });
    expect(repo.findAll().map((p) => p.sku)).toEqual(['A', 'B']);
  });

  test('findById returns the product or null', () => {
    const a = repo.create({ sku: 'A' });
    expect(repo.findById(a.id)).toEqual(a);
    expect(repo.findById(99)).toBeNull();
  });

  test('findBySku matches the exact stored SKU or returns null', () => {
    repo.create({ sku: 'AB-1' });
    expect(repo.findBySku('AB-1')).toMatchObject({ id: 1 });
    expect(repo.findBySku('XX')).toBeNull();
  });

  test('update replaces the product but keeps its id', () => {
    const a = repo.create({ sku: 'A', price: 1 });
    expect(repo.update(a.id, { sku: 'A2', price: 2, id: 77 })).toEqual({ sku: 'A2', price: 2, id: a.id });
    expect(repo.findById(a.id)).toEqual({ sku: 'A2', price: 2, id: a.id });
  });

  test('update returns null for an unknown id', () => {
    expect(repo.update(5, { sku: 'X' })).toBeNull();
  });

  test('delete removes and returns the product', () => {
    const a = repo.create({ sku: 'A' });
    const b = repo.create({ sku: 'B' });
    expect(repo.delete(a.id)).toEqual(a);
    expect(repo.findAll()).toEqual([b]);
  });

  test('delete returns null for an unknown id', () => {
    repo.create({ sku: 'A' });
    expect(repo.delete(9)).toBeNull();
    expect(repo.findAll()).toHaveLength(1);
  });

  describe('returns copies so callers cannot mutate stored data', () => {
    test.each([
      ['create', (r) => r.create({ sku: 'A' })],
      ['findAll', (r) => { r.create({ sku: 'A' }); return r.findAll()[0]; }],
      ['findById', (r) => { r.create({ sku: 'A' }); return r.findById(1); }],
      ['findBySku', (r) => { r.create({ sku: 'A' }); return r.findBySku('A'); }],
      ['update', (r) => { r.create({ sku: 'A' }); return r.update(1, { sku: 'A' }); }],
    ])('%s', (_label, getProduct) => {
      const p = getProduct(repo);
      p.sku = 'MUTATED';
      expect(repo.findById(1).sku).toBe('A');
    });

    test('create does not keep a reference to the input object', () => {
      const input = { sku: 'A' };
      repo.create(input);
      input.sku = 'MUTATED';
      expect(repo.findById(1).sku).toBe('A');
      expect(input).not.toHaveProperty('id');
    });
  });
});
