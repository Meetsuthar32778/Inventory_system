# Test Report - Sprint 1 (Core Item Management)

**Story:** As a project team member, I want the inventory features to be tested so that important workflows can be verified before the final demonstration.

| | |
|---|---|
| Date executed | 2026-10-29 |
| Build | `main` @ `e8c87c8` + test suite changes |
| Environment | Node v25.2.1, Windows 11; CI: Node 20, ubuntu-latest |
| Tools | Jest 30 (unit, integration, UI via jsdom), Supertest, Postman/Newman |

## 1. How to run
```bash
npm test                 # all Jest tests
npm run test:coverage    # Jest + coverage report
STORAGE=memory npm start # then, in a second terminal:
npx newman run postman/inventory.postman_collection.json
```

## 2. Test cases for the core workflows
Each row is one acceptance criterion from the README. "Evidence" names the suites that check it
(S = `productService.test.js`, A = `products.api.test.js`, M = `productModel.test.js`,
R = repository tests, U = `ui.test.js`, P = Postman collection).

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

## 3. Execution results (2026-10-29)

| Suite | Tests | Passed | Failed |
|---|---|---|---|
| Jest - all 8 suites | 202 | 202 | 0 |
| Newman - Postman collection | 18 requests / 24 assertions | 24 | 0 |

Code coverage of `src/`: **100%** statements, branches, functions and lines.

The suite was also checked by deliberately breaking the code (empty-state logic, delete-while-editing,
SKU conflict check): 4 tests failed as expected, then the code was restored.

## 4. Defect log

| ID | Severity | Status | Description | Steps to reproduce | Expected | Actual |
|---|---|---|---|---|---|---|
| DEF-1 | Medium | Open | Duplicate ids when `data/products.json` has no `nextId` and ids have gaps (`jsonFileProductRepository.js:18` uses `products.length + 1`) | Data file `{"products":[{"id":1},{"id":3}]}`, start app, add a product | New id 4 | New id 3 (ids 1, 3, 3) |
| DEF-2 | Low | Open | `PUT /api/products/:id` with a JSON array body is accepted as an empty update | `PUT /api/products/1` with body `[]` | 400 Validation failed | 200, only `updatedAt` changes |

Track both in Jira (Agile space) as Bugs and link them to this story; update the Status column when fixed.

## 5. Acceptance criteria sign-off

| Story acceptance criterion | Status | Where |
|---|---|---|
| Test cases are prepared for the agreed core workflows | Done | Section 2; `tests/`, `postman/` |
| Tests are executed and results recorded | Done | Section 3; CI runs on every push |
| Defects are documented and tracked | Documented; Jira tickets to be raised | Section 4 |
| The team records whether the agreed acceptance criteria pass | Done - all 17 test cases pass | Section 2 |
