# Inventory Management System (Mini)

CSE706 End-Semester Evaluation - Agile development using Scrum. Jira space: **Agile (AG)**.

## Run locally
```bash
npm install
npm start            # http://localhost:3000 (data saved in data/products.json)
npm test             # Jest unit + integration tests (277 tests)
npm run test:coverage # Full coverage report (100% statements, branches, functions, lines)
```
Use `STORAGE=memory npm start` for a throwaway in-memory run.

---

## Sprint 1 Scope (Core Item Management)

| Story | Feature | Endpoint |
|---|---|---|
| US-1 | Add a product | `POST /api/products` |
| US-2 | View all products | `GET /api/products`, `GET /api/products/:id` |
| US-3 | Update product details | `PUT /api/products/:id` |
| US-4 | Delete a product | `DELETE /api/products/:id` |

### Acceptance Criteria - Sprint 1
- **US-1 Add product:** Given valid name, SKU, and price, product is created (201) with auto-assigned ID and normalized SKU. Rejects missing fields (400) or duplicate SKUs (409).
- **US-2 View products:** Returns all products with ID, name, SKU, category, price, quantity, lowStockThreshold. Empty state message shown when empty.
- **US-3 Update product:** Partial updates allowed; refreshes `updatedAt` timestamp. Validates inputs (400) and SKU uniqueness (409).
- **US-4 Delete product:** Removes product (204). Returns 404 on non-existent or repeated deletes.

---

## Sprint 2 Scope (Advanced Inventory Operations)

| Story | Feature | Endpoint |
|---|---|---|
| US-5 | Search and Filter Products | `GET /api/products?search=:term&category=:cat` |
| US-6 | Increase or Reduce Stock | `POST /api/products/:id/adjust-stock`, `PATCH /api/products/:id/stock` |
| US-7 | Identify Low-Stock Products | `GET /api/products/low-stock`, `GET /api/products?lowStock=true` |
| US-8 | View Inventory Report & CSV | `GET /api/products/report`, `GET /api/products/report/csv` |
| US-9 | Automated Test Suite | `npm test`, `npm run test:coverage` (277 tests, 100% coverage) |

### Acceptance Criteria - Sprint 2
- **US-5 Search & Filter Products:**
  - Case-insensitive search matching name or SKU substrings.
  - Category filtering matching exact/trimmed category names.
  - Friendly empty state when no products match filters.
  - Reset action restoring the full product listing.
  - Filtering operations do not mutate stored repository entities.
- **US-6 Increase or Reduce Stock:**
  - Dedicated endpoint accepting `{ action: 'increase' | 'decrease', amount: positive_integer }`.
  - Rejects zero, negative, decimal, or invalid amounts with 400.
  - Enforces non-negative stock constraint: prevents reductions exceeding available stock.
  - Updates product's `updatedAt` timestamp upon successful adjustment.
- **US-7 Identify Low-Stock Products:**
  - Low-stock condition: `quantity <= lowStockThreshold`.
  - Dedicated low-stock dashboard section with warning indicators.
  - Automatic UI refresh after stock adjustments.
  - Clean empty-state message when all inventory levels are healthy.
- **US-8 View Inventory Report:**
  - Aggregates: Total products, total units in stock, low-stock count, and total inventory valuation ($\sum price \times quantity$).
  - Product-wise valuation breakdown ($price \times quantity$).
  - Dependency-free CSV export (`GET /api/products/report/csv`) with quote and comma escaping.
  - UI report refresh action.
- **US-9 Test and Validate:**
  - Full automated coverage for search, stock adjustments, low-stock boundary conditions, inventory valuations, and edge cases.
  - Regression tests for DEF-1 (duplicate IDs on gap) and DEF-2 (array body on update).

---

## Architecture (SOLID Principles)

- **Single Responsibility Principle (SRP):**
  - `src/routes/productRoutes.js`: HTTP request routing, parameter parsing, and response serialization.
  - `src/services/productService.js`: Pure business domain logic (stock adjustment arithmetic, SKU uniqueness, search/filter algorithms, valuation calculations).
  - `src/repositories/`: Storage abstraction and persistence (`inMemoryProductRepository.js`, `jsonFileProductRepository.js`).
  - `src/models/product.js`: Input validation, type coercion, and defaults normalization (`validateProduct`, `validateStockAdjustment`).
- **Open/Closed & Liskov Substitution (OCP/LSP):**
  - `JsonFileProductRepository` extends `InMemoryProductRepository` without breaking the repository interface contract. The service operates seamlessly regardless of the storage implementation.
- **Dependency Inversion Principle (DIP):**
  - `ProductService` accepts its repository via constructor dependency injection, decoupling business rules from underlying persistence mechanisms.

---

## Testing & Quality Assurance

- `tests/productService.test.js`: Service business rules for US-1 through US-8.
- `tests/products.api.test.js`: Supertest integration tests for all REST endpoints, status codes, query strings, and error handling.
- `tests/productModel.test.js`: Validation edge cases, normalization, defaults, and stock adjustment contracts.
- `tests/inMemoryRepository.test.js`: In-memory persistence, cloning, and ID generation.
- `tests/jsonFileRepository.test.js`: File-based storage, atomic writes, recovery from corrupt JSON, and DEF-1 gap handling.
- `tests/errors.test.js`: Domain error classes (`ValidationError`, `NotFoundError`, `ConflictError`).
- `tests/server.test.js`: Environment configuration (`PORT`, `STORAGE`).
- `tests/ui.test.js`: jsdom frontend verification for CRUD, Search/Filter, Stock Adjustment, Low-Stock Alerts, and Valuation Reports.
- `npm run test:coverage`: Jest coverage report (**100% across statements, branches, functions, and lines**).
- `docs/TEST_REPORT.md`: Comprehensive traceability matrix mapping acceptance criteria to test execution evidence.

---

## Suggested Git Workflow

```bash
# Branch for Sprint 2 implementation
git checkout -b feature/sprint-2-inventory

# Meaningful commits per feature increment
git commit -m "feat: implement product search and filtering (US-5)"
git commit -m "feat: implement stock adjustment (US-6)"
git commit -m "feat: add low-stock identification (US-7)"
git commit -m "feat: add inventory report and CSV export (US-8)"
git commit -m "test: add Sprint 2 automated tests and UI verification (US-9)"
git commit -m "docs: update Sprint 2 documentation and test report"
```
