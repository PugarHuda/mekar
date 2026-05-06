import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
    title: "Manifesto",
    description:
        "A garden, not a graveyard. Why AI lineage should be structural, not optional.",
};

export default function ManifestoPage() {
    return (
        <div>
            <Header />
            <main className="manifesto-page" style={{ padding: "var(--pad-section) 0" }}>
                <div className="container" style={{ maxWidth: 920 }}>
                    <header style={{ marginBottom: 80, maxWidth: 720 }}>
                        <span className="eyebrow">/manifesto · v0.4</span>
                        <h1
                            style={{
                                fontSize: "clamp(56px, 7vw, 96px)",
                                marginTop: 16,
                                fontStyle: "italic",
                            }}
                        >
                            A garden,
                            <br />
                            not a graveyard.
                        </h1>
                        <p
                            className="lede"
                            style={{
                                marginTop: 24,
                                maxWidth: "62ch",
                            }}
                        >
                            Every AI model alive today stands on the shoulders of thousands. The
                            base model. The pretraining corpus. The fine-tuners. The annotators.
                            The merge-mongers on Hugging Face at 3am. None of them get paid when
                            the model serves a query. That ends here.
                        </p>
                    </header>

                    <article style={{ maxWidth: "62ch", lineHeight: 1.7, color: "var(--ink)" }}>
                        <h2 style={{ marginTop: 64 }}>I. The forgetting</h2>
                        <p>
                            The dominant pattern in AI is forgetting. A foundation model is
                            trained, published, then forked a thousand times. Each fork becomes a
                            product. Each product earns. None of the earnings flow back. The
                            lineage is hidden in <code>config.json</code> at best, lost at worst.
                        </p>
                        <p>
                            We treat models like software, but they are more like soil. They are
                            cultivated, not engineered. They carry the residue of every dataset
                            and every contributor. To pretend a fine-tune is a fresh creation is
                            to lie about where intelligence comes from.
                        </p>

                        <h2 style={{ marginTop: 56 }}>II. The proposal</h2>
                        <p>
                            Mekar makes lineage <em>structural.</em> Every agent is an INFT
                            (ERC-7857) whose mint requires declaring its parents. The protocol
                            refuses orphans. The lineage is public, immutable, and queryable.
                        </p>
                        <p>
                            When an agent serves an inference, the payment is split — recursively —
                            up the family tree. Your fork&apos;s fork&apos;s fork still pays you.
                            Forever. Without permission. Without trust.
                        </p>

                        <h2 style={{ marginTop: 56 }}>III. Why botany</h2>
                        <p>
                            Trees, not graphs. Blooms, not nodes. We chose botanical metaphors
                            because they&apos;re honest about what&apos;s happening: a model is a
                            bloom whose roots run deep, whose petals are the surface you touch,
                            and whose seeds become the next generation. Cut a bloom and the
                            lineage dies with it. Plant it in the right soil — Mekar&apos;s
                            lineage registry — and it pollinates forever.
                        </p>

                        <h2 style={{ marginTop: 56 }}>IV. Built on 0G</h2>
                        <p>
                            Mekar lives on the 0G modular stack.{" "}
                            <strong>0G Storage</strong> pins the model weights and training
                            cards. <strong>0G Compute</strong> serves inferences with verifiable
                            execution inside TEE. <strong>0G Chain</strong> settles royalty
                            splits atomically. <strong>Alignment Nodes</strong> audit the lineage
                            for drift. We didn&apos;t build a chain — we cultivated on someone
                            else&apos;s soil. That&apos;s the point.
                        </p>

                        <h2 style={{ marginTop: 56 }}>V. Royalty as oxygen</h2>
                        <p>
                            The royalty cascade isn&apos;t a tip jar. It&apos;s oxygen. It
                            changes who can afford to publish a model. A grad student who
                            fine-tunes a base model and gets it adopted earns from every
                            descendant, not just their own queries. An open-source data curator
                            who licenses their corpus into the protocol earns from every model
                            trained on it, in perpetuity.
                        </p>
                        <p>
                            We believe this fixes the perverse incentive at the heart of AI: the
                            race to obscure your sources, because attribution costs money. On
                            Mekar, attribution <em>is</em> money.
                        </p>

                        <h2 style={{ marginTop: 56 }}>VI. What we will not do</h2>
                        <ul style={{ paddingLeft: 24, marginTop: 16 }}>
                            <li style={{ marginBottom: 12 }}>
                                We will not gate-keep. Anyone can plant a bloom.
                            </li>
                            <li style={{ marginBottom: 12 }}>
                                We will not custody weights. Mekar holds hashes, not models.
                            </li>
                            <li style={{ marginBottom: 12 }}>
                                We will not invent a separate token. Royalties pay in $0G.
                            </li>
                            <li style={{ marginBottom: 12 }}>
                                We will not police output. The protocol is a registry, not a
                                regulator.
                            </li>
                        </ul>

                        <h2 style={{ marginTop: 56 }}>VII. The garden grows</h2>
                        <p>
                            This is v0.4, deployed on 0G Galileo testnet for the APAC hackathon.
                            The mainnet bloom comes when the seeds we&apos;ve planted prove
                            their roots.
                        </p>
                        <p
                            style={{
                                marginTop: 32,
                                fontFamily: "var(--display)",
                                fontStyle: "italic",
                                color: "var(--ink-soft)",
                                fontSize: 18,
                            }}
                        >
                            — Mekar Labs · Bandung &amp; Singapore · 2026
                        </p>
                    </article>

                    <div
                        style={{
                            marginTop: 64,
                            paddingTop: 40,
                            borderTop: "1px solid var(--rule)",
                            display: "flex",
                            gap: 16,
                            flexWrap: "wrap",
                        }}
                    >
                        <Link href="/mint" className="btn">
                            Plant your first bloom →
                        </Link>
                        <Link href="/explorer" className="btn btn--ghost">
                            Wander the garden
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
