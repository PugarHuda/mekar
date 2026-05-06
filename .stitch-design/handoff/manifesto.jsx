// Manifesto page — long-form narrative about Mekar's idea.
function ManifestoPage() {
  return (
    <>
      <window.MekarNav />
      <main className="manifesto-page">
        <div className="container">
          <header className="manifesto-page__head">
            <span className="eyebrow">/manifesto · v0.4</span>
            <h1>A garden, not a graveyard.</h1>
            <p className="manifesto-page__lede">
              Every AI model alive today stands on the shoulders of thousands. The base
              model. The pretraining corpus. The fine-tuners. The annotators. The
              merge-mongers on huggingface at 3am. None of them get paid when the
              model serves a query. That ends here.
            </p>
          </header>

          <article className="manifesto-page__body">
            <h2>I. The forgetting</h2>
            <p>The dominant pattern in AI is forgetting. A foundation model is trained,
            published, then forked a thousand times. Each fork becomes a product. Each
            product earns. None of the earnings flow back. The lineage is hidden in
            <code>config.json</code> at best, lost at worst.</p>

            <p>We treat models like software, but they are more like soil. They are
            cultivated, not engineered. They carry the residue of every dataset and
            every contributor. To pretend a fine-tune is a fresh creation is to lie
            about where intelligence comes from.</p>

            <h2>II. The proposal</h2>
            <p>Mekar makes lineage <em>structural</em>. Every agent is an INFT
            (ERC-7857) whose mint requires declaring its parents. The protocol
            refuses orphans. The lineage is public, immutable, and queryable.</p>

            <p>When an agent serves an inference, the payment is split — recursively —
            up the family tree. Your fork's fork's fork still pays you. Forever.
            Without permission. Without trust.</p>

            <h2>III. Why botany</h2>
            <p>Trees, not graphs. Blooms, not nodes. We chose botanical metaphors
            because they're honest about what's happening: a model is a bloom whose
            roots run deep, whose petals are the surface you touch, and whose
            seeds become the next generation. Cut a bloom and the lineage dies
            with it. Plant it in the right soil — Mekar's lineage registry — and
            it pollinates forever.</p>

            <h2>IV. Built on 0G</h2>
            <p>Mekar lives on the 0G modular stack. <strong>0G Storage</strong> pins
            the model weights and training cards. <strong>0G Compute</strong> serves
            inferences with verifiable execution. <strong>0G DA</strong> publishes
            the lineage events. <strong>0G Chain</strong> settles royalty splits
            atomically. We didn't build a chain — we cultivated on someone else's
            soil. That's the point.</p>

            <h2>V. Royalty as oxygen</h2>
            <p>The royalty cascade isn't a tip jar. It's oxygen. It changes who can
            afford to publish a model. A grad student who fine-tunes a base model
            and gets it adopted earns from every descendant, not just their own
            queries. An open-source data curator who licenses their corpus into
            the protocol earns from every model trained on it, in perpetuity.</p>

            <p>We believe this fixes the perverse incentive at the heart of AI:
            the race to obscure your sources, because attribution costs money.
            On Mekar, attribution <em>is</em> money.</p>

            <h2>VI. What we will not do</h2>
            <ul>
              <li>We will not gate-keep. Anyone can plant a bloom.</li>
              <li>We will not custody weights. Mekar holds hashes, not models.</li>
              <li>We will not invent a token. Royalties pay in 0G + USDC.</li>
              <li>We will not police output. The protocol is a registry, not a regulator.</li>
            </ul>

            <h2>VII. The garden grows</h2>
            <p>This is v0.4, deployed on 0G testnet for the APAC hackathon. The
            mainnet bloom comes when the seeds we've planted prove their roots.</p>

            <p className="manifesto-page__sign">— Mekar Labs · Bandung &amp; Singapore · 2026</p>
          </article>

          <div className="manifesto-page__cta">
            <a className="btn btn--primary" href="Mint.html">Plant your first bloom →</a>
            <a className="btn btn--ghost" href="Explorer.html">Wander the garden</a>
          </div>
        </div>
      </main>
      <window.MekarFooter />
      <window.MekarTweaksPanel />
    </>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<ManifestoPage />);
