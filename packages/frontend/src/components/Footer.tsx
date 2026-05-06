"use client";

import Link from "next/link";
import { BloomLogo } from "@/components/Bloom";

export function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer__grid">
                    <div className="footer__brand">
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                fontFamily: "var(--display)",
                                fontStyle: "italic",
                                fontSize: 24,
                            }}
                        >
                            <BloomLogo size={32} sw={1.6} />
                            Mekar
                        </div>
                        <p>
                            A public ledger of AI parentage, built on the 0G network.
                            <br />
                            Every agent has a lineage. Every inference pays its ancestors.
                        </p>
                    </div>

                    <div className="footer__col">
                        <h4>Protocol</h4>
                        <ul>
                            <li>
                                <Link href="/manifesto">Manifesto</Link>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/PugarHuda/mekar"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    ERC-7857
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/PugarHuda/mekar/tree/main/packages/contracts"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Contracts
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="footer__col">
                        <h4>Network</h4>
                        <ul>
                            <li>
                                <a
                                    href="https://chainscan-galileo.0g.ai"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    0G Galileo
                                </a>
                            </li>
                            <li>
                                <a href="https://faucet.0g.ai" target="_blank" rel="noreferrer">
                                    Testnet faucet
                                </a>
                            </li>
                            <li>
                                <a href="https://docs.0g.ai" target="_blank" rel="noreferrer">
                                    0G docs
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="footer__col">
                        <h4>Build</h4>
                        <ul>
                            <li>
                                <a
                                    href="https://github.com/PugarHuda/mekar"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    GitHub
                                </a>
                            </li>
                            <li>
                                <Link href="/explorer">Explorer</Link>
                            </li>
                            <li>
                                <Link href="/mint">Mint an agent</Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer__bottom">
                    <span>© 2026 Mekar Labs · Bandung &amp; Singapore</span>
                    <span>v0.4.2 · ERC-7857 / 0G Galileo</span>
                </div>
            </div>
        </footer>
    );
}
