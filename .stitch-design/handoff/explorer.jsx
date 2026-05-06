// Explorer page — full lineage garden.
const { useState: useS, useEffect: useE, useMemo: useM } = React;

const AGENTS = [
  { id: "0xa3f1", name: "Llama-3-70B", kind: "genesis", parent: null, x: 14, y: 14, owner: "0x6b…3a4f", inferences: "1.2M", earnings: "48,221", trained: "Meta · 2024", license: "Llama Community", desc: "Foundational LLM — root of many forks." },
  { id: "0xb27c", name: "Mistral-Small-24B", kind: "genesis", parent: null, x: 50, y: 12, owner: "0xa1…b8c2", inferences: "284K", earnings: "12,401", trained: "Mistral · 2024", license: "Apache-2.0", desc: "Compact instruction-tuned base model." },
  { id: "0xc940", name: "Qwen-2.5-32B", kind: "genesis", parent: null, x: 84, y: 16, owner: "0x44…91dd", inferences: "740K", earnings: "29,108", trained: "Alibaba · 2024", license: "Qwen License", desc: "Multilingual base, strong on East-Asian corpora." },
  { id: "0xd118", name: "Jasmine-Indo-7B", kind: "fork", parent: "0xa3f1", x: 8, y: 44, owner: "0x88…2e0c", inferences: "84K", earnings: "3,012", trained: "Indo Corpus v3", license: "MIT", desc: "Indonesian-language fine-tune." },
  { id: "0xe22a", name: "Frangipani-Coder", kind: "fork", parent: "0xa3f1", x: 22, y: 50, owner: "0xc1…7710", inferences: "152K", earnings: "5,944", trained: "GitHub Permissive", license: "MIT", desc: "Code-completion specialist." },
  { id: "0xf405", name: "Mawar-RAG", kind: "fork", parent: "0xb27c", x: 44, y: 46, owner: "0x09…44a1", inferences: "21K", earnings: "812", trained: "Wikipedia ID", license: "CC-BY", desc: "Retrieval-augmented question answering." },
  { id: "0x71a8", name: "Lotus-Reasoner", kind: "fork", parent: "0xc940", x: 74, y: 46, owner: "0xee…3322", inferences: "62K", earnings: "2,401", trained: "Math Stack", license: "Apache-2.0", desc: "Chain-of-thought reasoning fine-tune." },
  { id: "0xab90", name: "Kenanga-Med", kind: "fork", parent: "0xc940", x: 92, y: 50, owner: "0x33…aa11", inferences: "18K", earnings: "740", trained: "PubMed Open", license: "CC-BY", desc: "Medical literature fine-tune." },
  { id: "0x9d3f", name: "Marigold-Compose", kind: "compose", parent: "0xd118", x: 18, y: 78, owner: "0x55…d091", inferences: "9.4K", earnings: "388", trained: "Composed: 0xd118 + 0xe22a", license: "MIT", desc: "Indo + code, merged via slerp." },
  { id: "0xc4f2", name: "Kembang-Sepatu", kind: "compose", parent: "0xf405", x: 52, y: 78, owner: "0x22…ee99", inferences: "4.1K", earnings: "164", trained: "Composed: 0xf405 + 0x71a8", license: "Apache-2.0", desc: "RAG + reasoning." },
  { id: "0x6bea", name: "Anggrek-Multi", kind: "compose", parent: "0x71a8", x: 82, y: 80, owner: "0xfa…cc01", inferences: "2.8K", earnings: "112", trained: "Composed: 0x71a8 + 0xab90", license: "Apache-2.0", desc: "Reasoning + medical, expert merge." },
];

function ExplorerPage() {
  const [search, setSearch] = useS("");
  const [filter, setFilter] = useS("All");
  const [selected, setSelected] = useS(null);
  const [zoom, setZoom] = useS(1);
  const filters = ["All", "Genesis", "Forks", "Composed"];

  const visible = AGENTS.filter(a => {
    if (filter === "Genesis" && a.kind !== "genesis") return false;
    if (filter === "Forks" && a.kind !== "fork") return false;
    if (filter === "Composed" && a.kind !== "compose") return false;
    if (!search) return true;
    return (a.id + a.name + (a.owner||'')).toLowerCase().includes(search.toLowerCase());
  });
  const visibleSet = new Set(visible.map(a => a.id));
  const connectors = AGENTS.flatMap(a => {
    if (!a.parent) return [];
    if (!visibleSet.has(a.id) || !visibleSet.has(a.parent)) return [];
    const p = AGENTS.find(x => x.id === a.parent);
    if (!p) return [];
    return [{ id: a.id, from: { x: p.x, y: p.y + 6 }, to: { x: a.x, y: a.y - 6 } }];
  });

  return (
    <>
      <window.MekarNav active="explorer" />
      <main className="explorer-page">
        <div className="container">
          <header className="explorer-page__head">
            <div>
              <span className="eyebrow">/explorer</span>
              <h1>The Lineage Garden</h1>
              <p>{AGENTS.length} agents bloomed · {AGENTS.filter(a=>a.kind==='genesis').length} genesis lineages · 11.4M inferences settled</p>
            </div>
            <div className="explorer-page__legend">
              <span><i style={{background:'#d4a437'}}></i> Genesis</span>
              <span><i style={{background:'#f5b7a0'}}></i> Fork</span>
              <span><i style={{background:'#c25a4a'}}></i> Composed</span>
            </div>
          </header>

          <div className="explorer-frame explorer-frame--full">
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
                  <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
              <div className="explorer-zoom">
                <button onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}>−</button>
                <span>{Math.round(zoom*100)}%</span>
                <button onClick={() => setZoom(z => Math.min(1.6, z + 0.15))}>+</button>
              </div>
            </div>
            <div className="explorer-canvas explorer-canvas--full" style={{transform:`scale(${zoom})`, transformOrigin:'top left'}}>
              <svg className="connectors" preserveAspectRatio="none" viewBox="0 0 100 100">
                {connectors.map(c => {
                  const x1 = c.from.x, y1 = c.from.y, x2 = c.to.x, y2 = c.to.y;
                  const mx = (x1 + x2) / 2;
                  const cy = (y1 + y2) / 2;
                  return (
                    <g key={c.id}>
                      <path d={`M ${x1} ${y1} Q ${mx} ${cy + 4}, ${x2} ${y2}`}
                        fill="none" stroke="#3d2817" strokeWidth="0.32" opacity="0.7"
                        vectorEffect="non-scaling-stroke" />
                      <ellipse cx={mx} cy={cy + 2} rx="1.2" ry="0.6" fill="#6b8a4b"
                        stroke="#3d2817" strokeWidth="0.15" opacity="0.85"
                        vectorEffect="non-scaling-stroke" />
                    </g>
                  );
                })}
              </svg>
              {visible.map(a => (
                <button key={a.id} className={`tree-node ${selected?.id === a.id ? 'selected' : ''}`}
                  style={{ left: `${a.x}%`, top: `${a.y}%`, background: 'transparent', border: 'none', padding: 0 }}
                  onClick={() => setSelected(a)}>
                  <window.Flowers.Bloom kind={a.kind} seed={a.id}
                    size={a.kind === 'genesis' ? 110 : (a.kind === 'compose' ? 92 : 72)} sw={1.1} style="woodcut" />
                  <span className="tree-node__label">
                    {a.name}
                    <span className="tree-node__hash">{a.id}</span>
                  </span>
                </button>
              ))}
              {visible.length === 0 && (
                <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-soft)', fontStyle:'italic', fontFamily:'var(--display)', fontSize:24}}>
                  No blooms in this filter. Try another petal.
                </div>
              )}
            </div>
          </div>

          {/* Selected agent panel */}
          {selected && (
            <aside className="explorer-detail">
              <button className="explorer-detail__close" onClick={() => setSelected(null)}>×</button>
              <div className="explorer-detail__hero">
                <window.Flowers.Bloom kind={selected.kind} seed={selected.id} size={140} sw={1.4} style="woodcut" />
              </div>
              <span className="eyebrow">{selected.kind === 'genesis' ? 'Genesis bloom' : selected.kind === 'fork' ? 'Fork' : 'Composed'}</span>
              <h2>{selected.name}</h2>
              <code className="explorer-detail__hash">{selected.id}</code>
              <p>{selected.desc}</p>
              <dl className="explorer-detail__stats">
                <div><dt>Owner</dt><dd>{selected.owner}</dd></div>
                <div><dt>Inferences</dt><dd>{selected.inferences}</dd></div>
                <div><dt>Earnings (USD)</dt><dd>${selected.earnings}</dd></div>
                <div><dt>Trained on</dt><dd>{selected.trained}</dd></div>
                <div><dt>License</dt><dd>{selected.license}</dd></div>
              </dl>
              <a className="btn" href={`Agent.html?id=${selected.id}`}>Open agent →</a>
            </aside>
          )}
        </div>
      </main>
      <window.MekarFooter />
      <window.MekarTweaksPanel />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ExplorerPage />);
