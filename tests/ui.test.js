/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

// Web UI tests: load public/index.html into jsdom, run its script and fake the API with a mocked fetch.
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const markup = html.match(/<body>([\s\S]*)<script>/)[1];
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

const $ = (id) => document.getElementById(id);
const flush = () => new Promise((r) => setTimeout(r, 0));

const stapler = { id: 1, name: 'Stapler', sku: 'ST-100', category: 'Office', price: 120, quantity: 8, lowStockThreshold: 5 };
const pen = { id: 2, name: 'Pen', sku: 'PEN-1', category: 'General', price: 9.5, quantity: 0, lowStockThreshold: 3 };

const reply = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => (data === undefined ? Promise.reject(new SyntaxError('no body')) : Promise.resolve(data)),
});

let db;
// Default fake backend; tests can override fetch for specific calls
const fakeFetch = jest.fn(async (url, options = {}) => {
  const method = options.method || 'GET';
  if (url === '/api/products' && method === 'GET') return reply(200, db);
  if (url === '/api/products' && method === 'POST') {
    const p = { id: db.length + 1, category: 'General', ...JSON.parse(options.body) };
    db.push(p);
    return reply(201, p);
  }
  const id = Number(url.split('/').pop());
  if (method === 'PUT') {
    db = db.map((p) => (p.id === id ? { ...p, ...JSON.parse(options.body) } : p));
    return reply(200, db.find((p) => p.id === id));
  }
  if (method === 'DELETE') {
    db = db.filter((p) => p.id !== id);
    return reply(204);
  }
  throw new Error(`unexpected ${method} ${url}`);
});

const calls = (method) => fakeFetch.mock.calls.filter(([, o = {}]) => (o.method || 'GET') === method);
const rows = () => [...$('rows').querySelectorAll('tr')].map((tr) => [...tr.children].slice(0, 7).map((td) => td.textContent));
const button = (rowIndex, label) => [...$('rows').children[rowIndex].querySelectorAll('button')].find((b) => b.textContent === label);

const fill = (values) => {
  for (const [id, value] of Object.entries(values)) $(id).value = value;
};
const submit = async () => {
  $('product-form').dispatchEvent(new Event('submit', { cancelable: true }));
  await flush();
};

const boot = async (products = []) => {
  db = products.map((p) => ({ ...p }));
  document.body.innerHTML = markup;
  new Function(script)(); // eslint-disable-line no-new-func
  await flush();
};

beforeEach(() => {
  fakeFetch.mockClear();
  window.fetch = fakeFetch;
  window.confirm = jest.fn(() => true);
  window.scrollTo = jest.fn();
});

describe('Web UI - US-2 view products', () => {
  test('loads products from the API on start', async () => {
    await boot();
    expect(fakeFetch).toHaveBeenCalledWith('/api/products', expect.objectContaining({
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  test('shows the empty-state message when there are no products', async () => {
    await boot();
    expect($('empty').hidden).toBe(false);
    expect($('empty').textContent).toMatch(/No products yet/);
    expect(rows()).toEqual([]);
  });

  test('lists every product with id, name, SKU, category, price, quantity and threshold', async () => {
    await boot([stapler, pen]);
    expect($('empty').hidden).toBe(true);
    expect(rows()).toEqual([
      ['1', 'Stapler', 'ST-100', 'Office', '120.00', '8', '5'],
      ['2', 'Pen', 'PEN-1', 'General', '9.50', '0', '3'],
    ]);
  });

  test('each row has Edit and Delete buttons', async () => {
    await boot([stapler]);
    expect(button(0, 'Edit')).toBeDefined();
    expect(button(0, 'Delete')).toBeDefined();
  });

  test('renders product text safely (no HTML injection)', async () => {
    await boot([{ ...stapler, name: '<img src=x onerror="alert(1)">' }]);
    expect($('rows').querySelector('img')).toBeNull();
    expect(rows()[0][1]).toBe('<img src=x onerror="alert(1)">');
  });

  test('shows an error message when the list cannot be loaded', async () => {
    fakeFetch.mockImplementationOnce(async () => reply(500, { error: 'Internal server error' }));
    await boot();
    expect($('msg').textContent).toBe('Internal server error');
    expect($('msg').className).toBe('error');
  });
});

describe('Web UI - US-1 add product', () => {
  test('starts in "Add product" mode with default quantity and threshold', async () => {
    await boot();
    expect($('form-title').textContent).toBe('Add product');
    expect($('submit-btn').textContent).toBe('Add product');
    expect($('cancel-btn').hidden).toBe(true);
    expect($('quantity').value).toBe('0');
    expect($('threshold').value).toBe('5');
  });

  test('posts the form as JSON with numeric fields, then shows the new product', async () => {
    await boot();
    fill({ name: 'Stapler', sku: 'st-100', category: 'Office', price: '120.5', quantity: '8', threshold: '2' });
    await submit();
    const [[url, options]] = calls('POST');
    expect(url).toBe('/api/products');
    expect(JSON.parse(options.body)).toEqual({
      name: 'Stapler', sku: 'st-100', category: 'Office', price: 120.5, quantity: 8, lowStockThreshold: 2,
    });
    expect($('msg').textContent).toBe('Product added');
    expect($('msg').className).toBe('ok');
    expect(rows()).toHaveLength(1);
    expect($('empty').hidden).toBe(true);
  });

  test('omits a blank category so the server default applies', async () => {
    await boot();
    fill({ name: 'Pen', sku: 'PEN-1', category: '   ', price: '10' });
    await submit();
    expect(JSON.parse(calls('POST')[0][1].body)).not.toHaveProperty('category');
  });

  test('falls back to quantity 0 and threshold 5 when those fields are cleared', async () => {
    await boot();
    fill({ name: 'Pen', sku: 'PEN-1', price: '10', quantity: '', threshold: '' });
    await submit();
    expect(JSON.parse(calls('POST')[0][1].body)).toMatchObject({ quantity: 0, lowStockThreshold: 5 });
  });

  test('clears the form after a successful add', async () => {
    await boot();
    fill({ name: 'Pen', sku: 'PEN-1', price: '10', quantity: '4', threshold: '1' });
    await submit();
    expect($('name').value).toBe('');
    expect($('sku').value).toBe('');
    expect($('price').value).toBe('');
    expect($('quantity').value).toBe('0');
    expect($('threshold').value).toBe('5');
  });

  test('shows the validation reasons from the API and keeps the input', async () => {
    await boot();
    fakeFetch.mockImplementationOnce(async () => reply(400, {
      error: 'Validation failed', details: ['name is required', 'price must be a number >= 0'],
    }));
    fill({ name: 'Pen', sku: 'PEN-1', price: '10' });
    await submit();
    expect($('msg').textContent).toBe('Validation failed: name is required: price must be a number >= 0');
    expect($('msg').className).toBe('error');
    expect($('name').value).toBe('Pen');
  });

  test('shows the conflict message for a duplicate SKU', async () => {
    await boot([stapler]);
    fakeFetch.mockImplementationOnce(async () => reply(409, { error: 'A product with SKU ST-100 already exists' }));
    fill({ name: 'Stapler', sku: 'st-100', price: '1' });
    await submit();
    expect($('msg').textContent).toBe('A product with SKU ST-100 already exists');
  });
});

describe('Web UI - US-3 update product', () => {
  test('Edit fills the form and switches to update mode', async () => {
    await boot([stapler]);
    button(0, 'Edit').click();
    expect($('name').value).toBe('Stapler');
    expect($('sku').value).toBe('ST-100');
    expect($('category').value).toBe('Office');
    expect($('price').value).toBe('120');
    expect($('quantity').value).toBe('8');
    expect($('threshold').value).toBe('5');
    expect($('form-title').textContent).toBe('Update product #1');
    expect($('submit-btn').textContent).toBe('Save changes');
    expect($('cancel-btn').hidden).toBe(false);
    expect(window.scrollTo).toHaveBeenCalled();
  });

  test('saving sends a PUT for that product and refreshes the list', async () => {
    await boot([stapler, pen]);
    button(1, 'Edit').click();
    fill({ price: '11', quantity: '6' });
    await submit();
    const [[url, options]] = calls('PUT');
    expect(url).toBe('/api/products/2');
    expect(JSON.parse(options.body)).toMatchObject({ name: 'Pen', sku: 'PEN-1', price: 11, quantity: 6 });
    expect(calls('POST')).toHaveLength(0);
    expect($('msg').textContent).toBe('Product updated');
    expect(rows()[1]).toEqual(['2', 'Pen', 'PEN-1', 'General', '11.00', '6', '3']);
  });

  test('returns to add mode after a successful update', async () => {
    await boot([stapler]);
    button(0, 'Edit').click();
    await submit();
    expect($('form-title').textContent).toBe('Add product');
    expect($('submit-btn').textContent).toBe('Add product');
    expect($('cancel-btn').hidden).toBe(true);
    expect($('name').value).toBe('');
  });

  test('stays in update mode and shows the error when the update fails', async () => {
    await boot([stapler]);
    button(0, 'Edit').click();
    fakeFetch.mockImplementationOnce(async () => reply(404, { error: 'Product not found' }));
    await submit();
    expect($('msg').textContent).toBe('Product not found');
    expect($('msg').className).toBe('error');
    expect($('form-title').textContent).toBe('Update product #1');
  });

  test('Cancel leaves update mode without saving and clears the message', async () => {
    await boot([stapler]);
    button(0, 'Edit').click();
    $('msg').textContent = 'something';
    $('cancel-btn').click();
    expect($('form-title').textContent).toBe('Add product');
    expect($('cancel-btn').hidden).toBe(true);
    expect($('name').value).toBe('');
    expect($('msg').textContent).toBe('');
    expect(calls('PUT')).toHaveLength(0);
  });

  test('after Cancel, submitting adds a new product instead of updating', async () => {
    await boot([stapler]);
    button(0, 'Edit').click();
    $('cancel-btn').click();
    fill({ name: 'Pen', sku: 'PEN-1', price: '10' });
    await submit();
    expect(calls('PUT')).toHaveLength(0);
    expect(calls('POST')).toHaveLength(1);
  });
});

describe('Web UI - US-4 delete product', () => {
  test('asks for confirmation, deletes and refreshes the list', async () => {
    await boot([stapler, pen]);
    button(0, 'Delete').click();
    await flush();
    expect(window.confirm).toHaveBeenCalledWith('Delete product #1?');
    expect(calls('DELETE')[0][0]).toBe('/api/products/1');
    expect($('msg').textContent).toBe('Product deleted');
    expect($('msg').className).toBe('ok');
    expect(rows().map((r) => r[0])).toEqual(['2']);
  });

  test('does nothing when the confirmation is cancelled', async () => {
    await boot([stapler]);
    window.confirm.mockReturnValueOnce(false);
    button(0, 'Delete').click();
    await flush();
    expect(calls('DELETE')).toHaveLength(0);
    expect(rows()).toHaveLength(1);
  });

  test('shows the empty state after deleting the last product', async () => {
    await boot([stapler]);
    button(0, 'Delete').click();
    await flush();
    expect($('empty').hidden).toBe(false);
  });

  test('deleting the product being edited resets the form', async () => {
    await boot([stapler]);
    button(0, 'Edit').click();
    button(0, 'Delete').click();
    await flush();
    expect($('form-title').textContent).toBe('Add product');
    expect($('name').value).toBe('');
  });

  test('deleting a different product keeps the current edit', async () => {
    await boot([stapler, pen]);
    button(0, 'Edit').click();
    button(1, 'Delete').click();
    await flush();
    expect($('form-title').textContent).toBe('Update product #1');
    expect($('name').value).toBe('Stapler');
  });

  test('shows the error when the delete fails', async () => {
    await boot([stapler]);
    fakeFetch.mockImplementationOnce(async () => reply(404, { error: 'Product not found' }));
    button(0, 'Delete').click();
    await flush();
    expect($('msg').textContent).toBe('Product not found');
    expect($('msg').className).toBe('error');
  });
});
