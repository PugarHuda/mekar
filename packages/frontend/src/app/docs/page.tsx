/**
 * /docs — in-app developer documentation.
 *
 * Mirrors the content of `docs/QUICKSTART.md` + `docs/INTEGRATION_GUIDE.md`
 * but rendered with MEKAR's woodcut palette so the experience stays
 * consistent across pages. External-link "View on GitHub" at the bottom
 * for the source-of-truth full markdown.
 *
 * Content here is intentionally a curated subset — the most actionable
 * recipes that a third-party developer needs to build something on top
 * of MEKAR in one sitting. The repo-side markdown remains the canonical
 * reference for everything else.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { DocsSidebar, type DocSection } from "./Sidebar";
import { Code } from "./CodeBlock";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
    title: "Docs — Build on Mekar",
    description:
        "Developer quickstart for integrating Mekar's royalty cascade into your own product. Express bots, Discord bots, indexers, mobile apps.",
};

const REPO = "https://github.com/PugarHuda/mekar";
const QUICKSTART_URL = `${REPO}/blob/main/docs/QUICKSTART.md`;
const GUIDE_URL = `${REPO}/blob/main/docs/INTEGRATION_GUIDE.md`;

// Section index for the sidebar — order must mirror the JSX render order
// below or scrollspy gets confused. Keep eyebrows short; they're shown
// as a secondary line under the section title in the sidebar.
const SECTIONS: DocSection[] = [
    { id: "intro", label: "Introduction" },
    { id: "addresses", label: "Contract addresses", eyebrow: "Aristotle mainnet" },
    { id: "earn", label: "Earn from your model", eyebrow: "Why Mekar" },
    { id: "quickstart", label: "1 · Hello, Mekar", eyebrow: "cast · CLI" },
    { id: "express-bot", label: "2 · Express bot", eyebrow: "Node · viem" },
    { id: "indexer", label: "3 · Royalty indexer", eyebrow: "Analytics" },
    { id: "encryption", label: "4 · Encrypt weights", eyebrow: "AES-256 · SDK" },
    { id: "errors", label: "5 · Error patterns", eyebrow: "Network gotchas" },
    { id: "gas", label: "6 · Gas & fees", eyebrow: "Cost table" },
    { id: "safety", label: "7 · Safety & limits", eyebrow: "DoS · gas bounds" },
    { id: "status", label: "8 · Live vs Phase 2", eyebrow: "Honesty audit" },
    { id: "more", label: "Full reference", eyebrow: "Repo links" },
];

export default function DocsPage() {
    return (
        <div>
            <main className="docs-page" style={{ padding: "var(--pad-section) 0" }}>
                <div className="container docs-layout">
                    {/* Sticky left rail. Sidebar.tsx is a Client Component
                        because it runs IntersectionObserver to track which
                        section is in view. */}
                    <DocsSidebar sections={SECTIONS} />

                    {/* Right column: actual docs content. */}
                    <div className="docs-content">
                    <header
                        id="intro"
                        style={{ marginBottom: 56, scrollMarginTop: 100 }}
                    >
                        <span className="eyebrow">/docs</span>
                        <h1
                            style={{
                                fontSize: "clamp(40px, 5vw, 64px)",
                                marginTop: 12,
                                lineHeight: 1.05,
                            }}
                        >
                            Build on <em>Mekar.</em>
                        </h1>
                        <p
                            style={{
                                color: "var(--ink-soft)",
                                marginTop: 14,
                                maxWidth: "62ch",
                                fontSize: 16.5,
                            }}
                        >
                            Mekar is on-chain royalty infrastructure on 0G — not a closed product. Pay
                            an agent from a Discord bot, index the cascade for analytics, mint INFTs
                            from your own UI. Same on-chain contract, same atomic royalty distribution.
                        </p>
                        <p
                            style={{
                                marginTop: 14,
                                padding: "12px 16px",
                                background: "var(--bg-alt)",
                                border: "1px solid var(--rule)",
                                borderRadius: 6,
                                fontFamily: "var(--mono)",
                                fontSize: 13,
                                color: "var(--ink-soft)",
                                maxWidth: "62ch",
                            }}
                        >
                            <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                                Integration TL;DR:
                            </span>{" "}
                            <code>writeContract({"{"} address: VAULT, fn: "payInference",
                            args: [agentId], value{"}"})</code> escrows the fee, then{" "}
                            <code>settleInference</code> walks the lineage, splits royalty
                            across 4 generations, and sweeps dust to treasury in one
                            atomic tx.
                        </p>

                        <div
                            style={{
                                display: "flex",
                                gap: 12,
                                marginTop: 24,
                                flexWrap: "wrap",
                            }}
                        >
                            <a href="#quickstart" className="btn">
                                Quickstart →
                            </a>
                            <Link
                                href={QUICKSTART_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn--ghost"
                            >
                                View on GitHub <ExternalLink size={14} />
                            </Link>
                        </div>
                    </header>

                    {/* Contract addresses */}
                    <DocSection id="addresses" title="Contract addresses" eyebrow="Aristotle mainnet · chain 16661">
                        <Table
                            rows={[
                                ["AgentINFT (ERC-7857)", "0x0e8e941c363dc1C06DD0bC02395B775dE94B48a4"],
                                ["MekarRegistry", "0xF24C4B0f45a46E2d761770BA75e147DEb738d3A6"],
                                ["RoyaltyVault", "0x55107dB2CB8399fbA7Fdd913fd5a0FBACd7134f6"],
                                ["AlignmentAuditor", "0x66f6f49B80d4F705AB1b8Fe8E6b2cA51846EBDE8"],
                                [
                                    "TrainingDataRegistry",
                                    "0x3917e0fcb2E865047A0cDAF4CB648DdCA3B4bB46",
                                ],
                            ]}
                        />
                        <Note>
                            Live on 0G Aristotle mainnet (chain 16661). All five contracts
                            deployed fresh + wired. Explorer:{" "}
                            <Link
                                href="https://chainscan.0g.ai"
                                target="_blank"
                                rel="noreferrer"
                            >
                                chainscan.0g.ai
                            </Link>
                            . The same code path runs on Galileo testnet too —{" "}
                            <code>ACTIVE_CHAIN</code> switches via the{" "}
                            <code>NEXT_PUBLIC_NETWORK</code> env var.
                        </Note>
                    </DocSection>

                    {/* Earn from your model — expands the landing snippet */}
                    <DocSection
                        id="earn"
                        title="Earn from your model"
                        eyebrow="Why Mekar · for AI creators"
                    >
                        <p>
                            Whether your model is open-source or proprietary, if it gets
                            used you should get paid. Publish a base model, a fine-tune,
                            or a LoRA — Mekar turns every downstream use into a royalty
                            stream that flows back to you, with no platform, no invoicing,
                            and no middleman taking a cut. Proprietary weights stay
                            private: register in <strong>Strict mode</strong> and the
                            weights are AES-encrypted on 0G Storage — only the royalty
                            rail is public, never the model itself.
                        </p>

                        <h3 style={subhStyle}>The three steps</h3>
                        <Code language="ts">{`// 1. Register your model once — it becomes an ERC-7857 INFT.
const agentId = await agentINFT.mintGenesis(
  weightsPointer,   // 0G Storage rootHash of your weights
  trainingMerkle,   // Merkle root of your training data
  teeProof,         // TEE attestation hash
  royaltySchema,    // your split — 50/25/15/7/3 by default
);

// 2. Anyone who uses the agent pays through the vault:
await royaltyVault.payInference(agentId, { value: fee });

// 3. A registered compute provider calls settleInference —
//    the fee then cascades on-chain in one atomic tx:
//      50% → you (direct owner)
//      25% → gen-1 parents you forked from
//      15% → gen-2 ancestors
//       7% → gen-3+ (capped at depth 10)
//       3% → training-data contributors
//    Dust + any unpayable share sweeps to the protocol treasury.`}</Code>

                        <h3 style={subhStyle}>What this means for you</h3>
                        <ul style={listStyle}>
                            <li>
                                <strong>Forks pay you back.</strong> When someone
                                fine-tunes your model, their agent lists yours as a
                                parent. Every inference on the fork sends a gen-1 share
                                up to you — automatically, forever.
                            </li>
                            <li>
                                <strong>No account, no platform.</strong> Royalty lands
                                in the wallet that minted the agent. Mekar is a contract,
                                not a marketplace — it never holds or gates your earnings.
                            </li>
                            <li>
                                <strong>You set the split.</strong> The royalty schema is
                                a mint-time parameter. Want training-data contributors to
                                get more than 3%? Configure it when you mint genesis.
                            </li>
                            <li>
                                <strong>Alignment protects the rail.</strong> An agent
                                slashed for bias drift earns a reduced share — so a
                                misaligned fork can&apos;t dilute honest ancestors.
                            </li>
                        </ul>

                        <Note>
                            The royalty cascade is <strong>live on chain today</strong> —
                            see the settlement proof in section 8. What&apos;s Phase 2 is
                            the inference compute itself (0G Compute TEE) — Mekar settles
                            the payment rail regardless of who runs the model.
                        </Note>
                    </DocSection>

                    {/* Quickstart: cast */}
                    <DocSection
                        id="quickstart"
                        title="1. Five-minute hello, MEKAR"
                        eyebrow="cast · CLI"
                    >
                        <p>
                            Verify your wallet can pay an inference and trigger the royalty
                            cascade. Need ~0.002 OG of real $0G on Aristotle mainnet — or
                            run against Galileo testnet with free $0G from the{" "}
                            <Link
                                href="https://faucet.0g.ai"
                                target="_blank"
                                rel="noreferrer"
                            >
                                0G faucet
                            </Link>
                            .
                        </p>
                        <Code language="bash">{`RPC=https://evmrpc.0g.ai
VAULT=0x55107dB2CB8399fbA7Fdd913fd5a0FBACd7134f6

# Read the live price for agent #4 (Carol's compose)
PRICE=$(cast call $VAULT \\
  "getInferencePrice(uint256)(uint256)" 4 \\
  --rpc-url $RPC | awk '{print $1}')

# Pay — escrow opens, requestId emitted as first indexed topic
cast send $VAULT "payInference(uint256)" 4 \\
  --value $PRICE \\
  --rpc-url $RPC \\
  --private-key $PK \\
  --legacy --async`}</Code>
                        <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                            That's it. Royalty cascades automatically when a registered provider
                            settles the requestId. No claim button needed.
                        </p>
                    </DocSection>

                    {/* Express bot */}
                    <DocSection
                        id="express-bot"
                        title="2. Pay-per-inference Express bot"
                        eyebrow="Node.js · viem"
                    >
                        <p>
                            Wrap a MEKAR agent invocation as a REST endpoint. Your user POSTs,
                            your service pays MEKAR, royalty cascades on chain.
                        </p>
                        <Code language="ts">{`import { createWalletClient, createPublicClient, http, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const VAULT = "0x55107dB2CB8399fbA7Fdd913fd5a0FBACd7134f6" as const;
const account = privateKeyToAccount(process.env.PK as \`0x\${string}\`);

const wallet = createWalletClient({ account, chain: zg, transport: http() });
const pub = createPublicClient({ chain: zg, transport: http() });

app.post("/inference/:agentId", async (req, res) => {
  const id = BigInt(req.params.agentId);
  const price = await pub.readContract({
    address: VAULT,
    abi: [parseAbiItem("function getInferencePrice(uint256) view returns (uint256)")],
    functionName: "getInferencePrice",
    args: [id],
  });
  const hash = await wallet.writeContract({
    address: VAULT,
    abi: [parseAbiItem("function payInference(uint256) payable returns (bytes32)")],
    functionName: "payInference",
    args: [id],
    value: price,
  });
  res.json({ ok: true, txHash: hash, paid: price.toString() });
});`}</Code>
                    </DocSection>

                    {/* Indexer */}
                    <DocSection
                        id="indexer"
                        title="3. Royalty indexer in 30 lines"
                        eyebrow="Analytics · viem"
                    >
                        <p>
                            Build a leaderboard from <code>RoyaltyPaid</code> events. Same
                            parallel-chunked scan pattern as the frontend&apos;s
                            <code> useUserStats </code>hook — public 0G RPC tolerates ~5
                            concurrent log fetches.
                        </p>
                        <Code language="ts">{`const event = parseAbiItem(
  "event RoyaltyPaid(uint256 indexed agentId, address indexed recipient, uint16 generation, uint256 amount)"
);

const CHUNK = 50_000n;
const ranges: { from: bigint; to: bigint }[] = [];
for (let f = DEPLOY_BLOCK; f <= latest; f += CHUNK) {
  ranges.push({ from: f, to: f + CHUNK > latest ? latest : f + CHUNK });
}

// 5 concurrent at a time — same trick as the frontend hook
const results = await Promise.all(
  ranges.map(r => client.getLogs({
    address: VAULT, event, fromBlock: r.from, toBlock: r.to
  }))
);

// Group by recipient → leaderboard
const byRecipient = new Map<string, bigint>();
for (const logs of results)
  for (const log of logs)
    byRecipient.set(
      log.args.recipient!,
      (byRecipient.get(log.args.recipient!) ?? 0n) + log.args.amount!
    );`}</Code>
                    </DocSection>

                    {/* Encryption */}
                    <DocSection
                        id="encryption"
                        title="4. Encrypt weights before upload"
                        eyebrow="0G Storage · AES-256"
                    >
                        <p>
                            The 0G SDK ships AES-256 encryption directly in
                            <code> UploadOption.encryption</code>. The MEKAR
                            <code> /api/storage/upload </code>route exposes it as an{" "}
                            <code>encryption: &quot;aes256&quot;</code> flag — the route
                            generates a fresh 256-bit key, encrypts client-side before
                            chunks leave for storage nodes, and returns the key with the
                            rootHash.
                        </p>
                        <Code language="ts">{`const aesKey = new Uint8Array(32);
crypto.getRandomValues(aesKey);

const [result, err] = await indexer.upload(
  new MemData(Array.from(buf)),
  "https://evmrpc.0g.ai",
  signer,
  { encryption: { type: "aes256", key: aesKey } }
);
// result.rootHash is what you anchor on chain.
// Persist aesKey separately — only key-holders can decrypt.`}</Code>
                        <Note>
                            ECIES (public-key) encryption is also supported via{" "}
                            <code>{`{ type: "ecies", recipientPubKey }`}</code>. Production
                            pairs this with an INFT-bound re-encryption oracle so the
                            decryption right transfers with the token.
                        </Note>
                    </DocSection>

                    {/* Error handling */}
                    <DocSection
                        id="errors"
                        title="5. Error patterns that actually work"
                        eyebrow="Network · gotchas"
                    >
                        <p>
                            Three patterns we've hardened through actual development pain.
                        </p>

                        <h3 style={subhStyle}>
                            <code>cast send</code> hangs on receipt fetch
                        </h3>
                        <p style={pStyle}>
                            0G's RPC occasionally drops receipt fetches occasionally. Use{" "}
                            <code>--async</code>, then poll <code>cast receipt</code> with
                            backoff:
                        </p>
                        <Code language="bash">{`TX=$(cast send $VAULT ... --async)
for i in 2 3 4 5 6; do
    sleep $i
    status=$(cast receipt $TX --rpc-url $RPC 2>/dev/null | grep ^status | awk '{print $2}')
    [ "$status" = "1" ] && break
done`}</Code>

                        <h3 style={subhStyle}>
                            <code>getLogs</code> silently returns <code>[]</code>
                        </h3>
                        <p style={pStyle}>
                            Block ranges &gt;100k return empty without error. Always chunk
                            ≤50k:
                        </p>
                        <Code language="ts">{`for (let from = startBlock; from <= latest; from += 50_000n) {
  const to = from + 50_000n > latest ? latest : from + 50_000n;
  const chunk = await client.getLogs({ address, event, fromBlock: from, toBlock: to });
}`}</Code>

                        <h3 style={subhStyle}>Stuck escrow recovery</h3>
                        <p style={pStyle}>
                            If <code>settleInference</code> never fires, any caller can refund
                            after the 1h timeout:
                        </p>
                        <Code language="ts">{`await client.writeContract({
  address: VAULT,
  abi: [parseAbiItem("function refundIfTimeout(bytes32 requestId)")],
  functionName: "refundIfTimeout",
  args: [requestId],
});`}</Code>
                    </DocSection>

                    {/* Gas table */}
                    <DocSection
                        id="gas"
                        title="6. Gas + fee accounting"
                        eyebrow="Operation costs"
                    >
                        <p>Approximate at 4 gwei on Aristotle:</p>
                        <Table
                            rows={[
                                ["mintGenesis", "~340k gas · ~0.00136 OG"],
                                ["mintFork", "~270k gas · ~0.00108 OG"],
                                ["mintCompose", "~580k gas median · ~0.00232 OG"],
                                ["payInference", "~165k gas · ~0.00066 OG"],
                                ["settleInference (3-deep)", "~165k gas · ~0.00066 OG"],
                                ["settleInference (5-deep)", "~225k gas · ~0.00090 OG"],
                                ["Indexer.upload (tiny anchor)", "~0.00003 OG"],
                                ["flagAgent (AlignmentAuditor)", "~75k gas · ~0.00030 OG"],
                            ]}
                        />

                        <h3 style={subhStyle}>Cascade math</h3>
                        <p style={pStyle}>
                            Each <code>payInference</code> attaches 0.0012 OG by default (base
                            0.001 + 10% protocol + 10% provider). Base splits:
                        </p>
                        <ul style={listStyle}>
                            <li>
                                <strong>50%</strong> to direct owner
                            </li>
                            <li>
                                <strong>25%</strong> to gen1 parents (split equally)
                            </li>
                            <li>
                                <strong>15%</strong> to gen2 (deduplicated)
                            </li>
                            <li>
                                <strong>7%</strong> to gen3+ (capped at depth 10)
                            </li>
                            <li>
                                <strong>3%</strong> to training contributors (or creator if none
                                registered)
                            </li>
                        </ul>
                        <p style={{ ...pStyle, color: "var(--ink-soft)", fontStyle: "italic" }}>
                            Undistributable share (deep gen, alignment slash, burned recipient)
                            consolidates into the protocol treasury.
                        </p>
                    </DocSection>

                    {/* Safety & limits — what protects the protocol when usage
                        scales. Important for third parties evaluating Mekar as
                        infrastructure: they need to understand the bounded
                        guarantees before wiring it into a product. */}
                    <DocSection
                        id="safety"
                        title="7. Safety & limits"
                        eyebrow="DoS resistance · gas bounds"
                    >
                        <p>
                            Mekar is designed so that hostile or accidental fan-out (mass
                            fork, mass compose, deep lineage) can't grief the protocol or
                            blow up the royalty walk. Three bounds enforce this on chain.
                        </p>

                        <h3 style={subhStyle}>Hard limits (contract-enforced)</h3>
                        <Table
                            rows={[
                                ["MAX_PARENTS (compose)", "8 — revert if parentIds.length < 2 or > 8"],
                                ["MAX_LINEAGE_DEPTH (royalty walk)", "10 generations — BFS stops here"],
                                ["MAX_GENERATION (mint)", "100 — circular lineage guard"],
                                ["MAX_LINEAGE_DEPTH (view query)", "50 — registry getAncestors cap"],
                            ]}
                        />

                        <h3 style={subhStyle}>What happens when…</h3>
                        <ul style={listStyle}>
                            <li>
                                <strong>10,000 forks descend from one agent:</strong> safe.
                                Registration is <code>O(1)</code> per fork (one{" "}
                                <code>_descendants.push</code>). Parent only earns royalty per
                                child inference, not in aggregate — no DoS on the parent.
                            </li>
                            <li>
                                <strong>Compose with 8 parents:</strong> safe. Gen-1 share
                                (25%) splits equally, integer-division dust sweeps to
                                treasury. Storage cost: 256 bytes for the parent array.
                            </li>
                            <li>
                                <strong>Deep lineage (gen 50+):</strong> royalty walk caps at
                                gen-10, treasury collects beyond. Gas remains bounded
                                regardless of chain depth.
                            </li>
                            <li>
                                <strong>Ancestor token burned:</strong> distribution catches
                                via try/catch (Q5 fix), share routes to treasury.
                            </li>
                            <li>
                                <strong>Alignment-slashed agent:</strong> share is reduced{" "}
                                <code>amount × alignmentHealth / 10000</code>; reduction goes
                                to treasury.
                            </li>
                        </ul>

                        <Note>
                            <strong>Known soft limit:</strong> the per-parent{" "}
                            <code>_descendants[]</code> array is unbounded. This is
                            read-only — never blocks transactions — but a hyper-popular
                            parent can make <code>getDescendants()</code> view calls
                            expensive. Indexer-based readers (option 3 above) sidestep this
                            entirely.
                        </Note>
                    </DocSection>

                    {/* Honest status */}
                    <DocSection
                        id="status"
                        title="8. What's real vs Phase 2"
                        eyebrow="Honesty audit"
                    >
                        <Status
                            live={[
                                "0G Chain (16661) — 5 contracts deployed + wired",
                                "INFT / ERC-7857 — mint/fork/compose flows tested + live",
                                "0G Storage Log — real Indexer.upload, anchored on Flow contract",
                                "AES-256 encryption at upload — SDK-direct, key returned to caller",
                                "AlignmentAuditor — score scales ancestor royalty (real economic effect)",
                                "Royalty cascade — atomic, wei-perfect math across 13 mainnet settlements",
                                "0G Compute Broker SDK — verified callable (see smoke-compute.ts)",
                            ]}
                            phase2={[
                                "0G Storage Specialized Flow tier — pointer plumbing in place, premium permanence next",
                                "Real TEE-attested inference via 0G Compute — broker reachable but no DSN services registered on 0G yet",
                                "Multi-auditor oracle network — currently single approved auditor",
                                "0G Storage KV writeback for mutable metadata — localStorage proxy ships today",
                                "Data Serving Network provider registration — operational layer, post-mainnet",
                            ]}
                        />
                    </DocSection>

                    {/* Full reference link */}
                    <section
                        id="more"
                        style={{
                            marginTop: 80,
                            padding: "32px 36px",
                            border: "1.5px solid var(--cocoa)",
                            background: "var(--bg-alt)",
                            borderRadius: "var(--radius)",
                            textAlign: "center",
                            scrollMarginTop: 100,
                        }}
                    >
                        <h2 style={{ fontSize: 28, marginBottom: 12 }}>
                            Need the <em>full reference?</em>
                        </h2>
                        <p style={{ color: "var(--ink-soft)", maxWidth: "56ch", margin: "0 auto 18px" }}>
                            Every contract method, event signature, error code, and the deeper
                            architecture lives in the markdown docs in the repo.
                        </p>
                        <div
                            style={{
                                display: "flex",
                                gap: 12,
                                justifyContent: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <Link
                                href={QUICKSTART_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="btn"
                            >
                                QUICKSTART.md <ExternalLink size={14} />
                            </Link>
                            <Link
                                href={GUIDE_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn--ghost"
                            >
                                INTEGRATION_GUIDE.md <ExternalLink size={14} />
                            </Link>
                            <Link
                                href={REPO}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn--ghost"
                            >
                                Repo on GitHub <ExternalLink size={14} />
                            </Link>
                        </div>
                    </section>
                    </div>
                </div>
            </main>
        </div>
    );
}

/* ─────────────── Building blocks ─────────────── */

function DocSection({
    id,
    title,
    eyebrow,
    children,
}: {
    id: string;
    title: string;
    eyebrow: string;
    children: React.ReactNode;
}) {
    // Locate this section in SECTIONS so we can render GitBook-style
    // prev/next links at the bottom. The order in SECTIONS is the
    // canonical reading order; "more" is the terminal section so it
    // has a prev but no next.
    const idx = SECTIONS.findIndex((s) => s.id === id);
    const prev = idx > 0 ? SECTIONS[idx - 1] : null;
    const next = idx >= 0 && idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;

    return (
        <section
            id={id}
            style={{
                marginBottom: 64,
                paddingTop: 32,
                borderTop: "1px solid var(--rule)",
                scrollMarginTop: 100,
            }}
        >
            <span className="eyebrow">{eyebrow}</span>
            <h2
                style={{
                    fontSize: "clamp(28px, 3.2vw, 38px)",
                    marginTop: 8,
                    marginBottom: 20,
                }}
            >
                {title}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {children}
            </div>

            {/* GitBook-style prev/next pager. Anchors jump within the
                single-page docs; the sidebar's IntersectionObserver
                keeps the active highlight in sync. */}
            {(prev || next) && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        marginTop: 32,
                        flexWrap: "wrap",
                    }}
                >
                    {prev ? (
                        <a href={`#${prev.id}`} style={pagerStyle}>
                            <span style={pagerHintStyle}>← Previous</span>
                            <span style={pagerLabelStyle}>{prev.label}</span>
                        </a>
                    ) : (
                        <span />
                    )}
                    {next ? (
                        <a
                            href={`#${next.id}`}
                            style={{ ...pagerStyle, textAlign: "right", alignItems: "flex-end" }}
                        >
                            <span style={pagerHintStyle}>Next →</span>
                            <span style={pagerLabelStyle}>{next.label}</span>
                        </a>
                    ) : (
                        <span />
                    )}
                </div>
            )}
        </section>
    );
}

const pagerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "12px 16px",
    border: "1px solid var(--rule)",
    borderRadius: 6,
    textDecoration: "none",
    background: "var(--surface)",
    minWidth: 160,
    transition: "border-color 120ms ease",
};
const pagerHintStyle: React.CSSProperties = {
    fontFamily: "var(--mono)",
    fontSize: 10,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--ink-soft)",
};
const pagerLabelStyle: React.CSSProperties = {
    fontFamily: "var(--display)",
    fontStyle: "italic",
    fontSize: 17,
    color: "var(--cocoa)",
};

// `Code` is imported from ./CodeBlock — a client component, because
// the copy-to-clipboard button needs browser APIs the server page
// can't run. See the import near the top of this file.

function Table({ rows }: { rows: [string, string][] }) {
    return (
        <div
            style={{
                border: "1px solid var(--rule)",
                borderRadius: 6,
                overflow: "hidden",
            }}
        >
            {rows.map(([label, value], i) => (
                <div
                    key={label}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(200px, 1fr) minmax(0, 2fr)",
                        borderTop: i === 0 ? "none" : "1px solid var(--rule)",
                        fontSize: 13,
                    }}
                >
                    <div
                        style={{
                            padding: "12px 16px",
                            color: "var(--ink)",
                            background: "var(--bg-alt)",
                            fontWeight: 500,
                        }}
                    >
                        {label}
                    </div>
                    <div
                        style={{
                            padding: "12px 16px",
                            fontFamily: "var(--mono)",
                            color: "var(--ink-soft)",
                            wordBreak: "break-all",
                        }}
                    >
                        {value}
                    </div>
                </div>
            ))}
        </div>
    );
}

function Note({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                background: "rgba(212,164,55,0.08)",
                border: "1px solid rgba(212,164,55,0.35)",
                borderRadius: 4,
                padding: "12px 14px",
                fontSize: 13,
                color: "var(--ink)",
                lineHeight: 1.6,
            }}
        >
            <strong style={{ color: "var(--cocoa)" }}>Note. </strong>
            {children}
        </div>
    );
}

function Status({ live, phase2 }: { live: string[]; phase2: string[] }) {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
            }}
        >
            <div
                style={{
                    border: "1.5px solid var(--cocoa)",
                    borderRadius: 6,
                    padding: 18,
                    background: "rgba(107,138,75,0.06)",
                }}
            >
                <div
                    style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--tea)",
                        fontWeight: 600,
                        marginBottom: 12,
                    }}
                >
                    ✓ Live + working
                </div>
                <ul style={{ ...listStyle, margin: 0 }}>
                    {live.map((item) => (
                        <li key={item} style={{ marginBottom: 6 }}>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
            <div
                style={{
                    border: "1.5px solid var(--rule)",
                    borderRadius: 6,
                    padding: 18,
                    background: "var(--bg-alt)",
                }}
            >
                <div
                    style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--ink-soft)",
                        fontWeight: 600,
                        marginBottom: 12,
                    }}
                >
                    🟡 Phase 2
                </div>
                <ul style={{ ...listStyle, margin: 0 }}>
                    {phase2.map((item) => (
                        <li key={item} style={{ marginBottom: 6 }}>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

const subhStyle: React.CSSProperties = {
    fontFamily: "var(--display)",
    fontStyle: "italic",
    fontSize: 22,
    marginTop: 18,
    marginBottom: 8,
    color: "var(--ink)",
};

const pStyle: React.CSSProperties = {
    color: "var(--ink)",
    fontSize: 14.5,
    lineHeight: 1.65,
    margin: 0,
};

const listStyle: React.CSSProperties = {
    color: "var(--ink)",
    fontSize: 14,
    lineHeight: 1.65,
    paddingLeft: 20,
};
