const { validateProduct, validateStockAdjustment } = require('../models/product');
const { ValidationError, NotFoundError, ConflictError } = require('../errors');

/**
 * Business logic for products. Depends on a repository abstraction
 * (injected), not on a concrete database -> Dependency Inversion.
 */
class ProductService {
  constructor(repository) {
    this.repository = repository;
  }

  // US-1: add a new product
  addProduct(data) {
    const clean = validateProduct(data);
    if (this.repository.findBySku(clean.sku)) {
      throw new ConflictError(`A product with SKU ${clean.sku} already exists`);
    }
    const now = new Date().toISOString();
    return this.repository.create({ ...clean, createdAt: now, updatedAt: now });
  }

  // US-2 & US-5: view all products, optionally filtered by search, category, or lowStock
  listProducts(query = {}) {
    let products = this.repository.findAll();
    const { search, category, lowStock } = query;

    if (typeof search === 'string' && search.trim()) {
      const term = search.trim().toLowerCase();
      products = products.filter((p) =>
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term))
      );
    }

    if (typeof category === 'string' && category.trim() && category.trim().toLowerCase() !== 'all') {
      const targetCategory = category.trim().toLowerCase();
      products = products.filter((p) => p.category && p.category.toLowerCase() === targetCategory);
    }

    if (lowStock === true || lowStock === 'true') {
      products = products.filter((p) => p.quantity <= p.lowStockThreshold);
    }

    return products.map((p) => ({ ...p }));
  }

  getProduct(id) {
    const product = this.repository.findById(id);
    if (!product) throw new NotFoundError();
    return product;
  }

  // US-3: update product details
  updateProduct(id, data) {
    const existing = this.getProduct(id);
    const clean = validateProduct(data, { partial: true });
    if (clean.sku && clean.sku !== existing.sku) {
      const other = this.repository.findBySku(clean.sku);
      if (other) throw new ConflictError(`A product with SKU ${clean.sku} already exists`);
    }
    return this.repository.update(id, { ...existing, ...clean, updatedAt: new Date().toISOString() });
  }

  // US-4: delete a product
  deleteProduct(id) {
    const existing = this.getProduct(id);
    this.repository.delete(id);
    return existing;
  }

  // US-6: increase or reduce stock
  adjustStock(id, data) {
    const existing = this.getProduct(id);
    const { action, amount } = validateStockAdjustment(data);

    let newQuantity;
    if (action === 'increase') {
      newQuantity = existing.quantity + amount;
    } else {
      if (existing.quantity < amount) {
        throw new ValidationError([`Stock cannot be negative (current: ${existing.quantity}, decrease: ${amount})`]);
      }
      newQuantity = existing.quantity - amount;
    }

    const now = new Date().toISOString();
    return this.repository.update(id, {
      ...existing,
      quantity: newQuantity,
      updatedAt: now,
    });
  }

  // US-7: identify low-stock products (quantity <= lowStockThreshold)
  getLowStockProducts() {
    return this.repository
      .findAll()
      .filter((p) => p.quantity <= p.lowStockThreshold)
      .map((p) => ({ ...p }));
  }

  // US-8: view inventory report with aggregates and product-wise valuation
  getInventoryReport() {
    const products = this.repository.findAll();
    const totalProducts = products.length;
    let totalUnits = 0;
    let lowStockCount = 0;
    let totalValuation = 0;

    const items = products.map((p) => {
      const quantity = p.quantity;
      const price = p.price;
      const stockValue = Number((price * quantity).toFixed(2));
      const isLowStock = quantity <= p.lowStockThreshold;

      totalUnits += quantity;
      if (isLowStock) lowStockCount += 1;
      totalValuation += stockValue;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        price,
        quantity,
        lowStockThreshold: p.lowStockThreshold,
        stockValue,
        isLowStock,
      };
    });

    return {
      totalProducts,
      totalUnits,
      lowStockCount,
      totalValuation: Number(totalValuation.toFixed(2)),
      items,
    };
  }

  // US-8: generate CSV string of the inventory report without external dependencies
  generateInventoryCsv() {
    const report = this.getInventoryReport();
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Price', 'Quantity', 'LowStockThreshold', 'StockValue', 'LowStockStatus'];
    const escapeCsv = (val) => {
      const str = String(val);
      if (str.includes(',') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = report.items.map((item) => [
      item.id,
      escapeCsv(item.name),
      escapeCsv(item.sku),
      escapeCsv(item.category),
      item.price.toFixed(2),
      item.quantity,
      item.lowStockThreshold,
      item.stockValue.toFixed(2),
      item.isLowStock ? 'LOW_STOCK' : 'OK',
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}

module.exports = ProductService;
