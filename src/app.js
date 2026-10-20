const path = require('path');
const express = require('express');
const ProductService = require('./services/productService');
const productRoutes = require('./routes/productRoutes');

function createApp(repository) {
  const app = express();
  const productService = new ProductService(repository);

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/api/products', productRoutes(productService));

  // Malformed JSON and other errors -> clean JSON responses
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Validation failed', details: ['Invalid JSON body'] });
    }
    const status = err.status || 500;
    const body = { error: status === 500 ? 'Internal server error' : err.message };
    if (err.details) body.details = err.details;
    res.status(status).json(body);
  });

  return app;
}

module.exports = createApp;
