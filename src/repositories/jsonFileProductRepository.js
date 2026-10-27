const fs = require('fs');
const path = require('path');
const InMemoryProductRepository = require('./inMemoryProductRepository');

/** Same contract as the in-memory repo, but persists to a JSON file. */
class JsonFileProductRepository extends InMemoryProductRepository {
  constructor(filePath = path.join(__dirname, '..', '..', 'data', 'products.json')) {
    super();
    this.filePath = filePath;
    this._load();
  }

  _load() {
    if (!fs.existsSync(this.filePath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      this.products = raw.products || [];
      this.nextId = raw.nextId || this.products.length + 1;
    } catch (e) {
      this.products = [];
      this.nextId = 1;
    }
  }

  _save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify({ nextId: this.nextId, products: this.products }, null, 2));
  }

  create(product) {
    const saved = super.create(product);
    this._save();
    return saved;
  }

  update(id, product) {
    const saved = super.update(id, product);
    if (saved) this._save();
    return saved;
  }

  delete(id) {
    const removed = super.delete(id);
    if (removed) this._save();
    return removed;
  }
}

module.exports = JsonFileProductRepository;
