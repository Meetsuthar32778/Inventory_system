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
