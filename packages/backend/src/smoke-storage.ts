/**
 * 0G Storage smoke test — uploads a small payload directly via the SDK
 * to verify our wiring + RPC + indexer flow before pulling it into the
 * Express service. Run from repo root:
 *
 *   pnpm --filter @mekar/backend exec tsx src/smoke-storage.ts
 */

import { ethers } from "ethers";
import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { config } from "./lib/config.js";

async function main() {
    if (!config.wallet.privateKey) {
        throw new Error("DEPLOYER_PRIVATE_KEY missing in .env");
    }

    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const signer = new ethers.Wallet(config.wallet.privateKey, provider);

    console.log("network    :", config.network);
    console.log("rpc        :", config.rpcUrl);
    console.log("indexer    :", config.storageIndexer);
    console.log("signer     :", await signer.getAddress());
    console.log("balance    :", ethers.formatEther(await provider.getBalance(await signer.getAddress())), "OG");

    const indexer = new Indexer(config.storageIndexer);

    const payload = new TextEncoder().encode(
        JSON.stringify({
            kind: "mekar-smoke-test",
            timestamp: new Date().toISOString(),
            note: "If you can read this from 0G Storage, the SDK works.",
        })
    );
    const file = new MemData(Array.from(payload));

    console.log("payload    :", payload.length, "bytes");
    console.log("uploading…");

    const start = Date.now();
    const [result, err] = await indexer.upload(file, config.rpcUrl, signer);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (err) {
        console.error("upload failed after", elapsed, "s:", err);
        process.exit(1);
    }

    console.log("upload OK after", elapsed, "s");
    console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
