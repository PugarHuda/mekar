// Trending — leaderboard / market view across the lineage garden.
const { useState: useStateT, useMemo: useMemoT, useEffect: useEffectT } = React;

const BLOOMS = [
  { id:"0xa3f1", name:"Llama-3-70B",      kind:"genesis", inf24:18420, earn24:331.56, earnTotal:48221, growth:+12.4, forks:5, age:"284d" },
  { id:"0xc940", name:"Qwen-2.5-32B",     kind:"genesis", inf24:14210, earn24:198.94, earnTotal:29108, growth:+22.1, forks:2, age:"118d" },
  { id:"0xb27c", name:"Mistral-Small-24B",kind:"genesis", inf24:6820,  earn24:75.02,  earnTotal:12401, growth:-3.1,  forks:1, age:"94d" },
  { id:"0xe22a", name:"Frangipani-Coder", kind:"fork",    inf24:4810,  earn24:28.86,  earnTotal:5944,  growth:+44.0, forks:0, age:"61d" },
  { id:"0xd118", name:"Jasmine-Indo-7B",  kind:"fork",    inf24:1240,  earn24:4.96,   earnTotal:3012,  growth:+8.2,  forks:1, age:"52d" },
  { id:"0x71a8", name:"Lotus-Reasoner",   kind:"fork",    inf24:980,   earn24:14.70,  earnTotal:2401,  growth:+18.4, forks:1, age:"41d" },
  { id:"0xf405", name:"Mawar-RAG",        kind:"fork",    inf24:340,   earn24:4.08,   earnTotal:812,   growth:+2.1,  forks:0, age:"38d" },
  { id:"0xab90", name:"Kenanga-Med",      kind:"fork",    inf24:280,   earn24:3.92,   earnTotal:740,   growth:-5.0,  forks:0, age:"22d" },
  { id:"0x9d3f", name:"Marigold-Compose", kind:"compose", inf24:144,   earn24:0.72,   earnTotal:388,   growth:+88.4, forks:0, age:"14d" },
  { id:"0xc4f2", name:"Kembang-Sepatu",   kind:"compose", inf24:62,    earn24:0.81,   earnTotal:164,   growth:+34.0, forks:0, age:"9d" },
  { id:"0x6bea", name:"Anggrek-Multi",    kind:"compose", inf24:48,    earn24:0.67,   earnTotal:112,   growth:+19.0, forks:0, age:"6d" },
];

function fmt(n) {
  if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return Math.round(n).toLocaleString();
}
function usd(n) { return "$" + n.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); }

function MiniBars({ data, color }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{display:'flex', gap:2, alignItems:'flex-end', height:24}}>
      {data.map((v,i) => (
        <div key={i} style={{
          width:3, height: `${(v/max)*100}%`,
          background: color, opacity: 0.3 + (i/data.length)*0.7, borderRadius:1
        }} />
      ))}
    </div>
  );
}

function TrendingPage() {
  const [view, setView] = useStateT("earnings"); // earnings, growth, forks, fresh
  const [filter, setFilter] = useStateT("all");

  const sorted = useMemoT(() => {
    let list = BLOOMS.slice();
    if (filter !== "all") list = list.filter(b => b.kind === filter);
    if (view === "earnings") list.sort((a,b) => b.earn24 - a.earn24);
    if (view === "growth")   list.sort((a,b) => b.growth - a.growth);
    if (view === "forks")    list.sort((a,b) => b.forks - a.forks);
    if (view === "fresh")    list.sort((a,b) => parseInt(a.age) - parseInt(b.age));
    return list;
  }, [view, filter]);

  // Top 3 podium
  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // Pre-built sparkline data per bloom
  const sparks = useMemoT(() => {
    const out = {};
    BLOOMS.forEach(b => {
      const r = window.Flowers.hashSeed(b.id + view);
      out[b.id] = Array.from({length:14}, () => 0.3 + r() * 0.7);
    });
    return out;
  }, [view]);

  return (
    <>
      <window.MekarNav active="trending" />
      <main className="trending-page">
        <div className="container">
          <header className="trending-page__head">
            <div>
              <span className="eyebrow">/trending</span>
              <h1>The bloom market</h1>
              <p>Which blooms are paying their stewards best, growing fastest, and pollinating the wildest forks. Refreshed every block.</p>
            </div>
            <div className="trending-page__stats">
              <div><strong>$1,847</strong><span>24h volume</span></div>
              <div><strong>2.04M</strong><span>inferences</span></div>
              <div><strong>+18%</strong><span>vs yesterday</span></div>
            </div>
          </header>

          {/* View tabs */}
          <div className="trending-views">
            {[
              { k:"earnings", l:"Top earners", sub:"24h" },
              { k:"growth",   l:"Fastest growing", sub:"% Δ" },
              { k:"forks",    l:"Most forked", sub:"descendants" },
              { k:"fresh",    l:"Freshly bloomed", sub:"new" },
            ].map(v => (
              <button key={v.k} className={`trending-view ${view === v.k ? 'active' : ''}`} onClick={() => setView(v.k)}>
                <strong>{v.l}</strong>
                <span>{v.sub}</span>
              </button>
            ))}
          </div>

          {/* Filter */}
          <div className="trending-filter">
            <span>Show:</span>
            {[
              { k:"all", l:"All blooms" },
              { k:"genesis", l:"Genesis only" },
              { k:"fork", l:"Forks only" },
              { k:"compose", l:"Composed only" },
            ].map(f => (
              <button key={f.k} className={`pill ${filter === f.k ? 'active' : ''}`} onClick={() => setFilter(f.k)}>{f.l}</button>
            ))}
          </div>

          {/* Podium */}
          {podium.length === 3 && (
            <section className="trending-podium">
              <a className="trending-podium__pos trending-podium__pos--2" href={`Agent.html?id=${podium[1].id}`}>
                <span className="trending-podium__rank">2</span>
                <window.Flowers.Bloom kind={podium[1].kind} seed={podium[1].id} size={120} sw={1.4} style="woodcut" />
                <h3>{podium[1].name}</h3>
                <code>{podium[1].id}</code>
                <div className="trending-podium__metric">
                  {view === "earnings" && usd(podium[1].earn24)}
                  {view === "growth" && (podium[1].growth > 0 ? '+' : '') + podium[1].growth + '%'}
                  {view === "forks" && podium[1].forks + ' descendants'}
                  {view === "fresh" && podium[1].age + ' old'}
                </div>
              </a>
              <a className="trending-podium__pos trending-podium__pos--1" href={`Agent.html?id=${podium[0].id}`}>
                <span className="trending-podium__crown">★</span>
                <span className="trending-podium__rank">1</span>
                <window.Flowers.Bloom kind={podium[0].kind} seed={podium[0].id} size={170} sw={1.6} style="woodcut" />
                <h3>{podium[0].name}</h3>
                <code>{podium[0].id}</code>
                <div className="trending-podium__metric trending-podium__metric--big">
                  {view === "earnings" && usd(podium[0].earn24)}
                  {view === "growth" && (podium[0].growth > 0 ? '+' : '') + podium[0].growth + '%'}
                  {view === "forks" && podium[0].forks + ' descendants'}
                  {view === "fresh" && podium[0].age + ' old'}
                </div>
              </a>
              <a className="trending-podium__pos trending-podium__pos--3" href={`Agent.html?id=${podium[2].id}`}>
                <span className="trending-podium__rank">3</span>
                <window.Flowers.Bloom kind={podium[2].kind} seed={podium[2].id} size={100} sw={1.3} style="woodcut" />
                <h3>{podium[2].name}</h3>
                <code>{podium[2].id}</code>
                <div className="trending-podium__metric">
                  {view === "earnings" && usd(podium[2].earn24)}
                  {view === "growth" && (podium[2].growth > 0 ? '+' : '') + podium[2].growth + '%'}
                  {view === "forks" && podium[2].forks + ' descendants'}
                  {view === "fresh" && podium[2].age + ' old'}
                </div>
              </a>
            </section>
          )}

          {/* Full table */}
          <section className="trending-section">
            <div className="trending-section__head">
              <h2>Full leaderboard</h2>
              <p>{sorted.length} blooms · sorted by {view}</p>
            </div>
            <div className="trending-table">
              <div className="trending-table__head">
                <span>#</span>
                <span>Bloom</span>
                <span>24h inferences</span>
                <span>24h earnings</span>
                <span>Growth</span>
                <span>Forks</span>
                <span>Trend</span>
              </div>
              {sorted.map((b, i) => (
                <a key={b.id} className="trending-table__row" href={`Agent.html?id=${b.id}`}>
                  <span className="trending-table__rank">{i+1}</span>
                  <span className="trending-table__bloom">
                    <window.Flowers.Bloom kind={b.kind} seed={b.id} size={48} sw={1.1} style="woodcut" />
                    <span>
                      <strong>{b.name}</strong>
                      <code>{b.id} · {b.kind}</code>
                    </span>
                  </span>
                  <span>{fmt(b.inf24)}</span>
                  <span>{usd(b.earn24)}</span>
                  <span className={b.growth >= 0 ? "trending-up" : "trending-down"}>
                    {b.growth >= 0 ? '↗' : '↘'} {b.growth >= 0 ? '+' : ''}{b.growth}%
                  </span>
                  <span>{b.forks}</span>
                  <span>
                    <MiniBars data={sparks[b.id]} color={b.growth >= 0 ? 'var(--forest)' : 'var(--coral)'} />
                  </span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
      <window.MekarFooter />
      <window.MekarTweaksPanel />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<TrendingPage />);
