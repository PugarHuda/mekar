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

## Status

| Service | Real or Mock | Notes |
|---|---|---|
| Storage `uploadToStorage` | **Real** | Wires `Indexer.upload` against `indexer-storage-testnet-turbo.0g.ai`. Verified on Galileo: ~30 microO per upload, 13–20s end-to-end. |
| Storage `encryptForINFT` | Mock | Placeholder for ECIES + INFT-bound keys (Phase 2). Currently passes plaintext through. |
| Compute `runInference` | Mock | Awaits 0G compute broker URL + account. |
| Compute `verifyAttestation` | Mock | Awaits TEE enclave-measurement validation. |

## Production TODO

- [ ] Encrypted weights with INFT-bound keys (ECIES + KMS)
- [ ] Real `broker.inference.processResponse()` with attestation verification
- [ ] Webhook from `RoyaltyVault` settlement events
- [ ] Indexer for fast lineage queries (replacing direct chain reads)

## Operational gotchas

### `tsx watch` does NOT hot-reload `.env`

`dotenv.config()` runs once on process boot. After editing `.env` (root file
loaded by `lib/config.ts`), `tsx watch` will keep serving the old values
because the watcher only reloads on **source-file** changes.

**Fix:** kill all `node` processes, then restart:

```powershell
# Windows (PowerShell)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
pnpm --filter @mekar/backend dev
```

```bash
# Unix
pkill -f "tsx watch src/index.ts"
pnpm --filter @mekar/backend dev
```

Symptom that this is biting you: `GET /health` returns stale contract
addresses even though `.env` has the new ones.

### Galileo RPC null-response on long blocking calls

`cast send` (and ethers `wait()`) sometimes hang and return
`server returned a null response when a non-null response was expected`
on Galileo testnet — the tx is broadcast and mined, but the receipt fetch
times out from the RPC side.

**Pattern that works**: broadcast async, poll `cast receipt` with backoff:

```bash
TX=$(cast send <args> --async --gas-limit 800000)
for i in 2 3 4 5 6; do
  sleep $i
  status=$(cast receipt $TX --rpc-url $RPC 2>/dev/null | grep ^status | awk '{print $2}')
  if [ "$status" = "1" ]; then break; fi
done
```

This is what `scripts/deploy-v2-fix.sh` and `scripts/multi-wallet-seed.sh`
use throughout. Same applies to the SDK side — wrap upload calls in
try/catch and surface a friendly message if the RPC briefly drops.

## Conventions

- Services in `src/services/` are stateless wrappers
- Routes in `src/routes/` only validate + delegate to services
- Use Zod for ALL request validation
- Pino logger with structured fields
