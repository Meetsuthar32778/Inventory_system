const express = require('express');

/** Thin controller layer: HTTP in/out only, logic lives in the service. */
function productRoutes(productService) {
  const router = express.Router();

  const parseId = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: 'Validation failed', details: ['id must be a positive integer'] });
      return null;
    }
    return id;
  };

  router.post('/', (req, res, next) => {
    try {
      res.status(201).json(productService.addProduct(req.body));
    } catch (e) { next(e); }
  });

  router.get('/', (req, res, next) => {
    try {
      const { search, category, lowStock } = req.query;
      res.json(productService.listProducts({ search, category, lowStock }));
    } catch (e) { next(e); }
  });

  // US-7: identify low-stock products
  router.get('/low-stock', (req, res, next) => {
    try {
      res.json(productService.getLowStockProducts());
    } catch (e) { next(e); }
  });

  // US-8: view inventory report (JSON)
  router.get('/report', (req, res, next) => {
    try {
      res.json(productService.getInventoryReport());
    } catch (e) { next(e); }
  });

  // US-8: export inventory report as CSV
  router.get('/report/csv', (req, res, next) => {
    try {
      const csv = productService.generateInventoryCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
      res.send(csv);
    } catch (e) { next(e); }
  });

  // US-6: increase or reduce stock
  const handleStockAdjustment = (req, res, next) => {
    try {
      const id = parseId(req, res);
      if (id === null) return;
      res.json(productService.adjustStock(id, req.body));
    } catch (e) { next(e); }
  };
  router.post('/:id/adjust-stock', handleStockAdjustment);
  router.patch('/:id/stock', handleStockAdjustment);

  router.get('/:id', (req, res, next) => {
    try {
      const id = parseId(req, res);
      if (id === null) return;
      res.json(productService.getProduct(id));
    } catch (e) { next(e); }
  });

  router.put('/:id', (req, res, next) => {
    try {
      const id = parseId(req, res);
      if (id === null) return;
      res.json(productService.updateProduct(id, req.body));
    } catch (e) { next(e); }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      const id = parseId(req, res);
      if (id === null) return;
      productService.deleteProduct(id);
      res.status(204).send();
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = productRoutes;
