"use client";

import Link from "next/link";
import { BloomLogo } from "@/components/Bloom";
import { CONTRACT_ADDRESSES, isDeployed } from "@/contracts/addresses";
import { ACTIVE_CHAIN, explorerLink } from "@/lib/chains";
import { Github, ExternalLink, BookOpen } from "lucide-react";

const REPO = "https://github.com/PugarHuda/mekar";

export function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="footer">
            <div className="container">
                {/* Hand-drawn flourish — botanical separator */}
                <svg
                    className="flourish"
                    width="120"
                    height="20"
                    viewBox="0 0 120 20"
                    aria-hidden="true"
                    style={{ display: "block", margin: "0 auto 32px" }}
                >
                    <path
                        d="M 0 10 Q 30 0 60 10 T 120 10"
                        fill="none"
                        stroke="var(--cocoa)"
                        strokeWidth="1"
                    />
                    <circle
                        cx="60"
                        cy="10"
                        r="2.5"
                        fill="var(--gold)"
                        stroke="var(--cocoa)"
                        strokeWidth="0.8"
                    />
                </svg>

                <div
                    className="footer__inner"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr",
                        gap: 40,
                    }}
                >
                    {/* Brand block */}
                    <div className="footer__brand">
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                fontFamily: "var(--display)",
                                fontStyle: "italic",
                                fontSize: 28,
                            }}
                        >
                            <BloomLogo size={36} sw={1.6} />
                            Mekar
                        </div>
                        <p
                            style={{
                                color: "var(--ink-soft)",
                                fontSize: 13,
                                maxWidth: "38ch",
                                margin: "12px 0 0",
                                lineHeight: 1.65,
                            }}
                        >
                            A public ledger of AI parentage, built on the 0G network. Every agent
                            has a lineage. Every inference pays its ancestors.
                        </p>

                        {/* Live status pill */}
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                marginTop: 18,
                                padding: "5px 11px 5px 9px",
                                border: "1px solid var(--rule)",
                                borderRadius: 999,
                                fontFamily: "var(--mono)",
                                fontSize: 11,
                                letterSpacing: "0.06em",
                                color: "var(--ink-soft)",
                                background: "var(--surface)",
                            }}
                        >
                            <span
                                aria-hidden
                                style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    background: "var(--tea)",
                                    boxShadow: "0 0 0 3px rgba(107, 138, 75, 0.18)",
                                }}
                            />
                            Live on {ACTIVE_CHAIN.name} · chain {ACTIVE_CHAIN.id}
                        </div>
                    </div>

                    {/* Protocol */}
                    <FooterCol title="Protocol">
                        <FLink href="/manifesto" internal>
                            Manifesto
                        </FLink>
                        <FLink href={`${REPO}/tree/main/packages/contracts`} external>
                            Contracts
                        </FLink>
                        <FLink href={`${REPO}/blob/main/README.md`} external>
                            Whitepaper
                        </FLink>
                        <FLink
                            href="https://eips.ethereum.org/EIPS/eip-7857"
                            external
                        >
                            ERC-7857
                        </FLink>
                    </FooterCol>

                    {/* Build */}
                    <FooterCol title="Build">
                        <FLink href="/explorer" internal>
                            Explorer
                        </FLink>
                        <FLink href="/mint" internal>
                            Mint an agent
                        </FLink>
                        <FLink href="/dashboard" internal>
                            Dashboard
                        </FLink>
                        <FLink href={REPO} external>
                            <Github size={11} style={{ marginRight: 4 }} />
                            GitHub
                        </FLink>
                    </FooterCol>

                    {/* Network — explorer link tracks ACTIVE_CHAIN so it
                        points at chainscan.0g.ai on mainnet, the Galileo
                        explorer on testnet. */}
                    <FooterCol title="Network">
                        <FLink
                            href={ACTIVE_CHAIN.blockExplorers?.default.url ?? "https://chainscan.0g.ai"}
                            external
                        >
                            {ACTIVE_CHAIN.testnet ? "0G Galileo Explorer" : "0G Explorer"}
                        </FLink>
                        <FLink href="https://faucet.0g.ai" external>
                            Testnet faucet
                        </FLink>
                        <FLink href="https://docs.0g.ai" external>
                            <BookOpen size={11} style={{ marginRight: 4 }} />
                            0G Docs
                        </FLink>
                        {isDeployed && (
                            <FLink
                                href={explorerLink(CONTRACT_ADDRESSES.AgentINFT, "address")}
                                external
                                title="AgentINFT on 0G chainscan"
                            >
                                INFT contract
                            </FLink>
                        )}
                    </FooterCol>
                </div>

                <div
                    className="footer__bottom"
                    style={{
                        marginTop: 60,
                        paddingTop: 24,
                        borderTop: "1px solid var(--rule-soft)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: "var(--ink-soft)",
                        letterSpacing: "0.04em",
                    }}
                >
                    <span>© {year} Mekar Labs · Made on 0G</span>
                    <span
                        style={{
                            fontFamily: "var(--display)",
                            fontStyle: "italic",
                            fontSize: 13,
                            color: "var(--ink)",
                        }}
                    >
                        <em>Mekar</em> — to bloom, in Indonesian
                    </span>
                </div>
            </div>
        </footer>
    );
}

function FooterCol({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="footer__col">
            <h4
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                    fontWeight: 500,
                    marginBottom: 14,
                }}
            >
                {title}
            </h4>
            <ul
                style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                }}
            >
                {children}
            </ul>
        </div>
    );
}

function FLink({
    href,
    children,
    external = false,
    internal = false,
    title,
}: {
    href: string;
    children: React.ReactNode;
    external?: boolean;
    internal?: boolean;
    title?: string;
}) {
    const linkStyle: React.CSSProperties = {
        fontSize: 14,
        color: "var(--ink)",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        transition: "color 0.18s",
    };
    const content = (
        <>
            {children}
            {external && <ExternalLink size={11} style={{ opacity: 0.55 }} />}
        </>
    );
    return (
        <li>
            {internal ? (
                <Link href={href} style={linkStyle} title={title}>
                    {content}
                </Link>
            ) : (
                <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    style={linkStyle}
                    title={title}
                >
                    {content}
                </a>
            )}
        </li>
    );
}
