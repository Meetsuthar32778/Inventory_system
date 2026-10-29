# Inventory Management System (Mini)

CSE706 End-Semester Evaluation - Agile development using Scrum. Jira space: **Agile (AG)**.

## Run locally
```bash
npm install
npm start            # http://localhost:3000  (data saved in data/products.json)
npm test             # Jest unit + integration tests
```
Use `STORAGE=memory npm start` for a throwaway in-memory run.

## Sprint 1 scope
| Story | Feature | Endpoint |
|---|---|---|
| US-1 | Add a product | `POST /api/products` |
| US-2 | View all products | `GET /api/products`, `GET /api/products/:id` |
| US-3 | Update product details | `PUT /api/products/:id` |
| US-4 | Delete a product | `DELETE /api/products/:id` |

### Acceptance criteria
**US-1 Add product**
- Given valid name, SKU and price, when I submit, then the product is created (201) with an id and appears in the list.
- Given a missing name/SKU or a negative price/quantity, then I get 400 with the reasons.
- Given a SKU that already exists (case-insensitive), then I get 409.

**US-2 View products**
- Given products exist, when I open the app, then all are listed with name, SKU, category, price, quantity.
- Given none exist, then an empty-state message is shown.

**US-3 Update product**
- Given an existing product, when I change any field, then only those fields change and `updatedAt` is refreshed.
- Given invalid values, then 400; unknown id, then 404; SKU used by another product, then 409.

**US-4 Delete product**
- Given an existing product, when I delete it, then the API returns 204 and it no longer appears in the list.
- Given an unknown id, then I get 404; an invalid id returns 400.

## Architecture (SOLID)
- **Single responsibility:** `routes` (HTTP), `services` (business rules), `repositories` (storage), `models` (validation).
- **Open/closed + Liskov:** `JsonFileProductRepository` extends the in-memory repository without changing the service.
- **Dependency inversion:** `ProductService` receives a repository through its constructor; swap in MongoDB later without touching business logic.

## Testing
- `tests/productService.test.js` - TDD module 1 (service rules for US-1 to US-4)
- `tests/products.api.test.js` - TDD module 2 (API through Supertest: status codes, response bodies, error handling, static UI)
- `tests/productModel.test.js` - validation rules, defaults and normalisation for every field
- `tests/inMemoryRepository.test.js` / `tests/jsonFileRepository.test.js` - repository contract and JSON persistence (missing/corrupt files, id sequence)
- `tests/errors.test.js` - custom error classes and their HTTP status codes
- `tests/server.test.js` - server bootstrap (`STORAGE` and `PORT` environment variables)
- `tests/ui.test.js` - web UI in jsdom: list and empty state, add, edit, cancel, delete and error messages
- `npm run test:coverage` - Jest with a coverage report (currently 100% of `src/`)
- `postman/inventory.postman_collection.json` - API tests; run `npx newman run postman/inventory.postman_collection.json` while the server is up
- CI: `.github/workflows/ci.yml` runs Jest and Newman on every push
- `docs/TEST_REPORT.md` - test cases per acceptance criterion, latest results, defect log and sign-off

## Suggested git workflow (keep Jira keys in commits)
```
git init && git add . 
git commit -m "AG-12: initial project skeleton"
```
For later sprints, commit the failing test first, then the implementation:
`AG-16: add failing test for delete product` -> `AG-16: implement delete product`
