/**
 * Repository contract (used by ProductService):
 *   create(product) -> product with id
 *   findAll() -> product[]
 *   findById(id) -> product | null
 *   findBySku(sku) -> product | null
 *   update(id, product) -> product | null
 */
class InMemoryProductRepository {
  constructor() {
    this.products = [];
    this.nextId = 1;
  }

  create(product) {
    const saved = { ...product, id: this.nextId++ };
    this.products.push(saved);
    return { ...saved };
  }

  findAll() {
    return this.products.map((p) => ({ ...p }));
  }

  findById(id) {
    const p = this.products.find((x) => x.id === id);
    return p ? { ...p } : null;
  }

  findBySku(sku) {
    const p = this.products.find((x) => x.sku === sku);
    return p ? { ...p } : null;
  }

  update(id, product) {
    const i = this.products.findIndex((x) => x.id === id);
    if (i === -1) return null;
    this.products[i] = { ...product, id };
    return { ...this.products[i] };
  }
}

module.exports = InMemoryProductRepository;
