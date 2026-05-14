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
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
    title: "Docs — Build on Mekar",
    description:
        "Developer quickstart for integrating Mekar's royalty cascade into your own product. Express bots, Discord bots, indexers, mobile apps.",
};

const REPO = "https://github.com/PugarHuda/mekar";
const QUICKSTART_URL = `${REPO}/blob/main/docs/QUICKSTART.md`;
const GUIDE_URL = `${REPO}/blob/main/docs/INTEGRATION_GUIDE.md`;

export default function DocsPage() {
    return (
        <div>
            <Header />
            <main className="docs-page" style={{ padding: "var(--pad-section) 0" }}>
                <div className="container">
                    <header style={{ marginBottom: 56 }}>
                        <span className="eyebrow">/docs</span>
                        <h1
                            style={{
                                fontSize: "clamp(44px, 5.6vw, 72px)",
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
                                fontSize: 17,
                            }}
                        >
                            Mekar is on-chain royalty infrastructure on 0G — not a closed product. Pay
                            an agent from a Discord bot, index the cascade for analytics, mint INFTs
                            from your own UI. Same on-chain contract, same atomic royalty distribution.
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
                    <DocSection id="addresses" title="Contract addresses" eyebrow="Galileo testnet · chain 16602">
                        <Table
                            rows={[
                                ["AgentINFT (ERC-7857)", "0x2B429feAe5d2732fF126F964D5786C0c51A844f3"],
                                ["MekarRegistry", "0x5466826BdFcc7f26F03D1E43bAA40E43d7700f92"],
                                ["RoyaltyVault", "0x49eCE891AeA76aad967A83B53DC160328036BABc"],
                                ["AlignmentAuditor", "0x4C399b1f2DBD4028d39E21A512E90930375910eB"],
                                [
                                    "TrainingDataRegistry",
                                    "0xdBE4397f3e4CCafDA7bfbeD264448577249513e8",
                                ],
                            ]}
                        />
                        <Note>
                            Mainnet (Aristotle, chain 16661) deploy uses the same code path —
                            <code> ACTIVE_CHAIN </code>switches via the
                            <code> NEXT_PUBLIC_NETWORK </code>env var. See{" "}
                            <Link
                                href={`${REPO}/blob/main/docs/DEPLOY_GUIDE.md`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                DEPLOY_GUIDE.md
                            </Link>{" "}
                            for the full mainnet checklist.
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
                            cascade. Need ~0.002 OG on Galileo (
                            <Link
                                href="https://faucet.0g.ai"
                                target="_blank"
                                rel="noreferrer"
                            >
                                faucet
                            </Link>
                            ).
                        </p>
                        <Code language="bash">{`RPC=https://evmrpc-testnet.0g.ai
VAULT=0x49eCE891AeA76aad967A83B53DC160328036BABc

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

const VAULT = "0x49eCE891AeA76aad967A83B53DC160328036BABc" as const;
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
                            <code> useUserStats </code>hook — public Galileo RPC tolerates ~5
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
  "https://evmrpc-testnet.0g.ai",
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
                        eyebrow="Galileo · gotchas"
                    >
                        <p>
                            Three patterns we've hardened through actual development pain.
                        </p>

                        <h3 style={subhStyle}>
                            <code>cast send</code> hangs on receipt fetch
                        </h3>
                        <p style={pStyle}>
                            Galileo&apos;s RPC drops receipt fetches occasionally. Use{" "}
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
                        <p>Approximate at 4 gwei on Galileo:</p>
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

                    {/* Honest status */}
                    <DocSection
                        id="status"
                        title="7. What's real vs Phase 2"
                        eyebrow="Honesty audit"
                    >
                        <Status
                            live={[
                                "0G Chain (16602) — 5 contracts deployed + wired",
                                "INFT / ERC-7857 — mint/fork/compose flows tested + live",
                                "0G Storage Log — real Indexer.upload, anchored on Flow contract",
                                "AES-256 encryption at upload — SDK-direct, key returned to caller",
                                "AlignmentAuditor — score scales ancestor royalty (real economic effect)",
                                "Royalty cascade — atomic, wei-perfect math across 14+ settlements",
                                "0G Compute Broker SDK — verified callable (see smoke-compute.ts)",
                            ]}
                            phase2={[
                                "0G Storage Specialized Flow tier — pointer plumbing in place, premium permanence next",
                                "Real TEE-attested inference via 0G Compute — broker reachable but no DSN services registered on testnet yet",
                                "Multi-auditor oracle network — currently single approved auditor",
                                "0G Storage KV writeback for mutable metadata — localStorage proxy ships today",
                                "Data Serving Network provider registration — operational layer, post-mainnet",
                            ]}
                        />
                    </DocSection>

                    {/* Full reference link */}
                    <section
                        style={{
                            marginTop: 80,
                            padding: "32px 36px",
                            border: "1.5px solid var(--cocoa)",
                            background: "var(--bg-alt)",
                            borderRadius: "var(--radius)",
                            textAlign: "center",
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
            </main>
            <Footer />
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
        </section>
    );
}

function Code({ children, language }: { children: string; language?: string }) {
    return (
        <pre
            style={{
                background: "var(--bg-alt)",
                border: "1px solid var(--rule)",
                borderRadius: 6,
                padding: "16px 18px",
                overflowX: "auto",
                fontFamily: "var(--mono)",
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "var(--ink)",
            }}
        >
            {language && (
                <div
                    style={{
                        fontSize: 10,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--ink-soft)",
                        marginBottom: 8,
                    }}
                >
                    {language}
                </div>
            )}
            <code style={{ fontFamily: "inherit", whiteSpace: "pre" }}>{children}</code>
        </pre>
    );
}

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
