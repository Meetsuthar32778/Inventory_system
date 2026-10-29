const request = require('supertest');
const createApp = require('../src/app');
const InMemoryProductRepository = require('../src/repositories/inMemoryProductRepository');

const valid = { name: 'Stapler', sku: 'ST-100', price: 120, quantity: 8 };

describe('Products API (integration, TDD module 2)', () => {
  let app;
  beforeEach(() => { app = createApp(new InMemoryProductRepository()); });

  test('POST /api/products creates a product (201)', async () => {
    const res = await request(app).post('/api/products').send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, name: 'Stapler', sku: 'ST-100' });
  });

  test('POST /api/products with invalid body returns 400 and details', async () => {
    const res = await request(app).post('/api/products').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  test('POST /api/products with malformed JSON returns 400', async () => {
    const res = await request(app).post('/api/products').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });

  test('POST duplicate SKU returns 409', async () => {
    await request(app).post('/api/products').send(valid);
    const res = await request(app).post('/api/products').send(valid);
    expect(res.status).toBe(409);
  });

  test('GET /api/products lists products (200)', async () => {
    await request(app).post('/api/products').send(valid);
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('GET /api/products/:id returns one product, 404 if missing', async () => {
    await request(app).post('/api/products').send(valid);
    expect((await request(app).get('/api/products/1')).status).toBe(200);
    expect((await request(app).get('/api/products/99')).status).toBe(404);
  });

  test('GET /api/products/abc returns 400', async () => {
    expect((await request(app).get('/api/products/abc')).status).toBe(400);
  });

  test('PUT /api/products/:id updates product (200)', async () => {
    await request(app).post('/api/products').send(valid);
    const res = await request(app).put('/api/products/1').send({ price: 150, quantity: 3 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ price: 150, quantity: 3, name: 'Stapler' });
  });

  test('PUT on missing product returns 404', async () => {
    expect((await request(app).put('/api/products/77').send({ price: 1 })).status).toBe(404);
  });

  test('PUT with invalid data returns 400', async () => {
    await request(app).post('/api/products').send(valid);
    expect((await request(app).put('/api/products/1').send({ price: -9 })).status).toBe(400);
  });

  test('DELETE /api/products/:id deletes an existing product (204)', async () => {
    await request(app).post('/api/products').send(valid);
    const res = await request(app).delete('/api/products/1');
    expect(res.status).toBe(204);
    expect((await request(app).get('/api/products/1')).status).toBe(404);
    expect((await request(app).get('/api/products')).body).toHaveLength(0);
  });

  test('DELETE on missing product returns 404', async () => {
    expect((await request(app).delete('/api/products/77')).status).toBe(404);
  });

  test('DELETE with invalid id returns 400', async () => {
    expect((await request(app).delete('/api/products/abc')).status).toBe(400);
  });
});

describe('Products API - response contract and edge cases', () => {
  let app;
  const post = (body) => request(app).post('/api/products').send(body);
  beforeEach(() => { app = createApp(new InMemoryProductRepository()); });

  describe('US-1 POST /api/products', () => {
    test('returns the full product as JSON with defaults and timestamps', async () => {
      const res = await post({ name: 'Pen', sku: 'pen-1', price: 10 });
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({
        id: 1, name: 'Pen', sku: 'PEN-1', price: 10, category: 'General', quantity: 0, lowStockThreshold: 5,
        createdAt: expect.any(String), updatedAt: expect.any(String),
      });
    });

    test('created product appears in the list', async () => {
      const { body } = await post(valid);
      expect((await request(app).get('/api/products')).body).toEqual([body]);
    });

    test('400 response lists every reason', async () => {
      const res = await post({ name: '', price: -1, quantity: -2 });
      expect(res.body).toEqual({
        error: 'Validation failed',
        details: ['name is required', 'sku is required', 'price must be a number >= 0', 'quantity must be an integer >= 0'],
      });
    });

    test('malformed JSON returns a clean validation error body', async () => {
      const res = await request(app).post('/api/products').set('Content-Type', 'application/json').send('{bad');
      expect(res.body).toEqual({ error: 'Validation failed', details: ['Invalid JSON body'] });
    });

    test('a request with no body returns 400', async () => {
      const res = await request(app).post('/api/products');
      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(['Request body must be a JSON object']);
    });

    test('a JSON array body returns 400', async () => {
      expect((await post([valid])).status).toBe(400);
    });

    test('duplicate SKU in a different case returns 409 with a message', async () => {
      await post(valid);
      const res = await post({ ...valid, sku: 'st-100' });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'A product with SKU ST-100 already exists' });
    });

    test('rejected requests do not create products', async () => {
      await post({ name: '' });
      await post(valid);
      await post(valid);
      expect((await request(app).get('/api/products')).body).toHaveLength(1);
    });
  });

  describe('US-2 GET /api/products', () => {
    test('returns an empty array when there are no products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('lists products in the order they were added', async () => {
      await post(valid);
      await post({ ...valid, sku: 'ST-200' });
      const res = await request(app).get('/api/products');
      expect(res.body.map((p) => p.sku)).toEqual(['ST-100', 'ST-200']);
    });

    test('GET /api/products/:id returns the product body', async () => {
      const { body } = await post(valid);
      expect((await request(app).get('/api/products/1')).body).toEqual(body);
    });

    test('404 response has an error message', async () => {
      const res = await request(app).get('/api/products/99');
      expect(res.body).toEqual({ error: 'Product not found' });
    });

    test.each(['abc', '0', '-1', '1.5'])('id "%s" returns 400 with details', async (id) => {
      const res = await request(app).get(`/api/products/${id}`);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Validation failed', details: ['id must be a positive integer'] });
    });
  });

  describe('US-3 PUT /api/products/:id', () => {
    test('only changes the supplied fields and refreshes updatedAt', async () => {
      const { body: created } = await post(valid);
      await new Promise((r) => setTimeout(r, 5));
      const res = await request(app).put('/api/products/1').send({ category: 'Office' });
      expect(res.body).toEqual({ ...created, category: 'Office', updatedAt: expect.any(String) });
      expect(res.body.updatedAt).not.toBe(created.updatedAt);
    });

    test('the update is visible on a later GET', async () => {
      await post(valid);
      await request(app).put('/api/products/1').send({ name: 'Heavy Stapler' });
      expect((await request(app).get('/api/products/1')).body.name).toBe('Heavy Stapler');
    });

    test('SKU used by another product returns 409', async () => {
      await post(valid);
      await post({ ...valid, sku: 'ST-200' });
      const res = await request(app).put('/api/products/2').send({ sku: 'st-100' });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/ST-100/);
    });

    test('400 response lists the reasons and leaves the product unchanged', async () => {
      const { body: created } = await post(valid);
      const res = await request(app).put('/api/products/1').send({ name: '', quantity: 1.5 });
      expect(res.body).toEqual({ error: 'Validation failed', details: ['name is required', 'quantity must be an integer >= 0'] });
      expect((await request(app).get('/api/products/1')).body).toEqual(created);
    });

    test('invalid id returns 400', async () => {
      expect((await request(app).put('/api/products/abc').send({ price: 1 })).status).toBe(400);
    });

    test('malformed JSON returns 400', async () => {
      await post(valid);
      const res = await request(app).put('/api/products/1').set('Content-Type', 'application/json').send('{bad');
      expect(res.status).toBe(400);
    });

    test('404 response has an error message', async () => {
      expect((await request(app).put('/api/products/77').send({ price: 1 })).body).toEqual({ error: 'Product not found' });
    });
  });

  describe('US-4 DELETE /api/products/:id', () => {
    test('204 response has an empty body', async () => {
      await post(valid);
      const res = await request(app).delete('/api/products/1');
      expect(res.text).toBe('');
    });

    test('only the requested product is removed', async () => {
      await post(valid);
      await post({ ...valid, sku: 'ST-200' });
      await request(app).delete('/api/products/1');
      const list = (await request(app).get('/api/products')).body;
      expect(list.map((p) => p.id)).toEqual([2]);
    });

    test('deleting the same product twice returns 404 the second time', async () => {
      await post(valid);
      expect((await request(app).delete('/api/products/1')).status).toBe(204);
      expect((await request(app).delete('/api/products/1')).status).toBe(404);
    });

    test('updating a deleted product returns 404', async () => {
      await post(valid);
      await request(app).delete('/api/products/1');
      expect((await request(app).put('/api/products/1').send({ price: 1 })).status).toBe(404);
    });

    test('a deleted SKU can be added again', async () => {
      await post(valid);
      await request(app).delete('/api/products/1');
      const res = await post(valid);
      expect(res.status).toBe(201);
      expect(res.body.id).toBe(2);
    });

    test.each(['0', '-3'])('id "%s" returns 400', async (id) => {
      expect((await request(app).delete(`/api/products/${id}`)).status).toBe(400);
    });
  });

  describe('app wiring', () => {
    test('serves the web UI at /', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('Inventory Management System');
    });

    test('unknown routes return 404', async () => {
      expect((await request(app).get('/api/unknown')).status).toBe(404);
    });

    test('unexpected errors return 500 without leaking internals', async () => {
      const repo = new InMemoryProductRepository();
      repo.findAll = () => { throw new Error('disk on fire'); };
      const res = await request(createApp(repo)).get('/api/products');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
    });

    test('unexpected errors in POST, GET by id, PUT and DELETE also return 500', async () => {
      const boom = () => { throw new Error('boom'); };
      const repo = { findAll: boom, findById: boom, findBySku: boom, create: boom, update: boom, delete: boom };
      const broken = createApp(repo);
      expect((await request(broken).post('/api/products').send(valid)).status).toBe(500);
      expect((await request(broken).get('/api/products/1')).status).toBe(500);
      expect((await request(broken).put('/api/products/1').send({ price: 1 })).status).toBe(500);
      expect((await request(broken).delete('/api/products/1')).status).toBe(500);
    });

    test('errors with a custom status keep their message and details', async () => {
      const repo = new InMemoryProductRepository();
      repo.findAll = () => { const e = new Error('Teapot'); e.status = 418; e.details = ['short and stout']; throw e; };
      const res = await request(createApp(repo)).get('/api/products');
      expect(res.status).toBe(418);
      expect(res.body).toEqual({ error: 'Teapot', details: ['short and stout'] });
    });
  });
});
