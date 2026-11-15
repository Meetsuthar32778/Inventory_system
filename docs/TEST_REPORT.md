# Test Report - Sprint 1 & Sprint 2

**Scope:** Comprehensive verification for Sprint 1 (Core Item Management) and Sprint 2 (Search, Stock Adjustments, Low-Stock Alerts, Inventory Valuation & Testing).

| Metadata | Details |
|---|---|
| Date executed | 2026-11-15 |
| Branch | `feature/sprint-2-inventory` |
| Environment | Node v20.11.1, macOS; Storage: File (`data/products.json`) & In-Memory |
| Testing Tools | Jest 30 (unit, integration, UI via jsdom), Supertest 7, Postman/Newman |

---

## 1. How to run tests

```bash
# Run all Jest test suites
npm test

# Run all Jest test suites with full coverage report
npm run test:coverage

# Run API collection against in-memory backend
STORAGE=memory npm start
# In a second terminal:
npx newman run postman/inventory.postman_collection.json
```

---

## 2. Test cases and Acceptance Criteria

Evidence key:
- **S** = `tests/productService.test.js` (Business logic)
- **A** = `tests/products.api.test.js` (Integration / Supertest API)
- **M** = `tests/productModel.test.js` (Validation & Domain models)
- **R** = `tests/jsonFileRepository.test.js` & `tests/inMemoryRepository.test.js` (Persistence)
- **U** = `tests/ui.test.js` (Frontend jsdom)
- **P** = `postman/inventory.postman_collection.json` (Contract testing)

### Sprint 1 Test Cases (Preserved)

| TC | Story | Acceptance criterion | Evidence | Result |
|---|---|---|---|---|
| TC-01 | US-1 | Valid name, SKU and price -> 201 with an id, appears in the list | S, A, U, P | Pass |
| TC-02 | US-1 | Missing name/SKU or negative price/quantity -> 400 with the reasons | S, A, M, U, P | Pass |
| TC-03 | US-1 | SKU already exists (case-insensitive) -> 409 | S, A, U, P | Pass |
| TC-04 | US-1 | Defaults applied (category General, quantity 0, threshold 5); name/SKU normalised | S, A, M, U | Pass |
| TC-05 | US-1 | Malformed JSON / empty body -> 400 | A, P | Pass |
| TC-06 | US-2 | Products exist -> all listed with name, SKU, category, price, quantity | S, A, U, P | Pass |
| TC-07 | US-2 | No products -> empty-state message shown | S, A, U | Pass |
| TC-08 | US-2 | Get one product by id; unknown id -> 404; invalid id -> 400 | S, A, P | Pass |
| TC-09 | US-3 | Change any field -> only those fields change, `updatedAt` refreshed | S, A, U, P | Pass |
| TC-10 | US-3 | Invalid values -> 400 and product unchanged | S, A, M, U, P | Pass |
| TC-11 | US-3 | Unknown id -> 404 | S, A, U, P | Pass |
| TC-12 | US-3 | SKU used by another product -> 409 | S, A, P | Pass |
| TC-13 | US-4 | Delete existing product -> 204, no longer in the list | S, A, U, P | Pass |
| TC-14 | US-4 | Unknown id -> 404; invalid id -> 400 | S, A, U, P | Pass |
| TC-15 | US-4 | UI asks for confirmation; cancelling deletes nothing | U | Pass |
| TC-16 | All | Data persists across restarts (JSON file storage) | R | Pass |
| TC-17 | All | Unexpected errors -> 500 without internal details | A | Pass |

### Sprint 2 Test Cases (New)

| TC | Story | Acceptance criterion | Evidence | Result |
|---|---|---|---|---|
| TC-18 | US-5 | Search by product name (case-insensitive, partial matching) | S, A, U | Pass |
| TC-19 | US-5 | Search by product SKU (case-insensitive, partial matching) | S, A, U | Pass |
| TC-20 | US-5 | Filter products by category (case-insensitive) | S, A, U | Pass |
| TC-21 | US-5 | Combined search term and category filtering | S, A, U | Pass |
| TC-22 | US-5 | Display helpful empty/no-results state when search yields no matches | S, A, U | Pass |
| TC-23 | US-5 | Clear/reset filters restores full product list and default view | U | Pass |
| TC-24 | US-5 | Filtering returns cloned objects without mutating stored repository data | S, R | Pass |
| TC-25 | US-6 | Increase product stock quantity with positive integer; refresh `updatedAt` | S, A, U | Pass |
| TC-26 | US-6 | Reduce product stock quantity with positive integer | S, A, U | Pass |
| TC-27 | US-6 | Prevent negative inventory: reject stock decrease exceeding current stock (400) | S, A, U | Pass |
| TC-28 | US-6 | Reject invalid, zero, negative, and decimal adjustment quantities (400) | S, A, M, U | Pass |
| TC-29 | US-6 | Dedicated API endpoints: `POST /api/products/:id/adjust-stock` & `PATCH /api/products/:id/stock` | A, U | Pass |
| TC-30 | US-7 | Identify low-stock products (`quantity <= lowStockThreshold`) | S, A, U | Pass |
| TC-31 | US-7 | Low-stock boundary conditions (quantity === threshold vs quantity > threshold) | S, A, U | Pass |
| TC-32 | US-7 | Dedicated low-stock UI card with warning badges and healthy empty-state message | U | Pass |
| TC-33 | US-7 | Automatic refresh of low-stock alerts after stock increase/reduction | U | Pass |
| TC-34 | US-8 | View inventory report aggregates: total products, total units, low stock count, valuation | S, A, U | Pass |
| TC-35 | US-8 | Product-wise valuation calculation (`price * quantity`) with formatted values | S, A, U | Pass |
| TC-36 | US-8 | Graceful handling and rendering of empty inventory reports | S, A, U | Pass |
| TC-37 | US-8 | Export inventory report as CSV (`GET /api/products/report/csv`) without dependencies | S, A, U | Pass |
| TC-38 | US-8 | Dedicated report refresh action in UI and API | S, A, U | Pass |
| TC-39 | Fix | DEF-1: Derive nextId from max existing ID when gaps exist and nextId is missing | R | Pass |
| TC-40 | Fix | DEF-2: Reject JSON array body on product update with 400 Validation failed | M, A | Pass |

---

## 3. Test execution results

| Suite | File | Tests | Passed | Failed |
|---|---|---|---|---|
| Unit: Model | `tests/productModel.test.js` | 42 | 42 | 0 |
| Unit: Errors | `tests/errors.test.js` | 4 | 4 | 0 |
| Unit: In-Memory Repo | `tests/inMemoryRepository.test.js` | 15 | 15 | 0 |
| Unit: JSON File Repo | `tests/jsonFileRepository.test.js` | 13 | 13 | 0 |
| Unit: Product Service | `tests/productService.test.js` | 61 | 61 | 0 |
| Unit: Server Bootstrap | `tests/server.test.js` | 4 | 4 | 0 |
| Integration: API | `tests/products.api.test.js` | 100 | 100 | 0 |
| Integration / UI: jsdom | `tests/ui.test.js` | 38 | 38 | 0 |
| **Total Jest** | **8 test suites** | **277** | **277** | **0** |
| Postman / Newman | `postman/inventory.postman_collection.json` | 18 requests / 24 assertions | 24 | 0 |

### Code Coverage Report (`src/`)

```text
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |      100 |     100 |     100 |                   
 src               |     100 |      100 |     100 |     100 |                   
  app.js           |     100 |      100 |     100 |     100 |                   
  errors.js        |     100 |      100 |     100 |     100 |                   
  server.js        |     100 |      100 |     100 |     100 |                   
 src/models        |     100 |      100 |     100 |     100 |                   
  product.js       |     100 |      100 |     100 |     100 |                   
 src/repositories  |     100 |      100 |     100 |     100 |                   
  ...Repository.js |     100 |      100 |     100 |     100 |                   
  ...Repository.js |     100 |      100 |     100 |     100 |                   
 src/routes        |     100 |      100 |     100 |     100 |                   
  productRoutes.js |     100 |      100 |     100 |     100 |                   
 src/services      |     100 |      100 |     100 |     100 |                   
  ...uctService.js |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
```

---

## 4. Defect log & Resolution Status

| ID | Severity | Status | Description | Root Cause | Resolution | Regression Evidence |
|---|---|---|---|---|---|---|
| **DEF-1** | Medium | **Fixed** | Duplicate IDs generated when `data/products.json` lacks `nextId` and existing products contain ID gaps. | `_load()` used `products.length + 1` instead of finding maximum existing ID. | Updated `_load()` in `jsonFileProductRepository.js` to compute `maxId = Math.max(...ids)` and set `nextId = raw.nextId || maxId + 1`. | `tests/jsonFileRepository.test.js`: `DEF-1: avoids duplicate ids when nextId is missing and existing ids have gaps` |
| **DEF-2** | Low | **Fixed** | `PUT /api/products/:id` with body `[]` accepted as empty update (200). | `typeof [] === 'object'` evaluated to true; partial validation treated array as having no keys. | Added explicit `Array.isArray(data)` check in `validateProduct` (`product.js`) to reject arrays as non-object bodies. | `tests/productModel.test.js`: `rejects an array as the body`; `tests/products.api.test.js`: `DEF-2: a JSON array body returns 400` |

---

## 5. Acceptance Criteria Sign-Off

| Sprint 2 User Story | Status | Verification Reference |
|---|---|---|
| **US-5: Search and Filter Products** | Complete & Verified | TC-18 through TC-24; Unit, API, and UI test suites |
| **US-6: Increase or Reduce Stock** | Complete & Verified | TC-25 through TC-29; Unit, API, and UI test suites |
| **US-7: Identify Low-Stock Products** | Complete & Verified | TC-30 through TC-33; Unit, API, and UI test suites |
| **US-8: View Inventory Report** | Complete & Verified | TC-34 through TC-38; Unit, API, and UI test suites |
| **US-9: Test and Validate Features** | Complete & Verified | 277 automated tests; 100% code coverage across all source files |
