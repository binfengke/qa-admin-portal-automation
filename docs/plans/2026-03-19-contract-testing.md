# Contract Testing Implementation Plan

> Execution note: Steps use checkbox (`- [ ]`) syntax for tracking during implementation.

**Goal:** Add minimal OpenAPI-based provider contract verification for `POST /auth/login`, `GET /me`, and `GET /users`.

**Architecture:** Store a small OpenAPI document as the contract artifact, then verify the real Fastify provider against it in Vitest integration tests. Reuse the existing fake Prisma integration-test setup so the new tests stay fast and deterministic.

**Tech Stack:** Fastify, Vitest, Supertest, OpenAPI 3.0, `@apidevtools/swagger-parser`, `ajv`, `ajv-formats`

---

## Chunk 1: Contract Artifact

### Task 1: Add the contract file

**Files:**
- Create: `contracts/admin-api.openapi.yaml`

- [ ] **Step 1: Write the contract file for the three selected endpoints**
- [ ] **Step 2: Include shared schemas for user summaries and error envelopes**
- [ ] **Step 3: Keep only stable consumer-facing fields in scope**

## Chunk 2: Validation Helper

### Task 2: Add contract-loading and response-validation helpers

**Files:**
- Create: `apps/api/test/integration/helpers/contract.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add a failing contract-helper test indirectly by referencing the helper from a new integration test**
- [ ] **Step 2: Add dev dependencies for OpenAPI parsing and JSON Schema validation**
- [ ] **Step 3: Implement a helper that loads, validates, and dereferences the OpenAPI contract**
- [ ] **Step 4: Implement a helper that validates a response body for a specific path/method/status combination**

## Chunk 3: Provider Verification Tests

### Task 3: Add auth contract verification

**Files:**
- Create: `apps/api/test/integration/contract.auth.test.ts`

- [ ] **Step 1: Write a failing success-case contract test for `POST /auth/login`**
- [ ] **Step 2: Run the targeted test and confirm the expected failure**
- [ ] **Step 3: Implement the minimal helper/contract support needed**
- [ ] **Step 4: Add the invalid-credentials contract test**
- [ ] **Step 5: Re-run the targeted auth contract tests**

### Task 4: Add `/me` contract verification

**Files:**
- Create: `apps/api/test/integration/contract.me.test.ts`

- [ ] **Step 1: Write a failing success-case contract test for `GET /me`**
- [ ] **Step 2: Verify unauthenticated `401` behavior against the contract**
- [ ] **Step 3: Run the targeted `/me` contract tests and get them green**

### Task 5: Add `/users` contract verification

**Files:**
- Create: `apps/api/test/integration/contract.users.test.ts`

- [ ] **Step 1: Write a failing admin success-case contract test for `GET /users`**
- [ ] **Step 2: Verify `401` and `400` error responses against the contract**
- [ ] **Step 3: Run the targeted `/users` contract tests and get them green**

## Chunk 4: Verification and Docs

### Task 6: Document and verify the feature

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a short README note that the API contract is explicitly verified in CI**
- [ ] **Step 2: Run `pnpm test:api` from the repo root**
- [ ] **Step 3: Confirm the full API test suite passes before claiming completion**
