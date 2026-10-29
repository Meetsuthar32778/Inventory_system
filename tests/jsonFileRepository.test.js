const fs = require('fs');
const os = require('os');
const path = require('path');
const JsonFileProductRepository = require('../src/repositories/jsonFileProductRepository');
const InMemoryProductRepository = require('../src/repositories/inMemoryProductRepository');

const tempFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'inv-')), 'p.json');
const readFile = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

test('data persists across repository instances', () => {
  const file = tempFile();
  const a = new JsonFileProductRepository(file);
  a.create({ name: 'X', sku: 'X1', price: 1 });
  const b = new JsonFileProductRepository(file);
  expect(b.findAll()).toHaveLength(1);
  expect(b.create({ name: 'Y', sku: 'Y1', price: 2 }).id).toBe(2);
});

test('deleting a product persists across repository instances', () => {
  const file = tempFile();
  const a = new JsonFileProductRepository(file);
  const product = a.create({ name: 'X', sku: 'X1', price: 1 });
  expect(a.delete(product.id)).toMatchObject({ id: product.id });
  expect(new JsonFileProductRepository(file).findAll()).toEqual([]);
});

test('is a drop-in subtype of the in-memory repository (Liskov)', () => {
  expect(new JsonFileProductRepository(tempFile())).toBeInstanceOf(InMemoryProductRepository);
});

test('defaults to data/products.json in the project root', () => {
  const expected = path.join(__dirname, '..', 'data', 'products.json');
  expect(new JsonFileProductRepository().filePath).toBe(expected);
});

test('starts empty when the file does not exist and does not create it until a write', () => {
  const file = tempFile();
  const repo = new JsonFileProductRepository(file);
  expect(repo.findAll()).toEqual([]);
  expect(fs.existsSync(file)).toBe(false);
});

test('creates missing parent directories on first write', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'inv-')), 'nested', 'deep', 'p.json');
  new JsonFileProductRepository(file).create({ sku: 'A' });
  expect(fs.existsSync(file)).toBe(true);
});

test('writes nextId and products to the file', () => {
  const file = tempFile();
  new JsonFileProductRepository(file).create({ sku: 'A', price: 1 });
  expect(readFile(file)).toEqual({ nextId: 2, products: [{ sku: 'A', price: 1, id: 1 }] });
});

test('updating a product persists across repository instances', () => {
  const file = tempFile();
  const a = new JsonFileProductRepository(file);
  const p = a.create({ sku: 'A', price: 1 });
  a.update(p.id, { ...p, price: 9 });
  expect(new JsonFileProductRepository(file).findById(p.id)).toMatchObject({ price: 9 });
});

test('ids are not reused after deleting the last product and reloading', () => {
  const file = tempFile();
  const a = new JsonFileProductRepository(file);
  a.create({ sku: 'A' });
  const b = a.create({ sku: 'B' });
  a.delete(b.id);
  expect(new JsonFileProductRepository(file).create({ sku: 'C' }).id).toBe(3);
});

test('update and delete of an unknown id return null and do not write the file', () => {
  const file = tempFile();
  const repo = new JsonFileProductRepository(file);
  expect(repo.update(1, { sku: 'X' })).toBeNull();
  expect(repo.delete(1)).toBeNull();
  expect(fs.existsSync(file)).toBe(false);
});

test('recovers with an empty store when the file contains invalid JSON', () => {
  const file = tempFile();
  fs.writeFileSync(file, '{not json');
  const repo = new JsonFileProductRepository(file);
  expect(repo.findAll()).toEqual([]);
  expect(repo.create({ sku: 'A' }).id).toBe(1);
});

test('handles a file without a products key', () => {
  const file = tempFile();
  fs.writeFileSync(file, JSON.stringify({}));
  const repo = new JsonFileProductRepository(file);
  expect(repo.findAll()).toEqual([]);
  expect(repo.create({ sku: 'A' }).id).toBe(1);
});

test('derives nextId from the product count when nextId is missing', () => {
  const file = tempFile();
  fs.writeFileSync(file, JSON.stringify({ products: [{ id: 1, sku: 'A' }, { id: 2, sku: 'B' }] }));
  const repo = new JsonFileProductRepository(file);
  expect(repo.findAll()).toHaveLength(2);
  expect(repo.create({ sku: 'C' }).id).toBe(3);
});
