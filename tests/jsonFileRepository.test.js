const fs = require('fs');
const os = require('os');
const path = require('path');
const JsonFileProductRepository = require('../src/repositories/jsonFileProductRepository');

test('data persists across repository instances', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'inv-')), 'p.json');
  const a = new JsonFileProductRepository(file);
  a.create({ name: 'X', sku: 'X1', price: 1 });
  const b = new JsonFileProductRepository(file);
  expect(b.findAll()).toHaveLength(1);
  expect(b.create({ name: 'Y', sku: 'Y1', price: 2 }).id).toBe(2);
});

test('deleting a product persists across repository instances', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'inv-')), 'p.json');
  const a = new JsonFileProductRepository(file);
  const product = a.create({ name: 'X', sku: 'X1', price: 1 });
  expect(a.delete(product.id)).toMatchObject({ id: product.id });
  expect(new JsonFileProductRepository(file).findAll()).toEqual([]);
});
