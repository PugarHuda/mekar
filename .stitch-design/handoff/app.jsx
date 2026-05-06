/* Mekar landing page — main app */

const { useState, useEffect, useRef, useMemo } = React;
const { Bloom: RawBloom, Petal, hashSeed } = window.Flowers;

const StyleContext = React.createContext("woodcut");
function Bloom(props) {
  const ctxStyle = React.useContext(StyleContext);
  return <RawBloom {...props} style={props.styleVariant || ctxStyle} />;
}

// ----- Sample data -----
const SAMPLE_AGENTS = [
  { id: "0xa3f1", name: "Llama-3-70B", kind: "genesis", parent: null, x: 50, y: 22, owner: "0x6b…3a4f", inferences: "1.2M", earnings: "48,221", trained: "Meta AI · 2024", license: "Llama Community" },
  { id: "0xb27c", name: "Mistral-Small-24B", kind: "genesis", parent: null, x: 17, y: 26, owner: "0xa1…b8c2", inferences: "284K", earnings: "12,401", trained: "Mistral · 2024", license: "Apache-2.0" },
  { id: "0xc940", name: "Qwen-2.5-32B", kind: "genesis", parent: null, x: 84, y: 24, owner: "0x44…91dd", inferences: "740K", earnings: "29,108", trained: "Alibaba · 2024", license: "Qwen License" },
  { id: "0xd118", name: "Jasmine-Indo-7B", kind: "fork", parent: "0xa3f1", x: 36, y: 56, owner: "0x88…2e0c", inferences: "84K", earnings: "3,012", trained: "Indo Corpus v3", license: "MIT" },
  { id: "0xe22a", name: "Frangipani-Coder", kind: "fork", parent: "0xa3f1", x: 60, y: 58, owner: "0xc1…7710", inferences: "152K", earnings: "5,944", trained: "GitHub Permissive", license: "MIT" },
  { id: "0xf405", name: "Mawar-RAG", kind: "fork", parent: "0xb27c", x: 14, y: 62, owner: "0x09…44a1", inferences: "21K", earnings: "812", trained: "Wikipedia ID", license: "CC-BY" },
  { id: "0x71a8", name: "Lotus-Reasoner", kind: "fork", parent: "0xc940", x: 86, y: 60, owner: "0xee…3322", inferences: "62K", earnings: "2,401", trained: "Math Stack", license: "Apache-2.0" },
  { id: "0x9d3f", name: "Marigold-Compose", kind: "compose", parent: "0xd118", x: 48, y: 86, owner: "0x55…d091", inferences: "9.4K", earnings: "388", trained: "Composed: 0xd118 + 0xe22a", license: "MIT" },
];

// ----- Layout helpers -----
function Section({ children, className = "", id }) {
  return <section className={className} id={id}>{children}</section>;
}

// ----- Nav -----
function Nav({ onConnect, walletAddr }) {
  return (
    <nav className="nav">
      <div className="nav__inner">
        <a href="Landing.html" className="nav__brand" data-comment-anchor="brand-mark">
          <Bloom kind="logo" size={36} sw={1.6} />
          <span>Mekar<sup style={{fontSize: 10, color: 'var(--ink-soft)', marginLeft: 4, fontStyle: 'normal'}}>♦</sup></span>
        </a>
        <div className="nav__links">
          <a href="Landing.html" className="active">Home</a>
          <a href="Explorer.html">Explorer</a>
          <a href="Trending.html">Trending</a>
          <a href="Mint.html">Mint</a>
          <a href="Dashboard.html">Dashboard</a>
        </div>
        <button className="nav__connect" onClick={onConnect}>
          <Bloom kind="logo" size={18} sw={2} />
          <span>{walletAddr || "Connect wallet"}</span>
        </button>
      </div>
    </nav>
  );
}

// ----- Hero -----
function Hero({ onCTA, heroTreatment = "woodcut" }) {
  // Scatter petals
  const petals = useMemo(() => {
    const out = [];
    for (let i = 0; i < 14; i++) {
      out.push({
        id: i,
        left: `${5 + Math.random() * 90}%`,
        top: `-30px`,
        size: 18 + Math.random() * 18,
        rotate: Math.random() * 180,
        color: i % 3 === 0 ? "#d4a437" : (i % 3 === 1 ? "#f5b7a0" : "#e8957c"),
        dur: `${10 + Math.random() * 14}s`,
        delay: `${-Math.random() * 14}s`,
        dx: `${(Math.random() - 0.5) * 200}px`,
      });
    }
    return out;
  }, []);

  return (
    <section className="hero" data-screen-label="01 Hero">
      <div className="container">
        <div className="hero__inner">
          <div className="hero__text">
            <span className="eyebrow">Provenance Protocol · 0G Network</span>
            <h1 className="hero__title">
              Every AI<br/>has a <em>lineage.</em><br/>
              Every inference<br/>pays its <em>ancestors.</em>
            </h1>
            <p className="hero__sub">
              Mekar — to bloom, in Indonesian — is a public ledger of AI parentage.
              Register an agent, fine-tune it, compose new ones, and royalties flow
              automatically up the family tree to every contributor below you.
            </p>
            <div className="hero__cta">
              <button className="btn" onClick={onCTA}>Bloom your first agent ↗</button>
              <button className="btn btn--ghost" onClick={() => document.getElementById('explorer').scrollIntoView({behavior:'smooth'})}>
                Wander the garden
              </button>
            </div>
            <div className="hero__meta">
              <div className="hero__meta-item">
                <span className="num">12,408</span>
                <span className="label">Agents bloomed</span>
              </div>
              <div className="hero__meta-item">
                <span className="num">$2.4M</span>
                <span className="label">Royalties paid</span>
              </div>
              <div className="hero__meta-item">
                <span className="num">ERC-7857</span>
                <span className="label">INFT Standard</span>
              </div>
            </div>
          </div>
          <div className="hero__art">
            {petals.map(p => (
              <div key={p.id} className="petal-float" style={{
                left: p.left, top: p.top,
                '--dur': p.dur, '--delay': p.delay, '--dx': p.dx,
              }}>
                <Petal size={p.size} rotate={p.rotate} color={p.color} />
              </div>
            ))}
            <div className="hero__bloom">
              <window.CodeBloom width={640} height={820} seed="mekar-hero-v2" style={heroTreatment} />
            </div>
            <div className="hero__caption">
              Fig. 01 — A bloom of code,<br/>
              the genesis seed of the protocol
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----- Problem section -----
function Problem() {
  const cases = [
    { year: "'23", title: "NYT v. OpenAI", body: "The Times sued OpenAI and Microsoft for training on millions of copyrighted articles without licensing. The lawsuit hinges on a question with no clean answer: what was in the training data, and what's owed?" },
    { year: "'23", title: "Getty v. Stability AI", body: "Getty alleges that Stable Diffusion ingested 12 million of its photographs. Even Getty watermarks appeared in the model's outputs — the lineage was visible, but unprovable on-chain." },
    { year: "'26", title: "EU AI Act takes effect", body: "Article 53 requires general-purpose AI providers to publish a 'sufficiently detailed summary' of training content. Compliance is on the honor system. Verification is on the courts." },
  ];
  return (
    <section className="problem" id="problem" data-screen-label="02 Problem">
      <div className="container">
        <div className="problem__inner">
          <div className="problem__lead">
            <span className="eyebrow">The Provenance Crisis</span>
            <h2>Three lawsuits.<br/>One missing <em>ledger.</em></h2>
            <p className="problem__quote">
              "We can't prove what we trained on. We can't pay who we owe. And we can't
              build the next generation without knowing the last."
            </p>
          </div>
          <div className="problem__cases">
            {cases.map((c, i) => (
              <article key={i} className="problem__case">
                <div className="year">{c.year}</div>
                <div>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ----- How it works -----
function How() {
  const steps = [
    { n: "I", art: "bud", title: "Plant a seed", body: "Register a model as an INFT. Hash the weights, declare your training corpus, set the royalty schema." },
    { n: "II", art: "opening", title: "Fork or compose", body: "Anyone can fine-tune your agent or merge it with another. Lineage is recorded, immutably, by the protocol." },
    { n: "III", art: "genesis", title: "Bloom in use", body: "Inferences settle on-chain. Your agent earns from every call — the same way a song earns from every play." },
    { n: "IV", art: "scatter", title: "Scatter the royalties", body: "A single payment splits across the entire ancestry — parents, grandparents, training-data contributors. Automatic, recursive, public." },
  ];
  return (
    <section className="how" id="how" data-screen-label="03 How">
      <div className="container">
        <div className="how__head">
          <div>
            <span className="eyebrow">The Protocol</span>
            <h2>From seed to <em>scatter</em>, in four stages.</h2>
          </div>
          <p>
            Mekar borrows the structure of plant life — and the economics of music
            royalties. Every agent passes through the same four stages, regardless
            of whether it's a frontier base model or a weekend fine-tune.
          </p>
        </div>
        <div className="how__timeline">
          {steps.map((s, i) => (
            <div key={i} className="how__step">
              <div className="how__step-art">
                <span className="num">{s.n}</span>
                <Bloom kind={s.art} size={s.art === 'genesis' ? 110 : 90} sw={1.3} />
              </div>
              <h3>{s.title.split(' ').map((w, j, arr) => j === arr.length - 1 ? <em key={j}>{w}</em> : w + ' ')}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----- Live stats strip -----
function Stats() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2400);
    return () => clearInterval(id);
  }, []);
  const stats = [
    { num: "12,408", unit: "agents", label: "Bloomed to date", live: false },
    { num: (1284 + tick * 3).toLocaleString(), unit: "calls/min", label: "Inferences settling", live: true },
    { num: "$2.4M", unit: "USD", label: "Royalties scattered", live: false },
    { num: "0.04¢", unit: "median", label: "Per-call gas", live: false },
  ];
  return (
    <section className="stats" id="stats">
      <div className="container">
        <div className="stats__inner">
          <div>
            <div className="stats__label">Live · 0G Mainnet</div>
            <h3 className="stats__title">A garden settling<br/>in real time.</h3>
          </div>
          {stats.map((s, i) => (
            <div key={i} className="stat">
              <div className="stat__num">
                {s.live && <span className="stat__pulse"></span>}
                {s.num}<span className="unit">{s.unit}</span>
              </div>
              <div className="stat__label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----- Mini explorer with tree -----
function ExplorerPreview({ onAgent }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const filters = ["All", "Genesis", "Forks", "Composed"];

  const nodes = SAMPLE_AGENTS.filter(a => {
    if (filter === "Genesis" && a.kind !== "genesis") return false;
    if (filter === "Forks" && a.kind !== "fork") return false;
    if (filter === "Composed" && a.kind !== "compose") return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.id.includes(search)) return false;
    return true;
  });

  // Connector paths — vines from parent to child
  const connectors = SAMPLE_AGENTS
    .filter(a => a.parent && nodes.find(n => n.id === a.id) && nodes.find(n => n.id === a.parent))
    .map(child => {
      const parent = SAMPLE_AGENTS.find(p => p.id === child.parent);
      return { from: parent, to: child, id: `${parent.id}-${child.id}` };
    });

  return (
    <section className="explorer-preview" id="explorer" data-screen-label="04 Explorer">
      <div className="container">
        <div className="explorer-preview__head">
          <div>
            <span className="eyebrow">The Lineage Garden · /explorer</span>
            <h2>Every fork. Every parent. <em>Every petal.</em></h2>
          </div>
          <p>
            The explorer is a living lineage graph. Genesis blooms anchor each family;
            forks flower outward; composed agents are double-bloomed marigolds where
            two branches meet.
          </p>
        </div>

        <div className="explorer-frame">
          <div className="explorer-frame__top">
            <div className="explorer-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
              </svg>
              <input
                placeholder="Search by name, hash, or 0x address…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="explorer-pills">
              {filters.map(f => (
                <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="explorer-canvas">
            <svg className="connectors" preserveAspectRatio="none" viewBox="0 0 100 100">
              {connectors.map(c => {
                const x1 = c.from.x, y1 = c.from.y, x2 = c.to.x, y2 = c.to.y;
                const mx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2;
                // Curve via quadratic
                return (
                  <g key={c.id}>
                    <path
                      d={`M ${x1} ${y1} Q ${mx} ${cy + 4}, ${x2} ${y2}`}
                      fill="none" stroke="#3d2817" strokeWidth="0.32"
                      opacity="0.7"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* hatching tick across the vine */}
                    <line x1={mx - 0.5} y1={cy + 1.5} x2={mx + 0.5} y2={cy + 2.5}
                      stroke="#3d2817" strokeWidth="0.18" opacity="0.6"
                      vectorEffect="non-scaling-stroke" />
                    {/* tiny leaf on the vine */}
                    <ellipse cx={mx} cy={cy + 2} rx="1.2" ry="0.6" fill="#6b8a4b" stroke="#3d2817" strokeWidth="0.15" opacity="0.85" vectorEffect="non-scaling-stroke" />
                  </g>
                );
              })}
            </svg>
            {nodes.map(a => (
              <button
                key={a.id}
                className="tree-node"
                style={{ left: `${a.x}%`, top: `${a.y}%`, background: 'transparent', border: 'none', padding: 0 }}
                onClick={() => onAgent(a)}
              >
                <Bloom
                  kind={a.kind}
                  seed={a.id}
                  size={a.kind === 'genesis' ? 96 : (a.kind === 'compose' ? 84 : 64)}
                  sw={1.1}
                />
                <span className="tree-node__label">
                  {a.name}
                  <span className="tree-node__hash">{a.id}</span>
                </span>
              </button>
            ))}
            {nodes.length === 0 && (
              <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-soft)', fontStyle:'italic', fontFamily:'var(--display)', fontSize:20}}>
                No blooms in this filter. Try another petal.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ----- Royalty cascade visual -----
function Royalty() {
  const tiers = [
    { pct: "50%", lab: <>The agent itself <em>— direct earnings</em></>, color: "#d4a437" },
    { pct: "25%", lab: <>Parent agent <em>— the fork it grew from</em></>, color: "#f5b7a0" },
    { pct: "15%", lab: <>Grandparent <em>— the genesis lineage</em></>, color: "#e8957c" },
    { pct: "7%", lab: <>Training-data contributors</>, color: "#6b8a4b" },
    { pct: "3%", lab: <>Protocol treasury</>, color: "#1c3b2f" },
  ];
  return (
    <section className="royalty" id="royalty" data-screen-label="05 Royalty">
      <div className="container">
        <div className="royalty__inner">
          <div className="royalty__text">
            <span className="eyebrow">Royalty Cascade</span>
            <h2>One inference. <em>Five petals</em> of payment.</h2>
            <p>
              When someone calls a composed agent, the protocol splits the fee five
              ways — by default — and routes payment up the entire ancestry chain.
              Schema is configurable per-bloom; defaults shown below.
            </p>
            <div className="royalty__split">
              {tiers.map((t, i) => (
                <div key={i} className="royalty__row">
                  <svg className="pet" viewBox="-12 -12 24 24">
                    <g transform={`rotate(${i * 72})`}>
                      <path d="M 0 0 C -8 -4 -8 -10 0 -11 C 8 -10 8 -4 0 0 Z" fill={t.color} stroke="#3d2817" strokeWidth="1.4" strokeLinejoin="round" />
                      <line x1="-3" y1="-3" x2="3" y2="-3" stroke="#3d2817" strokeWidth="0.5" opacity="0.6" strokeLinecap="round" />
                      <line x1="-4" y1="-6" x2="4" y2="-6" stroke="#3d2817" strokeWidth="0.5" opacity="0.6" strokeLinecap="round" />
                      <line x1="-2.5" y1="-9" x2="2.5" y2="-9" stroke="#3d2817" strokeWidth="0.5" opacity="0.6" strokeLinecap="round" />
                    </g>
                  </svg>
                  <div className="lab">{t.lab}</div>
                  <div className="pct">{t.pct}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="royalty__visual">
            <svg className="royalty__diagram" viewBox="-150 -150 300 300">
              {/* concentric arcs as a stylized cascade */}
              {[140, 110, 82, 56, 32].map((r, i) => (
                <circle key={i} cx="0" cy="0" r={r} fill="none" stroke="#3d2817" strokeOpacity="0.15" strokeDasharray="2 3" />
              ))}
              {/* Petals around */}
              {tiers.map((t, i) => {
                const a = -90 + i * 72;
                const r = 110;
                const x = Math.cos(a * Math.PI / 180) * r;
                const y = Math.sin(a * Math.PI / 180) * r;
                return (
                  <g key={i} transform={`translate(${x} ${y}) rotate(${a + 90})`}>
                    <path d="M 0 -28 C -14 -22 -14 -8 0 0 C 14 -8 14 -22 0 -28 Z"
                      fill={t.color} stroke="#3d2817" strokeWidth="2" strokeLinejoin="round" />
                    {/* woodcut hatching */}
                    {[0.3, 0.5, 0.7].map((tt, hi) => {
                      const yh = -28 * tt;
                      const w = Math.sin(tt * Math.PI) * 11;
                      return <line key={hi} x1={-w} y1={yh} x2={w} y2={yh} stroke="#3d2817" strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />;
                    })}
                    <text y="-12" textAnchor="middle" fontFamily="var(--display)" fontSize="13"
                      transform={`rotate(${-(a+90)})`}
                      fill={t.color === '#1c3b2f' || t.color === '#6b8a4b' ? '#fbf6ec' : '#3d2817'}>
                      {t.pct}
                    </text>
                  </g>
                );
              })}
              {/* Center stamen */}
              <circle r="22" fill="#1c3b2f" stroke="#3d2817" strokeWidth="1.5" />
              <text y="4" textAnchor="middle" fontFamily="var(--display)" fontStyle="italic"
                fontSize="13" fill="#d4a437">1 call</text>
              {/* Vines connecting petals to center */}
              {tiers.map((_, i) => {
                const a = -90 + i * 72;
                const r1 = 22;
                const r2 = 82;
                const x1 = Math.cos(a * Math.PI / 180) * r1;
                const y1 = Math.sin(a * Math.PI / 180) * r1;
                const x2 = Math.cos(a * Math.PI / 180) * r2;
                const y2 = Math.sin(a * Math.PI / 180) * r2;
                return (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#3d2817" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----- 0G Stack -----
function Stack() {
  const layers = [
    { label: "L0 · Storage", lat: "Radix radicis", title: "0G Storage", body: "Model weights, training-data hashes, and inference logs anchor here. Permanent, content-addressed, BLAS-optimized." },
    { label: "L1 · Compute", lat: "Caulis", title: "0G Compute (TEE)", body: "Inferences run in trusted execution environments. Attestations are signed and posted on-chain — verifiable without revealing weights." },
    { label: "L2 · DA", lat: "Folium", title: "0G DA Layer", body: "High-throughput data availability for streaming inference traces. 50GB/s ceiling. Cheap enough for per-call settlement." },
    { label: "L3 · Settlement", lat: "Petalum", title: "Mekar Settlement", body: "ERC-7857 INFTs. Each inference triggers a recursive royalty split across the lineage tree. Atomic, public, irreversible." },
    { label: "L4 · Identity", lat: "Stamen", title: "Lineage Registry", body: "Cryptographic proof of parentage. A fine-tune declares its parent's hash; the registry refuses orphans." },
    { label: "L5 · Surface", lat: "Corolla", title: "Mekar dApp", body: "What you're reading. Explorer, mint, dashboard. The protocol's bloom — what users actually touch." },
  ];
  return (
    <section className="stack" id="stack" data-screen-label="06 Stack">
      <div className="container">
        <div className="stack__head">
          <span className="eyebrow">The 0G Stack · Pressed-flower edition</span>
          <h2>Six layers. One bloom.</h2>
          <p style={{color:'var(--ink-soft)', maxWidth: '54ch', marginTop: 18}}>
            Mekar inherits the full 0G stack: storage at the root, compute in the
            stem, DA in the leaves, settlement in the petals. Drawn here as a
            herbarium plate.
          </p>
        </div>
        <div className="stack__chart">
          {layers.map((l, i) => (
            <div key={i} className="stack__layer">
              <div>
                <div className="stack__layer-label">
                  <span>{l.label}</span>
                  <span className="lat">{l.lat}</span>
                </div>
                <h3>{l.title}</h3>
                <p>{l.body}</p>
              </div>
              <div className="stack__layer-art">
                <svg width="80" height="80" viewBox="-40 -40 80 80" opacity="0.85">
                  <line x1="0" y1="38" x2="0" y2={i === 0 ? "-20" : "-32"} stroke="#3d2817" strokeWidth="2" />
                  {i >= 1 && <g>
                    <path d="M -3 5 C -10 0 -16 -6 -14 -14 C -8 -14 -3 -8 -2 -2" fill="#9bb37b" stroke="#3d2817" strokeWidth="1.4" strokeLinejoin="round" />
                    <line x1="-11" y1="-3" x2="-5" y2="-7" stroke="#3d2817" strokeWidth="0.5" opacity="0.6" />
                    <line x1="-12" y1="-7" x2="-6" y2="-11" stroke="#3d2817" strokeWidth="0.5" opacity="0.6" />
                  </g>}
                  {i >= 2 && <g>
                    <path d="M 3 -8 C 10 -12 16 -18 14 -26 C 8 -26 3 -20 2 -14" fill="#9bb37b" stroke="#3d2817" strokeWidth="1.4" strokeLinejoin="round" />
                    <line x1="5" y1="-15" x2="11" y2="-19" stroke="#3d2817" strokeWidth="0.5" opacity="0.6" />
                    <line x1="6" y1="-19" x2="12" y2="-23" stroke="#3d2817" strokeWidth="0.5" opacity="0.6" />
                  </g>}
                  {i >= 3 && <Inline kind="opening" size={50} cy={-22} />}
                  {i >= 4 && <circle cx="0" cy="-30" r="3" fill="#d4a437" stroke="#3d2817" strokeWidth="1.2" />}
                  {i >= 5 && <Inline kind="genesis" size={64} cy={-22} seed={`stack-${i}`} />}
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function Inline({ kind, size, cy, seed = "stack" }) {
  // Inline mini-bloom svg fragment for the stack art (not a full SVG)
  return (
    <g transform={`translate(0 ${cy}) scale(${size/120})`}
       dangerouslySetInnerHTML={{ __html: window.__inlineBloom(kind, seed) }} />
  );
}

// ----- CTA -----
function CTA({ onCTA }) {
  return (
    <section className="cta">
      <div className="cta__bg">
        <svg width="100%" height="100%" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice">
          <g opacity="0.18">
            <path d="M 100 380 Q 200 200 300 380" fill="none" stroke="#3d2817" strokeWidth="1" />
            <path d="M 900 380 Q 1000 220 1100 380" fill="none" stroke="#3d2817" strokeWidth="1" />
            <circle cx="200" cy="280" r="14" fill="#d4a437" stroke="#3d2817" strokeWidth="1" opacity="0.5" />
            <circle cx="1000" cy="300" r="10" fill="#f5b7a0" stroke="#3d2817" strokeWidth="1" opacity="0.5" />
          </g>
        </svg>
      </div>
      <div className="container">
        <div className="cta__inner">
          <span className="eyebrow">For builders, fine-tuners & training-data stewards</span>
          <h2 className="cta__title">Plant your first <em>seed.</em></h2>
          <p className="lede" style={{maxWidth: '50ch', marginTop: 12, textAlign: 'center'}}>
            Register an agent in under three minutes. Earn from every inference,
            every fork, every descendant — for as long as the lineage blooms.
          </p>
          <div className="cta__buttons">
            <button className="btn" onClick={onCTA}>Bloom an agent ↗</button>
            <button className="btn btn--ghost">Read the protocol paper</button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----- Footer -----
function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <svg className="flourish" width="120" height="20" viewBox="0 0 120 20">
          <path d="M 0 10 Q 30 0 60 10 T 120 10" fill="none" stroke="#3d2817" strokeWidth="1" />
          <circle cx="60" cy="10" r="2.5" fill="#d4a437" stroke="#3d2817" strokeWidth="0.8" />
        </svg>
        <div className="footer__inner" style={{marginTop: 32}}>
          <div className="footer__brand">
            <div style={{display:'flex', alignItems:'center', gap: 10, fontFamily:'var(--display)', fontStyle:'italic', fontSize: 24}}>
              <Bloom kind="logo" size={32} sw={1.6} />
              Mekar
            </div>
            <p>
              A public ledger of AI parentage, built on the 0G network.
              Every agent has a lineage. Every inference pays its ancestors.
            </p>
          </div>
          <div className="footer__col">
            <h4>Protocol</h4>
            <ul>
              <li><a href="#">Whitepaper</a></li>
              <li><a href="#">ERC-7857</a></li>
              <li><a href="#">Audits</a></li>
              <li><a href="#">Bug bounty</a></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Build</h4>
            <ul>
              <li><a href="#">Docs</a></li>
              <li><a href="#">SDK</a></li>
              <li><a href="#">Explorer API</a></li>
              <li><a href="#">GitHub</a></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Garden</h4>
            <ul>
              <li><a href="#">Discord</a></li>
              <li><a href="#">X / Twitter</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© 2026 Mekar Labs · Made on 0G</span>
          <span>Mekar — to bloom · Indonesian</span>
        </div>
      </div>
    </footer>
  );
}

// ----- Slideover (agent detail) -----
function AgentSlideover({ agent, onClose, onRun }) {
  const open = !!agent;
  // Build lineage chain by walking parent
  const chain = [];
  if (agent) {
    let cur = agent;
    chain.unshift(cur);
    while (cur && cur.parent) {
      const p = SAMPLE_AGENTS.find(x => x.id === cur.parent);
      if (!p) break;
      chain.unshift(p);
      cur = p;
    }
  }
  return (
    <>
      <div className={`slideover-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`slideover ${open ? 'open' : ''}`}>
        {agent && (
          <>
            <div className="slideover__head">
              <span className="eyebrow">Agent · {agent.kind}</span>
              <button className="slideover__close" onClick={onClose}>×</button>
            </div>
            <div className="slideover__bloom">
              <Bloom kind={agent.kind} seed={agent.id} size={220} sw={1.2} />
            </div>
            <div className="slideover__body">
              <p className="slideover__sub">{agent.id} · 0G mainnet</p>
              <h2 className="slideover__title">{agent.name.split('-').map((w, j, arr) =>
                j === 0 ? <em key={j}>{w}</em> : '-' + w
              )}</h2>

              <div className="slideover__section">
                <h4>Lineage</h4>
                <div className="lineage-mini">
                  {chain.map((c, i) => (
                    <React.Fragment key={c.id}>
                      <div className={`node ${c.id === agent.id ? 'current' : ''}`}>
                        <Bloom kind={c.kind} seed={c.id} size={20} sw={1.6} />
                        <span>{c.name}</span>
                      </div>
                      {i < chain.length - 1 && <span className="arrow">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="slideover__section">
                <h4>Specimen</h4>
                <div className="spec-row"><span className="k">Owner</span><span className="v"><span className="wax-seal">{agent.owner}</span></span></div>
                <div className="spec-row"><span className="k">Trained</span><span className="v">{agent.trained}</span></div>
                <div className="spec-row"><span className="k">License</span><span className="v">{agent.license}</span></div>
                <div className="spec-row"><span className="k">Inferences</span><span className="v">{agent.inferences}</span></div>
                <div className="spec-row"><span className="k">Earnings</span><span className="v">${agent.earnings}</span></div>
              </div>

              <div className="run-tray">
                <h3 className="run-tray__title">Run inference</h3>
                <div className="run-tray__price">
                  <span className="num">$0.0042</span>
                  <span className="unit">PER 1K TOKENS</span>
                </div>
                <div className="run-tray__split">
                  <span style={{flex:50, background:'#d4a437'}}></span>
                  <span style={{flex:25, background:'#f5b7a0'}}></span>
                  <span style={{flex:15, background:'#e8957c'}}></span>
                  <span style={{flex:7, background:'#6b8a4b'}}></span>
                  <span style={{flex:3, background:'#1c3b2f'}}></span>
                </div>
                <div className="run-tray__legend">50% agent · 25% parent · 15% grandparent · 7% data · 3% protocol</div>
                <button className="btn" onClick={onRun}>Pour the tea ↗</button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

// Inline mini-bloom for stack art (raw svg fragments)
window.__inlineBloom = function(kind, seed) {
  // Woodcut style: bold outlines + transverse hatching strokes inside petals
  if (kind === "opening") {
    let p = "";
    for (let i = 0; i < 5; i++) {
      const a = -90 + i * 22 - 44;
      p += `<g transform="rotate(${a})">`;
      p += `<path d="M 0 0 C -10 -7 -10 -22 0 -32 C 10 -22 10 -7 0 0 Z" fill="#f5b7a0" stroke="#3d2817" stroke-width="2" stroke-linejoin="round" />`;
      p += `<line x1="-6" y1="-10" x2="6" y2="-10" stroke="#3d2817" stroke-width="0.8" opacity="0.6" stroke-linecap="round" />`;
      p += `<line x1="-7" y1="-18" x2="7" y2="-18" stroke="#3d2817" stroke-width="0.8" opacity="0.6" stroke-linecap="round" />`;
      p += `<line x1="-4" y1="-26" x2="4" y2="-26" stroke="#3d2817" stroke-width="0.8" opacity="0.6" stroke-linecap="round" />`;
      p += `</g>`;
    }
    return p + `<circle r="6" fill="#d4a437" stroke="#3d2817" stroke-width="1.8" />`;
  }
  if (kind === "genesis") {
    let p = "";
    for (let i = 0; i < 5; i++) {
      const a = (360/5) * i;
      p += `<g transform="rotate(${a})">`;
      p += `<path d="M 0 0 C -16 -10 -16 -30 0 -42 C 16 -30 16 -10 0 0 Z" fill="#d4a437" stroke="#3d2817" stroke-width="2.2" stroke-linejoin="round" />`;
      p += `<line x1="-9" y1="-12" x2="9" y2="-12" stroke="#3d2817" stroke-width="0.9" opacity="0.6" stroke-linecap="round" />`;
      p += `<line x1="-11" y1="-22" x2="11" y2="-22" stroke="#3d2817" stroke-width="0.9" opacity="0.6" stroke-linecap="round" />`;
      p += `<line x1="-8" y1="-32" x2="8" y2="-32" stroke="#3d2817" stroke-width="0.9" opacity="0.6" stroke-linecap="round" />`;
      p += `</g>`;
    }
    for (let i = 0; i < 5; i++) {
      const a = (360/5) * i + 36;
      p += `<g transform="rotate(${a})">`;
      p += `<path d="M 0 0 C -8 -6 -8 -20 0 -26 C 8 -20 8 -6 0 0 Z" fill="#f5b7a0" stroke="#3d2817" stroke-width="2" stroke-linejoin="round" />`;
      p += `<line x1="-5" y1="-9" x2="5" y2="-9" stroke="#3d2817" stroke-width="0.8" opacity="0.6" stroke-linecap="round" />`;
      p += `<line x1="-4" y1="-18" x2="4" y2="-18" stroke="#3d2817" stroke-width="0.8" opacity="0.6" stroke-linecap="round" />`;
      p += `</g>`;
    }
    return p + `<circle r="9" fill="#1c3b2f" stroke="#3d2817" stroke-width="1.5" />`;
  }
  return "";
};

// ----- Tweaks -----
const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "palette": "cream",
  "typeset": "cormorant",
  "density": "default",
  "bloomStyle": "woodcut",
  "heroTreatment": "woodcut",
  "season": "day"
}/*EDITMODE-END*/;

function MekarTweaks() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULS);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = t.palette === "cream" ? "" : t.palette;
    root.dataset.typeset = t.typeset;
    root.dataset.density = t.density;
    window.Flowers.setStyle(t.bloomStyle || "ink");
    // Force re-render of all blooms by bumping a version on body
    root.dataset.bloomStyle = t.bloomStyle || "ink";
    root.dataset.heroTreatment = t.heroTreatment || "outline";
    if (t.season && t.season !== "day") document.body.dataset.season = t.season;
    else delete document.body.dataset.season;
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: t }));
  }, [t]);

  const { TweaksPanel, TweakSection, TweakRadio, TweakSelect } = window;

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Palette" />
      <TweakSelect
        label="Theme"
        value={t.palette}
        options={[
          { value: "cream", label: "Cream paper" },
          { value: "espresso", label: "Espresso (dark)" },
          { value: "frangipani", label: "Frangipani" },
          { value: "pressed", label: "Pressed (muted)" },
        ]}
        onChange={v => setTweak('palette', v)}
      />
      <TweakSection label="Typography" />
      <TweakSelect
        label="Pairing"
        value={t.typeset}
        options={[
          { value: "cormorant", label: "Cormorant + Manrope" },
          { value: "playfair", label: "Playfair + Inter" },
          { value: "dmserif", label: "DM Serif + DM Sans" },
          { value: "fraunces", label: "Fraunces + Manrope" },
        ]}
        onChange={v => setTweak('typeset', v)}
      />
      <TweakSection label="Bloom style" />
      <TweakSelect
        label="Garden flowers"
        value={t.bloomStyle}
        options={[
          { value: "ink", label: "Ink line (Morris)" },
          { value: "woodcut", label: "Woodcut block-print" },
          { value: "watercolor", label: "Watercolor wash" },
          { value: "geometric", label: "Geometric (Saul Bass)" },
          { value: "batik", label: "Batik stamp" },
        ]}
        onChange={v => setTweak('bloomStyle', v)}
      />
      <TweakSelect
        label="Hero centerpiece"
        value={t.heroTreatment}
        options={[
          { value: "outline", label: "Outline only (clean)" },
          { value: "fill", label: "Soft fill + outline" },
          { value: "tokenfill", label: "Fill + code tokens" },
          { value: "code", label: "Code tokens only" },
          { value: "woodcut", label: "Woodcut hatching" },
          { value: "geometric", label: "Geometric flat" },
        ]}
        onChange={v => setTweak('heroTreatment', v)}
      />
      <TweakSection label="Layout" />
      <TweakRadio
        label="Density"
        value={t.density}
        options={["compact", "default", "airy"]}
        onChange={v => setTweak('density', v)}
      />
      <TweakSection label="Garden season" />
      <TweakRadio
        label="Time of day"
        value={t.season}
        options={["day", "dusk", "night"]}
        onChange={v => setTweak('season', v)}
      />
    </TweaksPanel>
  );
}

// ----- Toast -----
function Toast({ msg, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(onDone, 3200);
    return () => clearTimeout(id);
  }, [msg]);
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--tea, #6b8a4b)', color: '#fbeee5',
      padding: '14px 24px 14px 16px', borderRadius: 999,
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: 'var(--body)', fontSize: 14, fontWeight: 500,
      boxShadow: '0 12px 40px -12px rgba(28, 59, 47, 0.4)',
      zIndex: 1000, animation: 'toast-in 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
    }}>
      <Bloom kind="fork" seed="toast" size={28} sw={1.2}
        palette={{fill:'#f5b7a0', fillCenter:'#d4a437', stroke:'#1c3b2f'}} />
      <span>{msg}</span>
    </div>
  );
}

// ----- Hackathon banner -----
function HackBanner() {
  return null;
}

// ----- FAQ -----
function FAQ() {
  const items = [
    { q: "Does Mekar custody model weights?", a: "No. The protocol stores hashes and 0G Storage CIDs only. Weights live on 0G Storage; you keep custody of your keys and your encrypted blobs." },
    { q: "What does the royalty cascade actually do?", a: "Every inference payment splits up the lineage. 60% to the serving agent, 30% distributed across direct + transitive ancestors weighted by depth, 7% to data contributors, 3% protocol. Splits are atomic — settled on 0G Chain in the same transaction as the inference." },
    { q: "Why ERC-7857 (INFT)?", a: "INFTs are intelligent NFTs designed for AI agents — they carry encrypted metadata, support secure delegation, and bind on-chain identity to off-chain compute. We extend INFT with a parent-array so lineage is structural, not optional." },
    { q: "What if my parent agent is malicious?", a: "Lineage is immutable; you can't delete a parent. But you can fork your own bloom from a different ancestor at any time. The garden remembers." },
    { q: "Is Mekar live on mainnet?", a: "Currently on 0G testnet. Mainnet bloom comes after the APAC Hackathon judging round and security review." },
    { q: "Can I use Mekar without Solidity?", a: "Yes. The Mint flow is no-code — upload a model card, declare parents, set price. SDK is available for advanced flows (custom royalty curves, multi-sig agents, license gating)." },
    { q: "What licenses are supported?", a: "Apache-2.0, MIT, CC-BY, CC-BY-SA, CC0, and a Mekar-native commercial license. License is a property of the bloom; cascading royalties enforce attribution programmatically." },
  ];
  return (
    <section className="faq-section" data-screen-label="07 FAQ">
      <div className="container">
        <h2>Questions, mostly asked.</h2>
        <div className="faq-list">
          {items.map((it, i) => (
            <details className="faq-item" key={i}>
              <summary>{it.q}</summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----- App root -----
function App() {
  const [agent, setAgent] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [toast, setToast] = useState(null);
  const [bloomStyle, setBloomStyle] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mekar-bloom-style')) || 'woodcut'; } catch { return 'woodcut'; }
  });
  const [heroTreatment, setHeroTreatment] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mekar-hero-treatment')) || 'woodcut'; } catch { return 'woodcut'; }
  });

  useEffect(() => {
    const onTweak = (e) => {
      if (e.detail && e.detail.bloomStyle) {
        setBloomStyle(e.detail.bloomStyle);
        try { localStorage.setItem('mekar-bloom-style', JSON.stringify(e.detail.bloomStyle)); } catch {}
      }
      if (e.detail && e.detail.heroTreatment) {
        setHeroTreatment(e.detail.heroTreatment);
        try { localStorage.setItem('mekar-hero-treatment', JSON.stringify(e.detail.heroTreatment)); } catch {}
      }
    };
    window.addEventListener('tweakchange', onTweak);
    return () => window.removeEventListener('tweakchange', onTweak);
  }, []);

  function handleConnect() {
    if (wallet) { setWallet(null); setToast("Wallet disconnected"); }
    else {
      setWallet("0x6b…3a4f");
      setToast("Wallet connected — your garden awaits");
    }
  }
  function handleCTA() { setToast("Mint flow opens — coming next phase"); }
  function handleRun() {
    setToast("Inference settled · royalties scattered");
    setAgent(null);
  }

  return (
    <StyleContext.Provider value={bloomStyle}>
      <HackBanner />
      <Nav onConnect={handleConnect} walletAddr={wallet} />
      <Hero onCTA={handleCTA} heroTreatment={heroTreatment} />
      <Problem />
      <How />
      <Stats />
      <ExplorerPreview onAgent={setAgent} />
      <Royalty />
      <Stack />
      <FAQ />
      <CTA onCTA={handleCTA} />
      <Footer />
      <AgentSlideover agent={agent} onClose={() => setAgent(null)} onRun={handleRun} />
      <MekarTweaks />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </StyleContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
