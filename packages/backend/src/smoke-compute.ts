/**
 * 0G Compute Network smoke test — confirms `@0glabs/0g-serving-broker`
 * actually talks to the Galileo testnet from our setup before we wire it
 * deeper into `RoyaltyVault.settleInference`.
 *
 * Steps:
 *   1. createZGComputeNetworkBroker(signer) — instantiate against the
 *      default Galileo Compute Network contracts
 *   2. broker.ledger.getLedger() — read the deployer's funded balance
 *   3. broker.inference.listService() — list services registered on the
 *      Data Serving Network
 *
 * Run from monorepo root:
 *   pnpm --filter @mekar/backend exec tsx src/smoke-compute.ts
 *
 * Phase 2 (wire-up to MEKAR):
 *   - Pick one service from listService(), call
 *     broker.inference.getRequestHeaders() + send query
 *   - Capture the signed response + attestation hash
 *   - Pass attestation bytes into RoyaltyVault.settleInference so MEKAR's
 *     escrow release is gated on a real 0G Compute attestation
 *   - That means MEKAR's "compute provider" can BE a 0G DSN provider:
 *     one provider wallet, two parallel settlement layers (MEKAR royalty
 *     cascade + DSN per-call billing).
 */

import { ethers } from "ethers";
import { createRequire } from "node:module";
import { config } from "./lib/config.js";

// @0glabs/0g-serving-broker@0.4.4 ships a broken ESM bundle — named
// exports re-exported from a sub-chunk fail to resolve under native
// Node ESM. Fall back to the CJS entry which does load cleanly. Wrap
// in a typed shim so the rest of the file looks like a normal import.
const brokerRequire = createRequire(import.meta.url);
const brokerCjs = brokerRequire("@0glabs/0g-serving-broker") as {
    createZGComputeNetworkBroker: (signer: ethers.Wallet) => Promise<{
        ledger: { getLedger: () => Promise<unknown> };
        inference: { listService: () => Promise<unknown[]> };
    }>;
};
const createZGComputeNetworkBroker = brokerCjs.createZGComputeNetworkBroker;

async function main() {
    if (!config.wallet.privateKey) {
        throw new Error("DEPLOYER_PRIVATE_KEY missing in .env");
    }

    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const signer = new ethers.Wallet(config.wallet.privateKey, provider);

    const address = await signer.getAddress();
    const bal = await provider.getBalance(address);

    console.log("network        :", config.network);
    console.log("rpc            :", config.rpcUrl);
    console.log("signer         :", address);
    console.log("balance        :", ethers.formatEther(bal), "OG");
    console.log("");

    console.log("Step 1 — creating 0G Compute Network broker…");
    let broker;
    try {
        broker = await createZGComputeNetworkBroker(signer);
    } catch (err) {
        console.error(
            "✗ Broker init failed:",
            err instanceof Error ? err.message : String(err)
        );
        console.error(
            "  Likely cause: 0G Compute contracts not deployed on this network,\n" +
                "  or default ledger CA / inference CA not configured for Galileo testnet."
        );
        process.exit(1);
    }
    console.log("✓ Broker instantiated");
    console.log("  modules        :", Object.keys(broker).join(", "));
    console.log("");

    console.log("Step 2 — reading ledger balance…");
    try {
        const ledger = await broker.ledger.getLedger();
        console.log("✓ Ledger read OK");
        // The ledger shape varies by SDK version; just dump what's there.
        console.log("  raw            :", JSON.stringify(ledger, null, 2).slice(0, 400));
    } catch (err) {
        console.warn(
            "⚠ Ledger read failed (expected if account not initialised):",
            err instanceof Error ? err.message : String(err)
        );
        console.warn("  → Phase 2: call broker.ledger.addLedger(amount) to fund + initialise.");
    }
    console.log("");

    console.log("Step 3 — listing DSN inference services…");
    try {
        const services = await broker.inference.listService();
        console.log("✓ listService returned", services.length, "service(s)");
        for (const svc of services.slice(0, 5)) {
            console.log("  ", JSON.stringify(svc, null, 2).slice(0, 200));
        }
        if (services.length === 0) {
            console.log(
                "  (No services registered on Galileo DSN yet — that's expected for testnet.)"
            );
        }
    } catch (err) {
        console.warn(
            "⚠ listService failed:",
            err instanceof Error ? err.message : String(err)
        );
    }

    console.log("\n=== Smoke test complete ===");
    console.log(
        "If broker.ledger + broker.inference both responded, the SDK is ready for\n" +
            "Phase 2 wire-up into RoyaltyVault.settleInference (see code comment at top)."
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
