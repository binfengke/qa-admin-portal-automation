# Contract Testing Design

**Date:** 2026-03-19

**Project:** `qa-admin-portal-automation`

**Goal:** Add a minimal, explainable contract-testing layer that protects API consumers from breaking changes and is suitable for CI and portfolio discussion.

## Problem

The project already validates inputs with Zod and performs response-shape assertions in API/E2E tests, but the API contract is still implicit. The current tests define expected shapes inline, which makes the outward contract harder to explain and easier to drift.

## Design Summary

Introduce a small OpenAPI contract file for the most important outward-facing endpoints and verify the running Fastify provider against that contract in Vitest integration tests.

This first version only covers:

- `POST /auth/login`
- `GET /me`
- `GET /users`

The contract should describe stable consumer-facing behavior only:

- status codes
- required response fields
- field types and enums
- shared error envelope

It must not lock down volatile implementation details such as JWT contents or exact cookie attributes.

## Why This Approach

### Chosen

**OpenAPI contract + provider verification**

- Lowest implementation cost in the current repo
- Fits the existing `apps/api` Vitest integration test setup
- Works well in CI
- Easy to explain in interviews: explicit contract artifact plus provider verification

### Rejected

**Pact / consumer-driven contracts**

- More setup than value for a single-repo demo project
- Harder to keep minimal and readable

**Shared schema only**

- Too easy to describe as “shared validation” instead of contract testing
- Does not create a clear standalone contract artifact

## Contract Scope

### `POST /auth/login`

Success contract:

- `200`
- body: `{ ok: true }`
- `set-cookie` header present

Failure contract:

- `401`
- shared error envelope
- `error.code = AUTH_INVALID_CREDENTIALS`

### `GET /me`

Success contract:

- `200`
- body contains `user.id`, `user.email`, `user.role`
- `id` is UUID
- `email` is email
- `role` is `admin | viewer`

Failure contract:

- `401`
- shared error envelope

### `GET /users`

Success contract:

- `200`
- body contains `items`, `page`, `pageSize`, `total`
- each item contains `id`, `email`, `role`, `status`, `createdAt`
- `role` is `admin | viewer`
- `status` is `active | disabled`

Failure contract:

- `401` for unauthenticated access
- `400` for invalid query parameters
- all use the shared error envelope

## Shared Error Contract

All API errors in scope should conform to:

- `error.code`
- `error.message`
- `requestId`

Validation errors may additionally include:

- `error.details`

## File Layout

- `contracts/admin-api.openapi.yaml`
- `apps/api/test/integration/helpers/contract.ts`
- `apps/api/test/integration/contract.auth.test.ts`
- `apps/api/test/integration/contract.me.test.ts`
- `apps/api/test/integration/contract.users.test.ts`

## Verification Strategy

Provider verification will run inside `apps/api` integration tests:

1. Start the real Fastify app with fake Prisma data
2. Make real HTTP requests with `supertest`
3. Assert status codes and required headers
4. Validate response bodies against the OpenAPI schemas

Existing Playwright API tests remain useful as consumer-facing regression checks, but they will no longer be the only place where the response contract is defined.

## Tooling

- `@apidevtools/swagger-parser` to validate and dereference the OpenAPI document
- `ajv` to validate response bodies against the resolved JSON Schemas
- `ajv-formats` to support formats such as `uuid`, `email`, and `date-time`

## Success Criteria

- The repo contains an explicit OpenAPI contract artifact for the three selected endpoints
- CI provider verification fails if required fields, enums, or key error structures drift
- The setup remains small enough to explain in a resume or interview without hand-waving
