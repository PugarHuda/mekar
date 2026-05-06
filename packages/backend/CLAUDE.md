# MEKAR Backend Package

Express service that wraps the 0G SDKs for Storage and Compute (TEE inference).

## Stack

- Node.js 20 + TypeScript ESM
- Express 5
- `@0gfoundation/0g-ts-sdk` — Storage operations
- `@0glabs/0g-serving-broker` — Compute / TEE inference
- ethers.js v6
- Zod (validation)
- Pino (logger)

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Network + contract status |
| POST | `/api/storage/upload` | Upload encrypted weights/data to 0G Storage |
| POST | `/api/storage/merkle` | Compute Merkle root from a list of hashes |
| POST | `/api/compute/inference` | Run sealed inference, return output + TEE attestation |
| POST | `/api/compute/verify` | Verify a TEE attestation signature |
| GET | `/api/compute/providers` | List available TEE inference providers |

## Run

```bash
pnpm install               # from monorepo root
pnpm --filter @mekar/backend dev   # → http://localhost:3001
```

Requires a root `.env` with `DEPLOYER_PRIVATE_KEY` for signed transactions.

## Status (MVP)

The Storage and Compute services contain **mock implementations** with the
proper interfaces in place. The real 0G SDK calls are wired but commented
out (TODO markers) until:
- The 0G Storage indexer URL is confirmed and tested
- The 0G Compute broker URL is configured (an account is required)

## Production TODO

- [ ] Real `Indexer.upload()` via the 0G TS SDK
- [ ] Encrypted weights with INFT-bound keys
- [ ] Real `broker.inference.processResponse()` with attestation verification
- [ ] Webhook from `RoyaltyVault` settlement events
- [ ] Indexer for fast lineage queries (replacing direct chain reads)

## Conventions

- Services in `src/services/` are stateless wrappers
- Routes in `src/routes/` only validate + delegate to services
- Use Zod for ALL request validation
- Pino logger with structured fields
