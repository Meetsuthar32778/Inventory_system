const { validateProduct } = require('../models/product');
const { NotFoundError, ConflictError } = require('../errors');

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

  // US-2: view all products
  listProducts() {
    return this.repository.findAll();
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
}

module.exports = ProductService;
