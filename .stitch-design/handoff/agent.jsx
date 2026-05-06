// Agent profile page — single bloom in detail.
const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;

const AGENT_DB = {
  "0xa3f1": { id:"0xa3f1", name:"Llama-3-70B", kind:"genesis", parent:null, owner:"0x6b…3a4f", inferences:1240000, earnings:48221, trained:"Meta · 2024", license:"Llama Community", desc:"Foundational large language model — root of many forks. Trained on a curated mixture of web, books, and code.", params:"70B", context:"8K", modality:"text", price:0.018 },
  "0xb27c": { id:"0xb27c", name:"Mistral-Small-24B", kind:"genesis", parent:null, owner:"0xa1…b8c2", inferences:284000, earnings:12401, trained:"Mistral · 2024", license:"Apache-2.0", desc:"Compact instruction-tuned base model with strong instruction-following.", params:"24B", context:"32K", modality:"text", price:0.011 },
  "0xc940": { id:"0xc940", name:"Qwen-2.5-32B", kind:"genesis", parent:null, owner:"0x44…91dd", inferences:740000, earnings:29108, trained:"Alibaba · 2024", license:"Qwen License", desc:"Multilingual base, strong on East-Asian corpora.", params:"32B", context:"128K", modality:"text", price:0.014 },
  "0xd118": { id:"0xd118", name:"Jasmine-Indo-7B", kind:"fork", parent:"0xa3f1", owner:"0x88…2e0c", inferences:84000, earnings:3012, trained:"Indo Corpus v3", license:"MIT", desc:"Indonesian-language fine-tune of Llama-3-70B distilled to 7B.", params:"7B", context:"8K", modality:"text", price:0.004 },
  "0xe22a": { id:"0xe22a", name:"Frangipani-Coder", kind:"fork", parent:"0xa3f1", owner:"0xc1…7710", inferences:152000, earnings:5944, trained:"GitHub Permissive", license:"MIT", desc:"Code-completion specialist trained on permissive-license repositories.", params:"13B", context:"16K", modality:"text", price:0.006 },
  "0xf405": { id:"0xf405", name:"Mawar-RAG", kind:"fork", parent:"0xb27c", owner:"0x09…44a1", inferences:21000, earnings:812, trained:"Wikipedia ID", license:"CC-BY", desc:"Retrieval-augmented question answering over Indonesian Wikipedia.", params:"24B", context:"32K", modality:"text", price:0.012 },
  "0x71a8": { id:"0x71a8", name:"Lotus-Reasoner", kind:"fork", parent:"0xc940", owner:"0xee…3322", inferences:62000, earnings:2401, trained:"Math Stack", license:"Apache-2.0", desc:"Chain-of-thought reasoning fine-tune with math + logic emphasis.", params:"32B", context:"128K", modality:"text", price:0.015 },
  "0xab90": { id:"0xab90", name:"Kenanga-Med", kind:"fork", parent:"0xc940", owner:"0x33…aa11", inferences:18000, earnings:740, trained:"PubMed Open", license:"CC-BY", desc:"Medical literature fine-tune. NOT for clinical use.", params:"32B", context:"128K", modality:"text", price:0.014 },
  "0x9d3f": { id:"0x9d3f", name:"Marigold-Compose", kind:"compose", parent:"0xd118", owner:"0x55…d091", inferences:9400, earnings:388, trained:"Composed: 0xd118 + 0xe22a", license:"MIT", desc:"Indonesian language fluency + code generation, merged via spherical-linear interpolation.", params:"7B", context:"8K", modality:"text", price:0.005, parents:["0xd118","0xe22a"] },
  "0xc4f2": { id:"0xc4f2", name:"Kembang-Sepatu", kind:"compose", parent:"0xf405", owner:"0x22…ee99", inferences:4100, earnings:164, trained:"Composed: 0xf405 + 0x71a8", license:"Apache-2.0", desc:"Retrieval-augmented reasoning. Strong on multi-hop QA.", params:"28B", context:"64K", modality:"text", price:0.013, parents:["0xf405","0x71a8"] },
  "0x6bea": { id:"0x6bea", name:"Anggrek-Multi", kind:"compose", parent:"0x71a8", owner:"0xfa…cc01", inferences:2800, earnings:112, trained:"Composed: 0x71a8 + 0xab90", license:"Apache-2.0", desc:"Reasoning + medical, expert merge.", params:"32B", context:"128K", modality:"text", price:0.014, parents:["0x71a8","0xab90"] },
};

const RECENT = [
  { t:"3s ago", who:"0xab…12", req:"Draft a haiku about parenthood and AI", cost:0.018 },
  { t:"11s ago", who:"0x44…0a", req:"Translate readme.md into bahasa indonesia", cost:0.018 },
  { t:"38s ago", who:"0x91…ee", req:"Summarize this 12-page paper", cost:0.018 },
  { t:"1m ago", who:"0x07…4d", req:"Generate unit tests for src/auth.ts", cost:0.018 },
  { t:"2m ago", who:"0xc2…91", req:"Explain ERC-7857 in 3 sentences", cost:0.018 },
  { t:"3m ago", who:"0xfa…22", req:"Refactor this loop to use map/reduce", cost:0.018 },
];

function fmt(n) {
  if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return String(n);
}

function Sparkline({ data, color = 'var(--primary)' }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 240, h = 60;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.08" />
    </svg>
  );
}

function AgentPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || '0xa3f1';
  const a = AGENT_DB[id] || AGENT_DB['0xa3f1'];
  const [prompt, setPrompt] = useStateA("");
  const [running, setRunning] = useStateA(false);
  const [response, setResponse] = useStateA(null);
  const [selectedTx, setSelectedTx] = useStateA(null);

  // Build descendants list
  const descendants = useMemoA(() => {
    return Object.values(AGENT_DB).filter(x => x.parent === a.id || (x.parents && x.parents.includes(a.id)));
  }, [a.id]);

  const ancestors = useMemoA(() => {
    const list = [];
    let cur = a.parent;
    while (cur && AGENT_DB[cur]) {
      list.unshift(AGENT_DB[cur]);
      cur = AGENT_DB[cur].parent;
    }
    return list;
  }, [a.id]);

  // Sparkline data — last 30 days of inferences (procedural)
  const sparkData = useMemoA(() => {
    const seed = window.Flowers.hashSeed(a.id);
    return Array.from({length: 30}, () => 0.4 + seed() * 0.6);
  }, [a.id]);

  function runInference() {
    if (!prompt.trim()) return;
    setRunning(true);
    setResponse(null);
    setTimeout(() => {
      setResponse({
        text: `▍ This is a simulated response from ${a.name}. In production, your prompt is hashed, signed by your wallet, and routed to a node running this exact model checkpoint. The reply is settled on-chain along with a royalty split to ancestors.`,
        time: 1.2 + Math.random()*0.8,
        cost: a.price,
        node: "0x9f…2c1a (Singapore)",
      });
      setRunning(false);
    }, 1400);
  }

  return (
    <>
      <window.MekarNav active="explorer" />
      <main className="agent-page">
        <div className="container">
          <div className="agent-page__breadcrumb">
            <a href="Explorer.html">← Lineage Garden</a>
            <span>·</span>
            <span>{a.kind === 'genesis' ? 'Genesis' : a.kind === 'fork' ? 'Fork' : 'Composed'}</span>
          </div>

          <header className="agent-page__hero">
            <div className="agent-page__bloom">
              <window.Flowers.Bloom kind={a.kind} seed={a.id} size={220} sw={1.6} style="woodcut" />
            </div>
            <div className="agent-page__title">
              <span className="eyebrow">/{a.kind} bloom</span>
              <h1>{a.name}</h1>
              <code className="agent-page__hash">{a.id}</code>
              <p className="agent-page__desc">{a.desc}</p>
              <div className="agent-page__chips">
                <span className="chip">{a.params} params</span>
                <span className="chip">{a.context} context</span>
                <span className="chip">{a.modality}</span>
                <span className="chip">{a.license}</span>
              </div>
            </div>
            <div className="agent-page__cta">
              <div className="price-card">
                <div className="price-card__label">Per inference</div>
                <div className="price-card__price">${a.price.toFixed(3)}</div>
                <div className="price-card__sub">≈ ${(a.price * 1000).toFixed(0)}/M tokens</div>
              </div>
              <button className="btn btn--primary" onClick={() => document.getElementById('try-section').scrollIntoView({behavior:'smooth'})}>
                Try it →
              </button>
              <a href={`Mint.html?fork=${a.id}`} className="btn btn--ghost">Fork this bloom</a>
            </div>
          </header>

          {/* Lineage strip */}
          <section className="agent-section">
            <div className="agent-section__head">
              <h2>Lineage</h2>
              <p>Ancestors and descendants of this bloom.</p>
            </div>
            <div className="lineage-strip">
              {ancestors.map(p => (
                <a key={p.id} className="lineage-strip__node" href={`Agent.html?id=${p.id}`}>
                  <window.Flowers.Bloom kind={p.kind} seed={p.id} size={70} sw={1.2} style="woodcut" />
                  <span>{p.name}</span>
                  <code>{p.id}</code>
                </a>
              ))}
              {ancestors.length > 0 && <span className="lineage-strip__arrow">→</span>}
              <div className="lineage-strip__node lineage-strip__node--current">
                <window.Flowers.Bloom kind={a.kind} seed={a.id} size={88} sw={1.4} style="woodcut" />
                <span>{a.name}</span>
                <code>this bloom</code>
              </div>
              {descendants.length > 0 && <span className="lineage-strip__arrow">→</span>}
              <div className="lineage-strip__descendants">
                {descendants.map(d => (
                  <a key={d.id} className="lineage-strip__node lineage-strip__node--small" href={`Agent.html?id=${d.id}`}>
                    <window.Flowers.Bloom kind={d.kind} seed={d.id} size={56} sw={1} style="woodcut" />
                    <span>{d.name}</span>
                  </a>
                ))}
                {descendants.length === 0 && <span style={{color:'var(--ink-soft)', fontStyle:'italic', fontFamily:'var(--display)'}}>No descendants yet — this lineage hasn't bloomed further.</span>}
              </div>
            </div>
          </section>

          {/* Stats grid */}
          <section className="agent-stats">
            <div className="agent-stat">
              <div className="agent-stat__num">{fmt(a.inferences)}</div>
              <div className="agent-stat__label">Total inferences</div>
              <div className="agent-stat__spark">
                <Sparkline data={sparkData} color="var(--primary)" />
              </div>
            </div>
            <div className="agent-stat">
              <div className="agent-stat__num">${fmt(a.earnings)}</div>
              <div className="agent-stat__label">Lifetime earnings</div>
              <div className="agent-stat__spark">
                <Sparkline data={sparkData.map(v => v*0.92)} color="var(--gold)" />
              </div>
            </div>
            <div className="agent-stat">
              <div className="agent-stat__num">{descendants.length}</div>
              <div className="agent-stat__label">Direct descendants</div>
              <div className="agent-stat__sub">{ancestors.length} ancestors · royalty depth {ancestors.length}</div>
            </div>
            <div className="agent-stat">
              <div className="agent-stat__num">{a.owner}</div>
              <div className="agent-stat__label">Steward (current owner)</div>
              <div className="agent-stat__sub">Trained on {a.trained}</div>
            </div>
          </section>

          {/* Try it */}
          <section className="agent-section" id="try-section">
            <div className="agent-section__head">
              <h2>Try a single inference</h2>
              <p>Type a prompt. We'll simulate routing it to a node and show the response, settlement cost, and royalty split.</p>
            </div>
            <div className="try-grid">
              <div className="try-input">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={`Ask ${a.name} something…`}
                  rows={5}
                />
                <div className="try-input__bar">
                  <span className="try-input__cost">≈ ${a.price.toFixed(3)}</span>
                  <button className="btn btn--primary" disabled={running || !prompt.trim()} onClick={runInference}>
                    {running ? "Routing…" : "Run inference"}
                  </button>
                </div>
              </div>
              <div className="try-output">
                {!response && !running && (
                  <div className="try-output__empty">
                    <window.Flowers.Bloom kind={a.kind} seed={a.id+'try'} size={70} sw={1.2} style="woodcut" />
                    <p>Response will bloom here.</p>
                  </div>
                )}
                {running && (
                  <div className="try-output__empty">
                    <div className="loading-bloom">
                      <window.Flowers.Bloom kind={a.kind} seed={a.id+'load'} size={70} sw={1.2} style="woodcut" />
                    </div>
                    <p>Hashing prompt · signing · routing to node…</p>
                  </div>
                )}
                {response && (
                  <div className="try-output__filled">
                    <div className="try-output__text">{response.text}</div>
                    <dl className="try-output__meta">
                      <div><dt>Latency</dt><dd>{response.time.toFixed(2)}s</dd></div>
                      <div><dt>Cost</dt><dd>${response.cost.toFixed(3)}</dd></div>
                      <div><dt>Node</dt><dd>{response.node}</dd></div>
                      <div><dt>Royalty split</dt><dd>{ancestors.length+1} ways</dd></div>
                    </dl>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Recent inferences feed */}
          <section className="agent-section">
            <div className="agent-section__head">
              <h2>Recent inferences</h2>
              <p>Live feed from the last few minutes. Prompts are hashed; only their preview is shown.</p>
            </div>
            <table className="agent-table">
              <thead>
                <tr><th>Time</th><th>Caller</th><th>Prompt preview</th><th>Cost</th></tr>
              </thead>
              <tbody>
                {RECENT.map((r,i) => (
                  <tr key={i} className="agent-table__row" onClick={() => setSelectedTx({...r, idx:i, agent:a, ancestors})}>
                    <td><span className="agent-table__time">{r.t}</span></td>
                    <td><code>{r.who}</code></td>
                    <td className="agent-table__req">{r.req}</td>
                    <td>${r.cost.toFixed(3)} <span className="agent-table__chev">→</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

        </div>
      </main>
      <TxModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      <window.MekarFooter />
      <window.MekarTweaksPanel />
    </>
  );
}

// ----- Transaction detail modal -----
function TxModal({ tx, onClose }) {
  if (!tx) return null;
  const { agent, ancestors, who, req, cost, t } = tx;
  // synthesize tx hash, sig, gas
  const seed = window.Flowers.hashSeed(`${agent.id}-${tx.idx}`);
  const txHash = '0x' + Array.from({length:16},() => Math.floor(seed()*16).toString(16)).join('');
  const sig = '0x' + Array.from({length:24},() => Math.floor(seed()*16).toString(16)).join('');
  const gas = (0.0001 + seed()*0.0008).toFixed(5);
  const block = Math.floor(8420000 + seed()*1000);
  // royalty split
  const total = cost;
  const serverShare = total * 0.60;
  const ancestorPool = total * 0.30;
  const dataShare = total * 0.07;
  const protocolShare = total * 0.03;
  // distribute ancestor pool by inverse depth
  const ancestorSplits = ancestors.length
    ? ancestors.map((anc, i) => ({
        ...anc,
        share: ancestorPool * (1 / (i+1)) / ancestors.reduce((s,_,j) => s + 1/(j+1), 0)
      }))
    : [];
  return (
    <div className="tx-modal__backdrop" onClick={onClose}>
      <div className="tx-modal" onClick={e => e.stopPropagation()}>
        <button className="tx-modal__close" onClick={onClose}>×</button>
        <div className="tx-modal__head">
          <span className="eyebrow">/inference · settled {t}</span>
          <h2>Transaction detail</h2>
        </div>
        <div className="tx-modal__body">
          <dl className="tx-meta">
            <div><dt>Tx hash</dt><dd><code>{txHash}</code> <a href="#" className="tx-meta__ext">↗ 0G Explorer</a></dd></div>
            <div><dt>Block</dt><dd><code>#{block.toLocaleString()}</code></dd></div>
            <div><dt>Caller</dt><dd><code>{who}</code></dd></div>
            <div><dt>Agent</dt><dd>{agent.name} <code>{agent.id}</code></dd></div>
            <div><dt>Prompt hash</dt><dd><code>{sig}</code></dd></div>
            <div><dt>Prompt preview</dt><dd className="tx-meta__req">"{req}"</dd></div>
            <div><dt>Gas</dt><dd>${gas}</dd></div>
            <div><dt>Settlement</dt><dd>0G Chain · 1 atomic split</dd></div>
          </dl>
          <div className="tx-split">
            <h3>Royalty cascade · ${total.toFixed(4)}</h3>
            <ul className="tx-split__list">
              <li className="tx-split__row tx-split__row--server">
                <span className="tx-split__bar" style={{width: '60%'}}></span>
                <span className="tx-split__name">{agent.name}<small>serving agent</small></span>
                <span className="tx-split__amt">${serverShare.toFixed(4)} <em>60%</em></span>
              </li>
              {ancestorSplits.map((anc, i) => (
                <li key={anc.id} className="tx-split__row">
                  <span className="tx-split__bar" style={{width: `${(anc.share/total)*100}%`}}></span>
                  <span className="tx-split__name">{anc.name}<small>L{i+1} ancestor</small></span>
                  <span className="tx-split__amt">${anc.share.toFixed(4)} <em>{((anc.share/total)*100).toFixed(1)}%</em></span>
                </li>
              ))}
              <li className="tx-split__row">
                <span className="tx-split__bar" style={{width: '7%'}}></span>
                <span className="tx-split__name">Data contributors<small>training corpus</small></span>
                <span className="tx-split__amt">${dataShare.toFixed(4)} <em>7%</em></span>
              </li>
              <li className="tx-split__row">
                <span className="tx-split__bar" style={{width: '3%'}}></span>
                <span className="tx-split__name">Protocol treasury<small>Mekar</small></span>
                <span className="tx-split__amt">${protocolShare.toFixed(4)} <em>3%</em></span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AgentPage />);
