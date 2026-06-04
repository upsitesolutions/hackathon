# Database local runbook

This folder contains local-first database assets for Sous.

## Local prerequisites

1. Install dependencies in functions:
   - `cd functions`
   - `npm install`
2. Ensure `@azure/cosmos` is installed in functions (Akiva-owned dependency install):
   - `cd functions`
   - `npm install @azure/cosmos`
3. Start local Cosmos DB endpoint (pick one):
   - Cosmos DB Emulator on Windows, or
   - Azure Cosmos DB account using test credentials.

## Environment variables

Set these in your local settings before running tests.

Connection-string mode (recommended if available):
- `COSMOS_CONNECTION_STRING`
- Optional overrides: `COSMOS_DB_NAME`, `COSMOS_RECIPES_CONTAINER`, `COSMOS_SESSIONS_CONTAINER`

Endpoint/key mode (works with emulator):
- `COSMOS_ENDPOINT`
- `COSMOS_KEY`
- Optional overrides: `COSMOS_DB_NAME`, `COSMOS_RECIPES_CONTAINER`, `COSMOS_SESSIONS_CONTAINER`

Defaults used by code:
- DB name: `sous-db`
- Recipes container: `recipes`
- Sessions container: `sessions`

## Smoke test (pre-prod check)

From repo root:

1. Build functions TypeScript:
   - `cd functions`
   - `npm run build`
2. Run env preflight:
   - `node ../database/tests/preflight/env-check.js`
3. Run smoke test:
   - `node ../database/tests/db-smoke.js`

Structured test folders:
- `database/tests/preflight/` for config checks
- `database/tests/smoke/` for end-to-end checks
- `database/tests/reports/` for test artifacts

What this test validates:
- DB/bootstrap path initializes database and containers when missing
- Recipe cache write/read by id and content hash
- Step lookup in recipe
- Session create + append turn + append adjustment
- Personalized recipe save + session readback

Expected result:
- Console prints `DB smoke test passed.` and generated IDs.

## Notes for prod handoff

- Keep container names and partition keys unchanged for easy port:
  - `recipes` with partition key `/id`
  - `sessions` with partition key `/sessionId`
- Akiva can swap local credentials for production credentials without changing client code.
